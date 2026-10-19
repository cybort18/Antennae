/**
 * Results-layer tests.
 *
 * These verify that the workspace's displayed metrics come from recorded engine
 * samples and the engine's own derived-metric utilities — no re-derivation and
 * no invented values.
 */
import { describe, expect, it } from 'vitest';

import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MU_KM3_S2,
  circularOrbitalSpeedKmPerS,
  createCircularEarthOrbitScenario,
  runSimulation,
} from '../../simulation';
import { lastSampleTimeSeconds, runAggregates, sampleMetrics } from '../runSummary';

const ALTITUDE_KM = 400;
const RADIUS_KM = EARTH_MEAN_RADIUS_KM + ALTITUDE_KM;

const result = runSimulation(
  createCircularEarthOrbitScenario({
    altitudeKm: ALTITUDE_KM,
    timestepSeconds: 10,
    durationSeconds: 2000,
    sampleIntervalSeconds: 10,
  }),
);

describe('sampleMetrics', () => {
  it('reports altitude relative to the supplied reference radius', () => {
    const metrics = sampleMetrics(result.samples[0], EARTH_MU_KM3_S2, EARTH_MEAN_RADIUS_KM);
    expect(metrics.radiusKm).toBeCloseTo(RADIUS_KM, 6);
    expect(metrics.altitudeKm).toBeCloseTo(ALTITUDE_KM, 6);
  });

  it('matches the engine circular speed at the first sample', () => {
    const metrics = sampleMetrics(result.samples[0], EARTH_MU_KM3_S2, EARTH_MEAN_RADIUS_KM);
    expect(metrics.speedKmPerS).toBeCloseTo(
      circularOrbitalSpeedKmPerS(RADIUS_KM, EARTH_MU_KM3_S2),
      6,
    );
  });

  it('reports a near-zero eccentricity for the circular preset', () => {
    const metrics = sampleMetrics(result.samples[0], EARTH_MU_KM3_S2, EARTH_MEAN_RADIUS_KM);
    expect(metrics.eccentricity).toBeLessThan(1e-6);
  });

  it('reports specific angular momentum consistent with r x v', () => {
    const metrics = sampleMetrics(result.samples[0], EARTH_MU_KM3_S2, EARTH_MEAN_RADIUS_KM);
    expect(metrics.specificAngularMomentumKm2PerS).toBeCloseTo(
      RADIUS_KM * metrics.speedKmPerS,
      6,
    );
  });

  it('carries the sample time through unchanged', () => {
    const metrics = sampleMetrics(result.samples[5], EARTH_MU_KM3_S2, EARTH_MEAN_RADIUS_KM);
    expect(metrics.timeSeconds).toBe(result.samples[5].timeSeconds);
  });
});

describe('runAggregates', () => {
  const aggregates = runAggregates(result, EARTH_MEAN_RADIUS_KM);

  it('covers exactly the recorded samples', () => {
    expect(aggregates.sampleCount).toBe(result.samples.length);
  });

  it('keeps extremes ordered and consistent for a near-circular orbit', () => {
    expect(aggregates.minRadiusKm).toBeLessThanOrEqual(aggregates.maxRadiusKm);
    expect(aggregates.minSpeedKmPerS).toBeLessThanOrEqual(aggregates.maxSpeedKmPerS);
    expect(aggregates.minRadiusKm).toBeGreaterThan(RADIUS_KM - 1);
    expect(aggregates.maxRadiusKm).toBeLessThan(RADIUS_KM + 1);
  });

  it('derives altitudes from the same reference radius used for the samples', () => {
    expect(aggregates.minAltitudeKm).toBeCloseTo(aggregates.minRadiusKm - EARTH_MEAN_RADIUS_KM, 9);
    expect(aggregates.maxAltitudeKm).toBeCloseTo(aggregates.maxRadiusKm - EARTH_MEAN_RADIUS_KM, 9);
  });

  it('reports the last recorded sample time as the playback bound', () => {
    expect(lastSampleTimeSeconds(result)).toBe(result.samples[result.samples.length - 1].timeSeconds);
    expect(lastSampleTimeSeconds(result)).toBeLessThanOrEqual(result.completedDurationSeconds);
  });
});
