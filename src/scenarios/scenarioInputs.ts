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
 * Provenance: this is a synthetic educational idealization built from the
 * recorded Earth constants. It is NOT a NASA/JPL state vector and does not
 * represent a real spacecraft.
 */

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
};

/**
 * Editable input limits. These keep the run inside the engine's supported
 * numeric range and inside a step count that stays responsive in a browser.
 */
export const INPUT_LIMITS = {
  altitudeKm: { min: 200, max: 20_000 },
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
  const radiusKm = EARTH_MEAN_RADIUS_KM + inputs.altitudeKm;
  const circularSpeedKmPerS = magnitude(
    createCircularOrbitState(radiusKm, EARTH_MU_KM3_S2).velocityKmPerS,
  );
  const timestepSeconds = inputs.timestepSeconds;
  const periodSeconds = circularOrbitalPeriodSeconds(radiusKm, EARTH_MU_KM3_S2);
  const durationSeconds = durationFor(inputs.orbitCount, periodSeconds, timestepSeconds);

  return {
    radiusKm,
    circularSpeedKmPerS,
    periodSeconds,
    speedRatio: circularSpeedKmPerS > 0 ? inputs.speedKmPerS / circularSpeedKmPerS : Number.NaN,
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
  const reference = scenarioReference(inputs);
  const base = createCircularOrbitState(reference.radiusKm, EARTH_MU_KM3_S2);
  const factor = inputs.speedKmPerS / reference.circularSpeedKmPerS;

  return {
    label:
      `Synthetic test particle — ${inputs.altitudeKm} km altitude, ` +
      `${inputs.speedKmPerS.toFixed(2)} km/s (${reference.speedRatio.toFixed(2)}x circular)`,
    centralBody: EARTH_CENTRAL_BODY,
    initialState: {
      positionKm: base.positionKm,
      velocityKmPerS: scale(base.velocityKmPerS, factor),
    },
    timestepSeconds: inputs.timestepSeconds,
    durationSeconds: reference.durationSeconds,
    sampleIntervalSeconds: reference.sampleIntervalSeconds,
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

  const checks: Array<ValidationIssue | null> = [
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
 * One-line description of a parameter set, used to label which run a record
 * belongs to. Plain text only: no simulation values are inferred here.
 */
export function describeScenarioInputs(inputs: ScenarioInputs): string {
  return (
    `${inputs.altitudeKm} km altitude · ${inputs.speedKmPerS.toFixed(4)} km/s · ` +
    `${inputs.orbitCount}x reference period · ${inputs.timestepSeconds} s step`
  );
}
