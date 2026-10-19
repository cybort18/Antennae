/**
 * Educational presets for the two-body core.
 *
 * PROVENANCE — read before using any preset from this file:
 * These presets are SYNTHETIC idealizations constructed from the documented
 * constants in constants.ts (a perfect circular orbit around a point-mass
 * Earth). They are NOT NASA/JPL-sourced state vectors, they correspond to no
 * specific real spacecraft, and they carry no epoch. A reference-data preset
 * with real provenance (source, target id, epoch, frame, retrieval date) is a
 * later milestone; see docs/DATA_SOURCES.md.
 */

import { EARTH_MEAN_RADIUS_KM, EARTH_MU_KM3_S2 } from './constants';
import { circularOrbitalPeriodSeconds, circularOrbitalSpeedKmPerS } from './derivedMetrics';
import { vec3 } from './vector3';
import type { CentralBody, SimulationConfig, StateVector } from './types';

/** Earth as a central body for the two-body model. */
export const EARTH_CENTRAL_BODY: CentralBody = {
  id: 'earth',
  name: 'Earth',
  gravitationalParameterKm3PerS2: EARTH_MU_KM3_S2,
  meanRadiusKm: EARTH_MEAN_RADIUS_KM,
};

export type CircularEarthOrbitOptions = {
  /** Altitude above the central body's mean radius, km. Default 400 km (low Earth orbit). */
  altitudeKm?: number;
  /** Integration timestep, seconds. Default 10 s. */
  timestepSeconds?: number;
  /**
   * Simulated duration, seconds. Default: one full orbital period, rounded to an
   * exact multiple of the timestep so the run satisfies the divisibility rule.
   */
  durationSeconds?: number;
  /** Sampling interval, seconds. Defaults to the timestep (every step). */
  sampleIntervalSeconds?: number;
  /** Stop radius in km. Default: the central body mean radius (impact). */
  impactRadiusKm?: number;
  label?: string;
};

/**
 * Ideal circular orbit initial condition in the frame of units.ts:
 * position on +x, velocity on +y (prograde about +z).
 */
export function createCircularOrbitState(
  radiusKm: number,
  gravitationalParameterKm3PerS2: number,
): StateVector {
  const speed = circularOrbitalSpeedKmPerS(radiusKm, gravitationalParameterKm3PerS2);
  return {
    positionKm: vec3(radiusKm, 0, 0),
    velocityKmPerS: vec3(0, speed, 0),
  };
}

/**
 * Builds a validated-ready configuration for one ideal circular Earth orbit.
 * Deterministic: the same options always produce the same configuration.
 */
export function createCircularEarthOrbitScenario(
  options: CircularEarthOrbitOptions = {},
): SimulationConfig {
  const altitudeKm = options.altitudeKm ?? 400;
  const radiusKm = EARTH_MEAN_RADIUS_KM + altitudeKm;
  const timestepSeconds = options.timestepSeconds ?? 10;
  const periodSeconds = circularOrbitalPeriodSeconds(radiusKm, EARTH_MU_KM3_S2);
  const durationSeconds =
    options.durationSeconds ?? Math.round(periodSeconds / timestepSeconds) * timestepSeconds;

  return {
    label: options.label ?? `Ideal circular Earth orbit at ${altitudeKm} km altitude`,
    centralBody: EARTH_CENTRAL_BODY,
    initialState: createCircularOrbitState(radiusKm, EARTH_MU_KM3_S2),
    timestepSeconds,
    durationSeconds,
    sampleIntervalSeconds: options.sampleIntervalSeconds,
    impactRadiusKm: options.impactRadiusKm ?? EARTH_MEAN_RADIUS_KM,
  };
}
