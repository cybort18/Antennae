/**
 * Central-body (two-body) point-mass gravity for a test particle.
 *
 * Model (all values in the internal unit system of units.ts):
 *
 *   a(r) = -mu * r / |r|^3          [km/s^2], with mu in km^3/s^2 and r in km
 *
 * Assumptions and limits, stated explicitly:
 * - The central body is treated as a fixed point mass at the frame origin. The
 *   test particle's mass does not influence the motion (massless test particle),
 *   which is the standard simplification for a small spacecraft or asteroid
 *   relative to a planet.
 * - No oblateness (J2 and higher), third bodies, drag, radiation pressure,
 *   relativity, or thrust is modeled.
 * - The expression is singular at |r| = 0; callers must reject or stop on
 *   singular or unsafe separations instead of integrating through them.
 */

import { SimulationInputError } from './errors';
import type { Vec3 } from './vector3';
import { magnitudeSquared, scale } from './vector3';

export function centralBodyAcceleration(
  positionKm: Vec3,
  gravitationalParameterKm3PerS2: number,
): Vec3 {
  const rSquared = magnitudeSquared(positionKm);
  if (rSquared === 0) {
    throw new SimulationInputError(
      'Central-body acceleration is undefined at zero separation (r = 0).',
      [{ field: 'positionKm', message: 'The state is singular: the particle is at the force center.' }],
    );
  }
  const inverseRCubed = 1 / (rSquared * Math.sqrt(rSquared));
  return scale(positionKm, -gravitationalParameterKm3PerS2 * inverseRCubed);
}

/** Magnitude of the central-body acceleration, |a| = mu / r^2 (km/s^2). */
export function centralBodyAccelerationMagnitude(
  positionKm: Vec3,
  gravitationalParameterKm3PerS2: number,
): number {
  const rSquared = magnitudeSquared(positionKm);
  if (rSquared === 0) {
    throw new SimulationInputError(
      'Central-body acceleration magnitude is undefined at zero separation (r = 0).',
      [{ field: 'positionKm', message: 'The state is singular: the particle is at the force center.' }],
    );
  }
  return gravitationalParameterKm3PerS2 / rSquared;
}
