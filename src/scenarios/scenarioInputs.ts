/**
 * Workspace scenario inputs and the bridge to the physics core.
 *
 * This module owns the *inputs* a user may edit. It never computes physics: it
 * builds a SimulationConfig for the existing engine (`runSimulation`) and
 * reports validation issues from the engine's own validator.
 *
 * Prograde convention: the initial state reuses `createCircularOrbitState`
 * (position on +x, velocity on +y in the Earth-centered inertial frame from
 * src/simulation/units.ts) and scales that velocity magnitude to the requested
 * speed. No axis or frame logic is re-implemented here.
 *
 * Provenance: the default path is a synthetic educational idealization built
 * from the recorded Earth constants. A caller may instead attach a validated
 * cached reference preset; that path uses the provider state exactly and is
 * labelled as a hypothetical propagation, not an ephemeris.
 */

import type { ReferencePreset } from '../data/types';
import {
  EARTH_CENTRAL_BODY,
  EARTH_MEAN_RADIUS_KM,
  EARTH_MU_KM3_S2,
  circularOrbitalPeriodSeconds,
  createCircularOrbitState,
  magnitude,
  scale,
  validateSimulationConfig,
  type SimulationConfig,
  type ValidationIssue,
} from '../simulation';

export type ScenarioInputs = {
  /** Altitude above the central body's mean radius, km. */
  altitudeKm: number;
  /** Initial tangential speed, km/s. */
  speedKmPerS: number;
  /** Number of reference circular orbits to integrate. */
  orbitCount: number;
  /** Integration timestep, seconds. Fixed for this milestone. */
  timestepSeconds: number;
  /**
   * When present, the engine receives this exact cached reference state rather
   * than a circular state reconstructed from altitude/speed. The altitude and
   * speed fields remain the derived display values used if the user converts
   * the reference to a circular approximation.
   */
  reference?: ReferencePreset;
  /**
   * Present after the user converts a reference-derived draft to a circular
   * approximation. This retains the source preset (including its original
   * vector and provenance) for disclosure, but it is not propagated; the
   * circular state built from altitude/speed is used instead.
   */
  derivedFrom?: ReferencePreset;
};

/**
 * Editable input limits. These keep the run inside the engine's supported
 * numeric range and inside a step count that stays responsive in a browser.
 */
export const INPUT_LIMITS = {
  /**
   * Includes geostationary reference states (about 35,786 km). The engine's
   * numeric range is much wider; this is the editable UI range.
   */
  altitudeKm: { min: 200, max: 50_000 },
  speedKmPerS: { min: 0.5, max: 15 },
  orbitCount: { min: 0.5, max: 6 },
  timestepSeconds: { min: 1, max: 60 },
} as const;

/** Orbit-count choices offered by the inspector. */
export const ORBIT_COUNT_OPTIONS = [0.5, 1, 2, 3, 5, 6] as const;

export const DEFAULT_TIMESTEP_SECONDS = 10;

const DEFAULT_RADIUS_KM = EARTH_MEAN_RADIUS_KM + 400;

export const DEFAULT_SCENARIO_INPUTS: ScenarioInputs = {
  altitudeKm: 400,
  speedKmPerS: Math.sqrt(EARTH_MU_KM3_S2 / DEFAULT_RADIUS_KM),
  orbitCount: 3,
  timestepSeconds: DEFAULT_TIMESTEP_SECONDS,
};

export type ScenarioReference = {
  radiusKm: number;
  circularSpeedKmPerS: number;
  periodSeconds: number;
  /** Requested speed as a multiple of the local circular speed (1 = circular). */
  speedRatio: number;
  durationSeconds: number;
  timestepSeconds: number;
  sampleIntervalSeconds: number;
  /** Upper bound on recorded samples; the engine may stop earlier. */
  estimatedSampleCount: number;
};

/** Values a user can compare against, all derived from the engine's utilities. */
export function scenarioReference(inputs: ScenarioInputs): ScenarioReference {
  const referenceState = inputs.reference?.state;
  const radiusKm = referenceState
    ? magnitude(referenceState.positionKm)
    : EARTH_MEAN_RADIUS_KM + inputs.altitudeKm;
  const circularSpeedKmPerS = magnitude(
    createCircularOrbitState(radiusKm, EARTH_MU_KM3_S2).velocityKmPerS,
  );
  const speedKmPerS = referenceState
    ? magnitude(referenceState.velocityKmPerS)
    : inputs.speedKmPerS;
  const timestepSeconds = inputs.timestepSeconds;
  const periodSeconds = circularOrbitalPeriodSeconds(radiusKm, EARTH_MU_KM3_S2);
  const durationSeconds = durationFor(inputs.orbitCount, periodSeconds, timestepSeconds);

  return {
    radiusKm,
    circularSpeedKmPerS,
    periodSeconds,
    speedRatio: circularSpeedKmPerS > 0 ? speedKmPerS / circularSpeedKmPerS : Number.NaN,
    durationSeconds,
    timestepSeconds,
    sampleIntervalSeconds: timestepSeconds,
    estimatedSampleCount: Math.round(durationSeconds / timestepSeconds) + 1,
  };
}

/**
 * Requested duration rounded up to a whole number of timesteps, because the
 * engine rejects partial final steps rather than silently truncating them.
 */
function durationFor(
  orbitCount: number,
  periodSeconds: number,
  timestepSeconds: number,
): number {
  const raw = orbitCount * periodSeconds;
  const steps = Math.max(Math.round(raw / timestepSeconds), 1);
  return steps * timestepSeconds;
}

/** Builds the configuration passed to the engine. Pure and deterministic. */
export function buildScenarioConfig(inputs: ScenarioInputs): SimulationConfig {
  const reference = inputs.reference;
  const derivedFrom = inputs.derivedFrom;
  const referenceState = reference?.state;
  const referenceValues = scenarioReference(inputs);
  const base = createCircularOrbitState(referenceValues.radiusKm, EARTH_MU_KM3_S2);
  const factor = inputs.speedKmPerS / referenceValues.circularSpeedKmPerS;

  const initialState = referenceState
    ? {
        positionKm: { ...referenceState.positionKm },
        velocityKmPerS: { ...referenceState.velocityKmPerS },
      }
    : {
        positionKm: { ...base.positionKm },
        velocityKmPerS: scale(base.velocityKmPerS, factor),
      };

  return {
    label: reference
      ? `${reference.label} — exact cached state, simplified two-body propagation (hypothetical)`
      : derivedFrom
        ? `${derivedFrom.label} — circular approximation from cached state, simplified two-body propagation (hypothetical)`
        : `Synthetic test particle — ${inputs.altitudeKm} km altitude, ` +
          `${inputs.speedKmPerS.toFixed(2)} km/s (${referenceValues.speedRatio.toFixed(2)}x circular)`,
    centralBody: EARTH_CENTRAL_BODY,
    initialState,
    timestepSeconds: inputs.timestepSeconds,
    durationSeconds: referenceValues.durationSeconds,
    sampleIntervalSeconds: referenceValues.sampleIntervalSeconds,
    // Stop radius: a sphere of the central body's mean radius. The model has no
    // terrain, atmosphere, or shape, so this is a documented approximation.
    impactRadiusKm: EARTH_MEAN_RADIUS_KM,
  };
}

function rangeIssue(
  field: string,
  value: number,
  unit: string,
  min: number,
  max: number,
): ValidationIssue | null {
  if (!Number.isFinite(value)) {
    return { field, message: `${field} must be a finite number (received ${String(value)}).` };
  }
  if (value < min || value > max) {
    return {
      field,
      message: `${field} must be between ${min} and ${max} ${unit} (received ${value}).`,
    };
  }
  return null;
}

/**
 * Validates the editable inputs, then re-validates the resulting configuration
 * with the engine's own validator so no engine rule is duplicated or bypassed.
 */
export function validateScenarioInputs(inputs: ScenarioInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const reference = inputs.reference;

  const checks: Array<ValidationIssue | null> = [
    // A reference preset is validated through its exact state below. The
    // altitude/speed fields are derived display values and may legitimately be
    // outside the circular-scenario range (for example, geostationary).
    ...(reference
      ? []
      : [
          rangeIssue(
            'Altitude',
            inputs.altitudeKm,
            'km',
            INPUT_LIMITS.altitudeKm.min,
            INPUT_LIMITS.altitudeKm.max,
          ),
          rangeIssue(
            'Initial speed',
            inputs.speedKmPerS,
            'km/s',
            INPUT_LIMITS.speedKmPerS.min,
            INPUT_LIMITS.speedKmPerS.max,
          ),
        ]),
    rangeIssue(
      'Revolutions',
      inputs.orbitCount,
      '',
      INPUT_LIMITS.orbitCount.min,
      INPUT_LIMITS.orbitCount.max,
    ),
    rangeIssue(
      'Timestep',
      inputs.timestepSeconds,
      's',
      INPUT_LIMITS.timestepSeconds.min,
      INPUT_LIMITS.timestepSeconds.max,
    ),
  ];
  for (const issue of checks) {
    if (issue) {
      issues.push(issue);
    }
  }

  if (issues.length === 0) {
    issues.push(...validateSimulationConfig(buildScenarioConfig(inputs)));
  }

  return issues;
}

/** Convenience: true when the inputs are inside the editable limits and valid. */
export function scenarioInputsAreValid(inputs: ScenarioInputs): boolean {
  return validateScenarioInputs(inputs).length === 0;
}

/**
 * Builds editable scenario inputs from a validated cached reference state.
 * The exact vector is retained; altitude and speed are derived display values
 * that become the circular-approximation parameters if the user edits them.
 */
export function inputsFromReferencePreset(
  preset: ReferencePreset,
  settings: Pick<ScenarioInputs, 'orbitCount' | 'timestepSeconds'>,
): ScenarioInputs {
  const radiusKm = magnitude(preset.state.positionKm);
  const speedKmPerS = magnitude(preset.state.velocityKmPerS);
  return {
    altitudeKm: radiusKm - EARTH_MEAN_RADIUS_KM,
    speedKmPerS,
    orbitCount: settings.orbitCount,
    timestepSeconds: settings.timestepSeconds,
    reference: {
      ...preset,
      state: {
        positionKm: { ...preset.state.positionKm },
        velocityKmPerS: { ...preset.state.velocityKmPerS },
      },
    },
  };
}

/**
 * One-line description of a parameter set, used to label which run a record
 * belongs to. Plain text only: no simulation values are inferred here.
 */
export function describeScenarioInputs(inputs: ScenarioInputs): string {
  if (inputs.reference) {
    return (
      `${inputs.reference.label} · ${inputs.orbitCount}x reference period · ` +
      `${inputs.timestepSeconds} s step`
    );
  }
  if (inputs.derivedFrom) {
    return (
      `${inputs.derivedFrom.label} · circular approximation · ${inputs.orbitCount}x reference period · ` +
      `${inputs.timestepSeconds} s step`
    );
  }
  return (
    `${inputs.altitudeKm} km altitude · ${inputs.speedKmPerS.toFixed(4)} km/s · ` +
    `${inputs.orbitCount}x reference period · ${inputs.timestepSeconds} s step`
  );
}
