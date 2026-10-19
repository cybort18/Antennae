/**
 * Public API of the isolated two-body physics core.
 *
 * This module is framework-independent: it must not import React, Three.js, or
 * any browser API. The UI layer consumes it; the physics layer never consumes
 * the UI.
 */

export type { UnitSystem, ReferenceFrame } from './units';
export { INTERNAL_UNIT_SYSTEM, EARTH_CENTERED_INERTIAL_FRAME } from './units';

export {
  EARTH_MASS_KG,
  EARTH_MEAN_RADIUS_KM,
  EARTH_MU_KM3_S2,
  NEWTONIAN_G_KM3_KG_S2,
} from './constants';

export type { Vec3 } from './vector3';
export * from './vector3';

export type {
  CentralBody,
  IntegratorId,
  SimulationConfig,
  SimulationModelId,
  SimulationResult,
  SimulationSample,
  SimulationStatus,
  SimulationWarning,
  SimulationWarningCode,
  StateVector,
} from './types';

export { SimulationInputError } from './errors';
export type { ValidationIssue } from './errors';

export {
  DEFAULT_MAX_SAMPLES,
  DEFAULT_MAX_STEPS,
  MAX_SUPPORTED_RADIUS_KM,
  MAX_SUPPORTED_SPEED_KM_PER_S,
  MIN_SUPPORTED_RADIUS_KM,
  assertValidSimulationConfig,
  isIntegerMultipleOf,
  validateSimulationConfig,
} from './validation';

export {
  centralBodyAcceleration,
  centralBodyAccelerationMagnitude,
} from './forceModel';

export { leapfrogKickDriftKickStep } from './integrators';
export type { AccelerationFunction, LeapfrogStepResult } from './integrators';

export {
  circularOrbitalPeriodSeconds,
  circularOrbitalSpeedKmPerS,
  eccentricity,
  eccentricityVector,
  semiMajorAxisKm,
  specificAngularMomentum,
  specificOrbitalEnergyKm2PerS2,
} from './derivedMetrics';

export { runSimulation } from './runSimulation';

export {
  EARTH_CENTRAL_BODY,
  createCircularEarthOrbitScenario,
  createCircularOrbitState,
} from './presets';
export type { CircularEarthOrbitOptions } from './presets';
