/**
 * Input validation for simulation configurations.
 *
 * Validation is part of the feature, not decoration: invalid dimensions,
 * non-finite numbers, singular geometry, and steps that cannot be integrated
 * evenly must be rejected with a specific message instead of producing
 * plausible-looking output.
 */

import { SimulationInputError } from './errors';
import type { ValidationIssue } from './errors';
import type { SimulationConfig } from './types';
import { isFiniteVec3, magnitude } from './vector3';

export const DEFAULT_MAX_STEPS = 1_000_000;
export const DEFAULT_MAX_SAMPLES = 200_000;

/**
 * Numeric range guard rails for this milestone.
 *
 * These bounds exist to keep squares, cubes, and reciprocal cubes of the state
 * inside the finite range of IEEE-754 doubles. They are deliberately far wider
 * than any scenario this educational model is meant to cover (1e12 km is about
 * 6,700 AU; 1e5 km/s is about one third of the speed of light), so they reject
 * numerically unsafe input rather than imposing a physical claim.
 */
export const MAX_SUPPORTED_RADIUS_KM = 1e12;
export const MAX_SUPPORTED_SPEED_KM_PER_S = 1e5;
/**
 * Lower bound on the separation from the force center. Below this radius the
 * 1/r^3 term is ill-conditioned or singular, so the runner stops instead of
 * emitting numbers. This is a numeric floor, not a physical model of impact.
 */
export const MIN_SUPPORTED_RADIUS_KM = 1e-3;

/**
 * Relative tolerance used when checking that the duration and the sampling
 * interval are integer multiples of the timestep. Floating point values such as
 * 16680 / 10 are exact here, but computed values (for example one orbital
 * period) may carry tiny representation error, so an exact `%` test would be
 * brittle. The tolerance is far below any physically meaningful difference.
 */
const MULTIPLE_TOLERANCE = 1e-9;

/** True when `value` is an integer multiple of `step` within the stated tolerance. */
export function isIntegerMultipleOf(value: number, step: number): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    return false;
  }
  const ratio = value / step;
  const nearest = Math.round(ratio);
  return nearest >= 1 && Math.abs(ratio - nearest) <= MULTIPLE_TOLERANCE * nearest;
}

/**
 * Returns every problem found in the configuration; an empty array means the
 * configuration may be integrated.
 */
export function validateSimulationConfig(config: SimulationConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // -- central body -------------------------------------------------------
  const mu = config.centralBody?.gravitationalParameterKm3PerS2;
  if (!Number.isFinite(mu)) {
    issues.push({
      field: 'centralBody.gravitationalParameterKm3PerS2',
      message: 'Gravitational parameter must be a finite number in km^3/s^2.',
    });
  } else if (!(mu > 0)) {
    issues.push({
      field: 'centralBody.gravitationalParameterKm3PerS2',
      message: 'Gravitational parameter must be greater than zero km^3/s^2.',
    });
  }
  if (!config.centralBody?.id) {
    issues.push({ field: 'centralBody.id', message: 'Central body needs a stable id.' });
  }
  if (!config.centralBody?.name) {
    issues.push({ field: 'centralBody.name', message: 'Central body needs a display name.' });
  }
  const meanRadius = config.centralBody?.meanRadiusKm;
  if (meanRadius !== undefined && (!Number.isFinite(meanRadius) || meanRadius < 0)) {
    issues.push({
      field: 'centralBody.meanRadiusKm',
      message: 'Mean radius must be a finite, non-negative number of kilometres.',
    });
  }

  // -- initial state ------------------------------------------------------
  const position = config.initialState?.positionKm;
  const velocity = config.initialState?.velocityKmPerS;

  if (!position || !isFiniteVec3(position)) {
    issues.push({
      field: 'initialState.positionKm',
      message: 'Position must contain three finite numbers (NaN and Infinity are rejected).',
    });
  }
  if (!velocity || !isFiniteVec3(velocity)) {
    issues.push({
      field: 'initialState.velocityKmPerS',
      message: 'Velocity must contain three finite numbers (NaN and Infinity are rejected).',
    });
  }

  const radius = position && isFiniteVec3(position) ? magnitude(position) : null;
  if (radius === 0) {
    issues.push({
      field: 'initialState.positionKm',
      message:
        'Zero separation from the central body is singular for this force model and cannot be integrated.',
    });
  } else if (radius !== null && radius < MIN_SUPPORTED_RADIUS_KM) {
    issues.push({
      field: 'initialState.positionKm',
      message: `Separation (${radius} km) is below the supported numeric floor of ${MIN_SUPPORTED_RADIUS_KM} km; the 1/r^3 term is singular or ill-conditioned there.`,
    });
  } else if (radius !== null && radius > MAX_SUPPORTED_RADIUS_KM) {
    issues.push({
      field: 'initialState.positionKm',
      message: `Separation (${radius} km) exceeds the supported numeric range of ${MAX_SUPPORTED_RADIUS_KM} km for this milestone.`,
    });
  }

  if (velocity && isFiniteVec3(velocity) && magnitude(velocity) > MAX_SUPPORTED_SPEED_KM_PER_S) {
    issues.push({
      field: 'initialState.velocityKmPerS',
      message: `Speed (${magnitude(velocity)} km/s) exceeds the supported numeric range of ${MAX_SUPPORTED_SPEED_KM_PER_S} km/s for this milestone.`,
    });
  }

  // -- timing -------------------------------------------------------------
  const timestep = config.timestepSeconds;
  if (!Number.isFinite(timestep) || !(timestep > 0)) {
    issues.push({
      field: 'timestepSeconds',
      message: 'Timestep must be a finite number of seconds greater than zero.',
    });
  }

  const duration = config.durationSeconds;
  if (!Number.isFinite(duration) || !(duration > 0)) {
    issues.push({
      field: 'durationSeconds',
      message: 'Duration must be a finite number of seconds greater than zero.',
    });
  }

  const timingUsable =
    Number.isFinite(timestep) && timestep > 0 && Number.isFinite(duration) && duration > 0;

  if (timingUsable && !isIntegerMultipleOf(duration, timestep)) {
    issues.push({
      field: 'durationSeconds',
      message: `Duration must be an integer multiple of the timestep (received ${duration} s with a ${timestep} s step). Partial final steps are not integrated.`,
    });
  }

  const maxSteps = config.maxSteps ?? DEFAULT_MAX_STEPS;
  if (!Number.isInteger(maxSteps) || maxSteps < 1) {
    issues.push({ field: 'maxSteps', message: 'maxSteps must be a positive integer.' });
  } else if (timingUsable) {
    const steps = Math.round(duration / timestep);
    if (steps > maxSteps) {
      issues.push({
        field: 'maxSteps',
        message: `This configuration needs ${steps} steps, which exceeds the safety bound of ${maxSteps}. Increase the timestep, shorten the duration, or raise maxSteps deliberately.`,
      });
    }
  }

  const sampleInterval = config.sampleIntervalSeconds;
  if (sampleInterval !== undefined) {
    if (!Number.isFinite(sampleInterval) || !(sampleInterval > 0)) {
      issues.push({
        field: 'sampleIntervalSeconds',
        message: 'Sampling interval must be a finite number of seconds greater than zero.',
      });
    } else if (timingUsable && !isIntegerMultipleOf(sampleInterval, timestep)) {
      issues.push({
        field: 'sampleIntervalSeconds',
        message: 'Sampling interval must be an integer multiple of the timestep.',
      });
    } else if (timingUsable) {
      const samples = Math.round(duration / sampleInterval) + 1;
      if (samples > DEFAULT_MAX_SAMPLES) {
        issues.push({
          field: 'sampleIntervalSeconds',
          message: `This would record ${samples} samples, above the limit of ${DEFAULT_MAX_SAMPLES}. Increase the sampling interval.`,
        });
      }
    }
  }

  // -- stop condition -----------------------------------------------------
  const impactRadius = config.impactRadiusKm;
  if (impactRadius !== undefined) {
    if (!Number.isFinite(impactRadius) || impactRadius < 0) {
      issues.push({
        field: 'impactRadiusKm',
        message: 'Impact radius must be a finite, non-negative number of kilometres.',
      });
    } else if (radius !== null && radius <= impactRadius) {
      issues.push({
        field: 'initialState.positionKm',
        message: `Initial radius (${radius.toFixed(3)} km) is at or below the configured impact radius (${impactRadius} km); the run would stop immediately.`,
      });
    }
  }

  return issues;
}

/** Throws a SimulationInputError describing every problem found. */
export function assertValidSimulationConfig(config: SimulationConfig): void {
  const issues = validateSimulationConfig(config);
  if (issues.length > 0) {
    throw new SimulationInputError(
      `Simulation configuration is invalid (${issues.length} issue${issues.length === 1 ? '' : 's'}).`,
      issues,
    );
  }
}
