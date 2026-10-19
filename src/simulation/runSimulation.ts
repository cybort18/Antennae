/**
 * Bounded, deterministic simulation runner.
 *
 * Contract:
 * - Validates the configuration first and throws SimulationInputError with
 *   specific issues when the input is invalid or unsafe.
 * - Integrates the declared central-body two-body model with the fixed-step
 *   leapfrog integrator (see integrators.ts) and records sampled states.
 * - Returns status and warnings; it never silently returns output for a run
 *   that became non-finite or that entered a region where the model is not
 *   meaningful.
 * - Is a pure function of its input: no randomness, no clock, no I/O. Output
 *   must be byte-for-byte identical for identical input, which is verified by
 *   the determinism test.
 *
 * Timestamps are deliberately NOT part of the result: anything time-of-day
 * related belongs to the persistence/UI layer and would break reproducibility
 * comparisons of two identical runs.
 */

import { EARTH_CENTERED_INERTIAL_FRAME, INTERNAL_UNIT_SYSTEM } from './units';
import { circularOrbitalPeriodSeconds, specificOrbitalEnergyKm2PerS2 } from './derivedMetrics';
import { centralBodyAcceleration } from './forceModel';
import { leapfrogKickDriftKickStep } from './integrators';
import {
  assertValidSimulationConfig,
  MIN_SUPPORTED_RADIUS_KM,
} from './validation';
import { isFiniteVec3, magnitude } from './vector3';
import type {
  SimulationConfig,
  SimulationResult,
  SimulationSample,
  SimulationWarning,
  SimulationWarningCode,
} from './types';

const INTEGRATOR_ID = 'leapfrog-kick-drift-kick' as const;

/**
 * Heuristic threshold for the coarse-timestep advisory: flag the run when the
 * step is larger than 1/50 of the initial local orbital period. This is a
 * rule-of-thumb quality signal, not a rigorous error bound.
 */
const COARSE_TIMESTEP_PERIOD_FRACTION = 1 / 50;

/**
 * Relative specific-orbital-energy deviation at which the run is stopped as
 * numerically unstable.
 *
 * Justification: for a fixed central point-mass force with no thrust or
 * perturbations, the specific orbital energy is exactly conserved by the
 * continuous dynamics, so any deviation is purely numerical. A 10% deviation
 * means the fixed-step result no longer represents the modeled system in any
 * useful sense. This check is only valid for this conservative model and must
 * be re-designed if thrust or time-dependent forces are added.
 */
const ENERGY_DEVIATION_UNSTABLE_THRESHOLD = 0.1;

export function runSimulation(config: SimulationConfig): SimulationResult {
  assertValidSimulationConfig(config);

  const mu = config.centralBody.gravitationalParameterKm3PerS2;
  const timestepSeconds = config.timestepSeconds;
  const durationSeconds = config.durationSeconds;
  const sampleIntervalSeconds = config.sampleIntervalSeconds ?? timestepSeconds;
  const impactRadiusKm = config.impactRadiusKm;
  // Note: maxSteps is enforced by validateSimulationConfig before integration,
  // so the loop below cannot exceed it.

  const totalSteps = Math.round(durationSeconds / timestepSeconds);
  const sampleEverySteps = Math.round(sampleIntervalSeconds / timestepSeconds);

  let state = config.initialState;
  let acceleration = centralBodyAcceleration(state.positionKm, mu);
  let accelerationEvaluations = 1;

  const initialEnergy = specificOrbitalEnergyKm2PerS2(state, mu);
  const energyScale = Math.abs(initialEnergy);
  let maxRelativeEnergyDeviation = 0;

  const samples: SimulationSample[] = [{ timeSeconds: 0, state }];
  const warnings: SimulationWarning[] = [];
  let status: SimulationResult['status'] = 'completed';
  let stopReason: SimulationWarningCode | undefined;
  let completedDurationSeconds = 0;
  let steps = 0;

  // Advisory quality signal based on the initial orbit. Emitted before the run
  // so that a coarse (visibly inaccurate) result is never presented without a
  // caveat; it deliberately does not stop the run.
  const initialRadiusKm = magnitude(state.positionKm);
  const localPeriodSeconds = circularOrbitalPeriodSeconds(initialRadiusKm, mu);
  if (timestepSeconds > localPeriodSeconds * COARSE_TIMESTEP_PERIOD_FRACTION) {
    warnings.push({
      code: 'COARSE_TIMESTEP_ADVISORY',
      message:
        `The timestep (${timestepSeconds} s) is larger than 1/50 of the initial local orbital period ` +
        `(${localPeriodSeconds.toFixed(1)} s). Fixed-step results may be visibly inaccurate; this is a ` +
        `heuristic advisory, not an error bound.`,
      timeSeconds: 0,
    });
  }

  const stop = (code: SimulationWarningCode, message: string, timeSeconds: number): void => {
    warnings.push({ code, message, timeSeconds });
    status = 'stopped';
    stopReason = code;
  };

  /**
   * Records the state at which a numerically unstable run stopped, unless that
   * time is already sampled. The state is finite and geometrically valid, but
   * the run is flagged as stopped, so callers must not present it as a good
   * result. States that violate a geometric limit (impact radius, numeric
   * floor) are deliberately NOT recorded; the warning reports the detected
   * crossing instead.
   */
  const recordStoppingSample = (timeSeconds: number, stoppingState: typeof state): void => {
    const last = samples[samples.length - 1];
    if (!last || last.timeSeconds !== timeSeconds) {
      samples.push({ timeSeconds, state: stoppingState });
    }
  };

  for (let step = 1; step <= totalSteps; step += 1) {
    const timeSeconds = step * timestepSeconds;
    const advanced = leapfrogKickDriftKickStep(
      state,
      timestepSeconds,
      acceleration,
      (positionKm) => centralBodyAcceleration(positionKm, mu),
    );
    accelerationEvaluations += 1;
    state = advanced.state;
    acceleration = advanced.accelerationAtEnd;
    steps = step;
    completedDurationSeconds = timeSeconds;

    // A non-finite value means the run is no longer trustworthy. Stop instead
    // of continuing to emit numbers that look like results. The invalid state
    // is deliberately not recorded as a sample.
    if (
      !isFiniteVec3(state.positionKm) ||
      !isFiniteVec3(state.velocityKmPerS) ||
      !isFiniteVec3(acceleration)
    ) {
      stop(
        'NON_FINITE_STATE',
        'Integration produced a non-finite state or acceleration; the model is no longer numerically valid at this timestep.',
        timeSeconds,
      );
      break;
    }

    const radiusKm = magnitude(state.positionKm);

    // Below the supported numeric floor the 1/r^3 term is singular or
    // ill-conditioned, so measured output there would be meaningless.
    if (radiusKm < MIN_SUPPORTED_RADIUS_KM) {
      stop(
        'UNSAFE_SEPARATION',
        `Separation fell to ${radiusKm.toExponential(3)} km at t = ${timeSeconds} s, below the supported numeric floor of ${MIN_SUPPORTED_RADIUS_KM} km, where the central-body term is singular or ill-conditioned. Results past this point are not reliable and are not reported.`,
        timeSeconds,
      );
      break;
    }

    if (energyScale > 0) {
      const energy = specificOrbitalEnergyKm2PerS2(state, mu);
      const deviation = Math.abs(energy - initialEnergy) / energyScale;
      if (deviation > maxRelativeEnergyDeviation) {
        maxRelativeEnergyDeviation = deviation;
      }
      if (deviation > ENERGY_DEVIATION_UNSTABLE_THRESHOLD) {
        recordStoppingSample(timeSeconds, state);
        stop(
          'ENERGY_DEVIATION_UNSTABLE',
          `Relative specific-orbital-energy deviation reached ${deviation.toExponential(3)} (limit ${ENERGY_DEVIATION_UNSTABLE_THRESHOLD}). Energy is conserved by this model's continuous dynamics, so the fixed-step result is no longer trustworthy; the run was stopped instead of returning unreliable numbers.`,
          timeSeconds,
        );
        break;
      }
    }

    // Unsafe geometry: inside the configured impact radius the point-mass
    // central-body model is no longer physically meaningful. The crossing is
    // reported in the warning; the out-of-limit state is not emitted as a result.
    if (impactRadiusKm !== undefined && radiusKm <= impactRadiusKm) {
      stop(
        'IMPACT_RADIUS_REACHED',
        `The test particle crossed the configured impact radius (${impactRadiusKm} km) and was detected at r = ${radiusKm.toFixed(3)} km (t = ${timeSeconds} s). States at or below this radius are not meaningful for this model and are not reported.`,
        timeSeconds,
      );
      break;
    }

    if (step % sampleEverySteps === 0) {
      samples.push({ timeSeconds, state });
    }
  }

  const finalEnergy = specificOrbitalEnergyKm2PerS2(state, mu);

  return {
    label: config.label,
    model: 'two-body-central',
    integrator: INTEGRATOR_ID,
    units: INTERNAL_UNIT_SYSTEM,
    frame: EARTH_CENTERED_INERTIAL_FRAME,
    centralBody: {
      id: config.centralBody.id,
      name: config.centralBody.name,
      gravitationalParameterKm3PerS2: mu,
    },
    timestepSeconds,
    durationSeconds,
    sampleIntervalSeconds,
    completedDurationSeconds,
    status,
    stopReason,
    warnings,
    samples,
    diagnostics: {
      steps,
      accelerationEvaluations,
      initialSpecificOrbitalEnergyKm2PerS2: initialEnergy,
      finalSpecificOrbitalEnergyKm2PerS2: finalEnergy,
      maxRelativeEnergyDeviation,
    },
  };
}
