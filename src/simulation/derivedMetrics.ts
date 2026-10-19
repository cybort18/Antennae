/**
 * Derived two-body quantities used for validation, tests, and (later) the
 * results panel. All functions are pure and unit-explicit:
 *
 * - specific orbital energy:      km^2/s^2
 * - specific angular momentum:    km^2/s
 * - circular speed / period:      km/s, s
 *
 * These are definitional checks for the implemented model, not a claim of
 * ephemeris-grade accuracy.
 */

import type { StateVector } from './types';
import type { Vec3 } from './vector3';
import { cross, dot, magnitude, magnitudeSquared, scale, subtract } from './vector3';

/** Specific orbital energy: v^2/2 - mu/r  (km^2/s^2). */
export function specificOrbitalEnergyKm2PerS2(
  state: StateVector,
  gravitationalParameterKm3PerS2: number,
): number {
  const r = magnitude(state.positionKm);
  return (
    0.5 * magnitudeSquared(state.velocityKmPerS) - gravitationalParameterKm3PerS2 / r
  );
}

/** Specific angular momentum vector h = r x v (km^2/s). */
export function specificAngularMomentum(
  state: StateVector,
): Vec3 {
  return cross(state.positionKm, state.velocityKmPerS);
}

/** Speed of an ideal circular orbit at the given radius (km/s). */
export function circularOrbitalSpeedKmPerS(
  radiusKm: number,
  gravitationalParameterKm3PerS2: number,
): number {
  return Math.sqrt(gravitationalParameterKm3PerS2 / radiusKm);
}

/** Period of an ideal circular orbit at the given radius (s). */
export function circularOrbitalPeriodSeconds(
  radiusKm: number,
  gravitationalParameterKm3PerS2: number,
): number {
  return 2 * Math.PI * Math.sqrt((radiusKm * radiusKm * radiusKm) / gravitationalParameterKm3PerS2);
}

/** Semi-major axis from the energy equation; null for unbound (parabolic/hyperbolic) states. */
export function semiMajorAxisKm(
  state: StateVector,
  gravitationalParameterKm3PerS2: number,
): number | null {
  const energy = specificOrbitalEnergyKm2PerS2(state, gravitationalParameterKm3PerS2);
  if (!(energy < 0)) {
    return null;
  }
  return -gravitationalParameterKm3PerS2 / (2 * energy);
}

/**
 * Laplace-Runge-Lenz eccentricity vector:
 *   e = ((v^2 - mu/r) * r - (r . v) * v) / mu
 * Its magnitude is the orbital eccentricity (0 for an ideal circular orbit).
 */
export function eccentricityVector(
  state: StateVector,
  gravitationalParameterKm3PerS2: number,
): Vec3 {
  const { positionKm: r, velocityKmPerS: v } = state;
  const rMag = magnitude(r);
  const vSq = magnitudeSquared(v);
  const rv = dot(r, v);
  const first = scale(r, vSq - gravitationalParameterKm3PerS2 / rMag);
  const second = scale(v, rv);
  return scale(subtract(first, second), 1 / gravitationalParameterKm3PerS2);
}

/** Orbital eccentricity (dimensionless). */
export function eccentricity(
  state: StateVector,
  gravitationalParameterKm3PerS2: number,
): number {
  return magnitude(eccentricityVector(state, gravitationalParameterKm3PerS2));
}
