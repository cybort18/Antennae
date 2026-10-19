/**
 * Numerical integration of the central-body two-body model.
 *
 * Implemented method: kick-drift-kick leapfrog, also known as velocity Verlet:
 *
 *   v(t + dt/2) = v(t) + a(r(t)) * dt/2        (kick)
 *   r(t + dt)   = r(t) + v(t + dt/2) * dt      (drift)
 *   v(t + dt)   = v(t + dt/2) + a(r(t+dt)) * dt/2   (kick)
 *
 * Why this method was chosen for this model:
 * - The equations are a separable Hamiltonian system (kinetic + potential), for
 *   which this method is symplectic: the energy error stays bounded and does not
 *   drift secularly at fixed step size, which matters for long educational runs.
 * - It is second order in the timestep, so halving the step reduces the error
 *   substantially and predictably (see the timestep-sensitivity test).
 * - It needs one new acceleration evaluation per step, which is cheap.
 *
 * Honest limitations (do not overstate this):
 * - A fixed-step symplectic integrator is NOT exactly energy-conserving: the
 *   energy oscillates within a bounded envelope, and phase error along the
 *   orbit still accumulates with time.
 * - Accuracy degrades on close approaches / high-eccentricity orbits unless the
 *   step is small relative to the local orbital timescale; a step that is too
 *   large can produce visibly wrong or unstable motion. The runner therefore
 *   applies a step bound and stops on unsafe geometry rather than trusting the
 *   output.
 * - There is no adaptive step control and no event detection beyond the
 *   configured impact radius in this milestone.
 */

import { add, scale } from './vector3';
import type { Vec3 } from './vector3';
import type { StateVector } from './types';

export type AccelerationFunction = (positionKm: Vec3) => Vec3;

export type LeapfrogStepResult = {
  state: StateVector;
  /** Acceleration at the end of the step; reuse it as the next step's input. */
  accelerationAtEnd: Vec3;
};

/**
 * Advances the state by one fixed step.
 *
 * `accelerationAtStart` must be the acceleration at the current position; the
 * runner caches it between steps so each step costs exactly one new evaluation.
 */
export function leapfrogKickDriftKickStep(
  state: StateVector,
  timestepSeconds: number,
  accelerationAtStart: Vec3,
  accelerationFunction: AccelerationFunction,
): LeapfrogStepResult {
  const halfStep = timestepSeconds / 2;

  const velocityHalf = add(state.velocityKmPerS, scale(accelerationAtStart, halfStep));
  const positionNext = add(state.positionKm, scale(velocityHalf, timestepSeconds));
  const accelerationAtEnd = accelerationFunction(positionNext);
  const velocityNext = add(velocityHalf, scale(accelerationAtEnd, halfStep));

  return {
    state: { positionKm: positionNext, velocityKmPerS: velocityNext },
    accelerationAtEnd,
  };
}
