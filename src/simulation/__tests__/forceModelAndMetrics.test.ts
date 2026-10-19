/**
 * Central-body force model and derived-metric tests.
 */
import { describe, expect, it } from 'vitest';

import { EARTH_MEAN_RADIUS_KM, EARTH_MU_KM3_S2 } from '../constants';
import {
  circularOrbitalPeriodSeconds,
  circularOrbitalSpeedKmPerS,
  eccentricity,
  semiMajorAxisKm,
  specificAngularMomentum,
  specificOrbitalEnergyKm2PerS2,
} from '../derivedMetrics';
import { SimulationInputError } from '../errors';
import { centralBodyAcceleration, centralBodyAccelerationMagnitude } from '../forceModel';
import { createCircularOrbitState } from '../presets';
import { cross, magnitude, vec3 } from '../vector3';

const RADIUS_KM = EARTH_MEAN_RADIUS_KM + 400;

describe('central-body acceleration', () => {
  it('follows the inverse-square law |a| = mu / r^2', () => {
    const expected = EARTH_MU_KM3_S2 / (RADIUS_KM * RADIUS_KM);
    expect(centralBodyAccelerationMagnitude(vec3(RADIUS_KM, 0, 0), EARTH_MU_KM3_S2)).toBeCloseTo(
      expected,
      12,
    );
    const acceleration = centralBodyAcceleration(vec3(RADIUS_KM, 0, 0), EARTH_MU_KM3_S2);
    expect(magnitude(acceleration)).toBeCloseTo(expected, 12);
  });

  it('points toward the central body (anti-radial)', () => {
    const position = vec3(1000, -2000, 3000);
    const acceleration = centralBodyAcceleration(position, EARTH_MU_KM3_S2);
    // Anti-parallel to r means the cross product vanishes and the dot product is negative.
    expect(magnitude(cross(acceleration, position))).toBeLessThan(1e-9);
    expect(acceleration.x * position.x + acceleration.y * position.y + acceleration.z * position.z).toBeLessThan(0);
  });

  it('scales as 1/r^2 when the radius doubles', () => {
    const near = centralBodyAccelerationMagnitude(vec3(1000, 0, 0), EARTH_MU_KM3_S2);
    const far = centralBodyAccelerationMagnitude(vec3(2000, 0, 0), EARTH_MU_KM3_S2);
    expect(far).toBeCloseTo(near / 4, 12);
  });

  it('rejects zero separation with a clear issue instead of returning a value', () => {
    expect(() => centralBodyAcceleration(vec3(0, 0, 0), EARTH_MU_KM3_S2)).toThrowError(
      SimulationInputError,
    );
    try {
      centralBodyAcceleration(vec3(0, 0, 0), EARTH_MU_KM3_S2);
    } catch (error) {
      expect((error as SimulationInputError).issues[0]?.field).toBe('positionKm');
    }
  });
});

describe('derived two-body quantities', () => {
  const circularState = createCircularOrbitState(RADIUS_KM, EARTH_MU_KM3_S2);

  it('gives an eccentricity of zero for an ideal circular state', () => {
    expect(eccentricity(circularState, EARTH_MU_KM3_S2)).toBeLessThan(1e-12);
  });

  it('gives a semi-major axis equal to the orbit radius for a circular state', () => {
    const a = semiMajorAxisKm(circularState, EARTH_MU_KM3_S2);
    expect(a).not.toBeNull();
    expect(a as number).toBeCloseTo(RADIUS_KM, 6);
  });

  it('gives the energy relation E = -mu / (2a) for a circular state', () => {
    const energy = specificOrbitalEnergyKm2PerS2(circularState, EARTH_MU_KM3_S2);
    expect(energy).toBeCloseTo(-EARTH_MU_KM3_S2 / (2 * RADIUS_KM), 9);
  });

  it('returns null semi-major axis for an unbound (escape) state', () => {
    const escapeSpeed = Math.sqrt(2 * EARTH_MU_KM3_S2 / RADIUS_KM);
    const escaping = {
      positionKm: vec3(RADIUS_KM, 0, 0),
      velocityKmPerS: vec3(escapeSpeed * 1.01, 0, 0),
    };
    expect(semiMajorAxisKm(escaping, EARTH_MU_KM3_S2)).toBeNull();
    expect(specificOrbitalEnergyKm2PerS2(escaping, EARTH_MU_KM3_S2)).toBeGreaterThan(0);
  });

  it('conserves specific angular momentum magnitude and direction for a circular state', () => {
    const h = specificAngularMomentum(circularState);
    const speed = circularOrbitalSpeedKmPerS(RADIUS_KM, EARTH_MU_KM3_S2);
    expect(h.x).toBeCloseTo(0, 9);
    expect(h.y).toBeCloseTo(0, 9);
    expect(h.z).toBeCloseTo(RADIUS_KM * speed, 6);
  });

  it('matches the analytic circular period', () => {
    // T = 2 pi sqrt(r^3 / mu); for a 6771 km Earth orbit this is about 92.4 minutes.
    const period = circularOrbitalPeriodSeconds(RADIUS_KM, EARTH_MU_KM3_S2);
    expect(period).toBeGreaterThan(5500);
    expect(period).toBeLessThan(5600);
  });
});
