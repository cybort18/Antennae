/**
 * Domain contracts for the two-body test-particle simulation core.
 *
 * These types are intentionally explicit about units (the field names carry
 * them) so that a state cannot be silently passed between different unit
 * conventions. See units.ts for the frame convention and constants.ts for the
 * gravitational parameters.
 */

import type { UnitSystem, ReferenceFrame } from './units';
import type { Vec3 } from './vector3';

/** Position in km and velocity in km/s, in the frame described by units.ts. */
export type StateVector = {
  positionKm: Vec3;
  velocityKmPerS: Vec3;
};

/**
 * The dominant body the test particle orbits.
 * Only its gravitational parameter is used by the force model; `meanRadiusKm`
 * is descriptive (and can provide a default impact-stop radius).
 */
export type CentralBody = {
  id: string;
  name: string;
  gravitationalParameterKm3PerS2: number;
  meanRadiusKm?: number;
};

/** Identifiers for implemented numerical integrators. */
export type IntegratorId = 'leapfrog-kick-drift-kick';

/** Simulation model identifiers; only 'two-body-central' exists in this milestone. */
export type SimulationModelId = 'two-body-central';

export type SimulationConfig = {
  /** Optional human-readable scenario label. Does not affect the computation. */
  label?: string;
  centralBody: CentralBody;
  initialState: StateVector;
  /** Integration step, seconds. Must be > 0 and must divide durationSeconds evenly. */
  timestepSeconds: number;
  /** Total simulated duration, seconds. Must be > 0 and an integer multiple of the timestep. */
  durationSeconds: number;
  /**
   * Optional sampling interval, seconds. Defaults to the timestep (sample every
   * step). Must be an integer multiple of the timestep. Sampling affects only
   * the recorded output, never the integration itself.
   */
  sampleIntervalSeconds?: number;
  /**
   * Optional stop condition: the run stops (status 'stopped') as soon as the
   * particle's radius is less than or equal to this value, because the
   * point-mass model is no longer physically meaningful there (for example,
   * Earth's surface).
   */
  impactRadiusKm?: number;
  /** Safety bound on the number of integration steps. Defaults to 1,000,000. */
  maxSteps?: number;
};

export type SimulationSample = {
  timeSeconds: number;
  state: StateVector;
};

export type SimulationWarningCode =
  /** Radius at or below the configured impact radius; model no longer valid. */
  | 'IMPACT_RADIUS_REACHED'
  /** Separation fell below the supported numeric floor; the force model is ill-conditioned or singular there. */
  | 'UNSAFE_SEPARATION'
  /** A non-finite value appeared mid-run; the run is unreliable. */
  | 'NON_FINITE_STATE'
  /**
   * Specific orbital energy deviated far beyond numerical tolerance. For this
   * conservative central-force model the energy is exactly conserved by the
   * continuous dynamics, so a large deviation means the fixed-step integration
   * is no longer trustworthy; the run is stopped.
   */
  | 'ENERGY_DEVIATION_UNSTABLE'
  /**
   * Heuristic advisory: the timestep is large relative to the initial local
   * orbital period, so the fixed-step result may be visibly inaccurate. This is
   * a rule-of-thumb flag, NOT an error bound.
   */
  | 'COARSE_TIMESTEP_ADVISORY';

export type SimulationWarning = {
  code: SimulationWarningCode;
  message: string;
  timeSeconds: number;
};

/** 'completed' means the full requested duration was integrated. */
export type SimulationStatus = 'completed' | 'stopped';

/**
 * Reproducibility and validity metadata plus the sampled trajectory.
 * Every field needed to re-run the identical computation is included.
 */
export type SimulationResult = {
  label?: string;
  model: SimulationModelId;
  integrator: IntegratorId;
  units: UnitSystem;
  frame: ReferenceFrame;
  centralBody: {
    id: string;
    name: string;
    gravitationalParameterKm3PerS2: number;
  };
  timestepSeconds: number;
  durationSeconds: number;
  sampleIntervalSeconds: number;
  /** Simulated time actually reached; equal to durationSeconds when completed. */
  completedDurationSeconds: number;
  status: SimulationStatus;
  /** Present when status is 'stopped'. */
  stopReason?: SimulationWarningCode;
  warnings: SimulationWarning[];
  samples: SimulationSample[];
  diagnostics: {
    steps: number;
    accelerationEvaluations: number;
    initialSpecificOrbitalEnergyKm2PerS2: number;
    finalSpecificOrbitalEnergyKm2PerS2: number;
    /**
     * max |E(t) - E(0)| / |E(0)| over the run. For this conservative central
     * force and a symplectic fixed-step integrator the deviation should stay
     * bounded and small; it is a numerical-quality indicator, not a proof.
     */
    maxRelativeEnergyDeviation: number;
  };
};
