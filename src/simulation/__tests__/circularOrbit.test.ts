/**
 * Documented circular-orbit benchmark.
 *
 * Scenario (an explicit educational idealization, NOT a NASA/JPL state):
 *   - central body: Earth, mu = 398600.4418 km^3/s^2
 *   - radius: 6371.0 (mean radius) + 400 km altitude = 6771 km
 *   - initial state: r = (6771, 0, 0) km, v = (0, v_circular, 0) km/s
 *   - integrator: fixed-step leapfrog (kick-drift-kick), dt = 10 s
 *   - interval: 16,640 s (~3.0 orbits; chosen to be an exact multiple of dt)
 *
 * The tolerances below are not guesses: they were measured on this
 * implementation (values in the comments), then given headroom so the test
 * detects regressions without being brittle.
 */
import { describe, expect, it } from 'vitest';

import { EARTH_MASS_KG, EARTH_MEAN_RADIUS_KM, EARTH_MU_KM3_S2 } from '../constants';
import {
  circularOrbitalPeriodSeconds,
  eccentricity,
  specificAngularMomentum,
  specificOrbitalEnergyKm2PerS2,
} from '../derivedMetrics';
import { createCircularEarthOrbitScenario } from '../presets';
import { runSimulation } from '../runSimulation';
import { isFiniteVec3, magnitude } from '../vector3';

const ALTITUDE_KM = 400;
const RADIUS_KM = EARTH_MEAN_RADIUS_KM + ALTITUDE_KM;
const TIMESTEP_SECONDS = 10;
const DURATION_SECONDS = 16_640;

describe('ideal circular Earth orbit remains qualitatively near-circular', () => {
  const result = runSimulation(
    createCircularEarthOrbitScenario({
      altitudeKm: ALTITUDE_KM,
      timestepSeconds: TIMESTEP_SECONDS,
      durationSeconds: DURATION_SECONDS,
      sampleIntervalSeconds: TIMESTEP_SECONDS,
    }),
  );

  it('completes the requested interval without warnings', () => {
    expect(result.status).toBe('completed');
    expect(result.stopReason).toBeUndefined();
    expect(result.warnings).toEqual([]);
    expect(result.completedDurationSeconds).toBe(DURATION_SECONDS);
    expect(result.diagnostics.steps).toBe(DURATION_SECONDS / TIMESTEP_SECONDS);
    expect(result.samples.length).toBe(DURATION_SECONDS / TIMESTEP_SECONDS + 1);
  });

  it('keeps every sampled state finite', () => {
    for (const sample of result.samples) {
      expect(isFiniteVec3(sample.state.positionKm)).toBe(true);
      expect(isFiniteVec3(sample.state.velocityKmPerS)).toBe(true);
    }
  });

  it('stays within 1 km of the initial radius (measured spread 0.435 km)', () => {
    const maxDeviation = Math.max(
      ...result.samples.map((sample) => Math.abs(magnitude(sample.state.positionKm) - RADIUS_KM)),
    );
    expect(maxDeviation).toBeLessThan(1);
    // The radius oscillation of a fixed-step leapfrog run scales as O(dt^2); it
    // is small here but explicitly not zero.
    expect(maxDeviation).toBeGreaterThan(0);
  });

  it('keeps the orbital eccentricity tiny (measured max 6.4e-5)', () => {
    const maxEccentricity = Math.max(
      ...result.samples.map((sample) => eccentricity(sample.state, EARTH_MU_KM3_S2)),
    );
    expect(maxEccentricity).toBeLessThan(1e-4);
  });

  it('keeps the specific orbital energy within 1e-7 relative (measured 4.1e-9)', () => {
    expect(result.diagnostics.maxRelativeEnergyDeviation).toBeLessThan(1e-7);
    const expectedEnergy = -EARTH_MU_KM3_S2 / (2 * RADIUS_KM);
    expect(result.diagnostics.initialSpecificOrbitalEnergyKm2PerS2).toBeCloseTo(expectedEnergy, 9);
  });

  it('conserves specific angular momentum to floating-point precision (measured 2.5e-15)', () => {
    // Structural property: for a central force, both leapfrog kicks are along r
    // and the drift is along a straight line, so h = r x v is conserved by the
    // scheme up to rounding.
    const initial = specificAngularMomentum(result.samples[0].state);
    const initialMagnitude = magnitude(initial);
    const maxRelativeDeviation = Math.max(
      ...result.samples.map((sample) => {
        const h = specificAngularMomentum(sample.state);
        return Math.abs(magnitude(h) - initialMagnitude) / initialMagnitude;
      }),
    );
    expect(maxRelativeDeviation).toBeLessThan(1e-12);
  });

  it('reproduces the analytic period within 0.5% (measured 4.3e-5 relative)', () => {
    // Measure the interval between successive +x crossings of the trajectory and
    // compare with T = 2 pi sqrt(r^3 / mu).
    const crossings: number[] = [];
    for (let i = 1; i < result.samples.length; i += 1) {
      const previous = result.samples[i - 1];
      const current = result.samples[i];
      if (previous.state.positionKm.y < 0 && current.state.positionKm.y >= 0) {
        const fraction =
          -previous.state.positionKm.y /
          (current.state.positionKm.y - previous.state.positionKm.y);
        crossings.push(
          previous.timeSeconds + fraction * (current.timeSeconds - previous.timeSeconds),
        );
      }
    }

    expect(crossings.length).toBeGreaterThanOrEqual(3);
    const measuredPeriod =
      (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
    const analyticPeriod = circularOrbitalPeriodSeconds(RADIUS_KM, EARTH_MU_KM3_S2);
    expect(Math.abs(measuredPeriod - analyticPeriod) / analyticPeriod).toBeLessThan(0.005);
  });

  it('reports more precise energy than a single-Earth-mass estimate would allow', () => {
    // Guard against accidentally replacing GM with G x M: doing so shifts the
    // energy by roughly the mass uncertainty (about 1e-4 relative), which this
    // linearized check would notice.
    const gTimesMEnergy = -(EARTH_MASS_KG * 6.6743e-20) / (2 * RADIUS_KM);
    const trueEnergy = -EARTH_MU_KM3_S2 / (2 * RADIUS_KM);
    expect(result.diagnostics.initialSpecificOrbitalEnergyKm2PerS2).toBeCloseTo(trueEnergy, 9);
    expect(Math.abs(gTimesMEnergy - trueEnergy) / Math.abs(trueEnergy)).toBeGreaterThan(1e-6);
  });

  it('carries units, frame, model, and integrator metadata with the result', () => {
    expect(result.model).toBe('two-body-central');
    expect(result.integrator).toBe('leapfrog-kick-drift-kick');
    expect(result.units.distance).toBe('km');
    expect(result.units.gravitationalParameter).toBe('km^3/s^2');
    expect(result.frame.inertial).toBe(true);
    expect(result.frame.epochAttached).toBe(false);
    expect(result.centralBody.gravitationalParameterKm3PerS2).toBe(EARTH_MU_KM3_S2);
    expect(result.timestepSeconds).toBe(TIMESTEP_SECONDS);
  });

  it('reports an unbound check that is consistent with a bound orbit', () => {
    expect(specificOrbitalEnergyKm2PerS2(result.samples[0].state, EARTH_MU_KM3_S2)).toBeLessThan(0);
  });
});
