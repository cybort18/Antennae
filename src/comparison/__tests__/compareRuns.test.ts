/**
 * Comparison-math tests.
 *
 * These verify that chart series and differences come from recorded engine
 * samples in physical units, that runs of different length or grid are
 * represented honestly, and that nothing is interpolated, extended, or padded.
 */
import { describe, expect, it } from 'vitest';

import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MU_KM3_S2,
  circularOrbitalSpeedKmPerS,
  magnitude,
  type SimulationResult,
} from '../../simulation';
import { DEFAULT_SCENARIO_INPUTS } from '../../scenarios/scenarioInputs';
import {
  altitudeSeries,
  commonComparisonPoint,
  runEndpoints,
} from '../compareRuns';
import {
  editDraft,
  initialComparisonState,
  restoreDraftFromBaseline,
  runCandidate,
  type ComparisonState,
} from '../records';

const BODY_RADIUS_KM = EARTH_MEAN_RADIUS_KM;

function initialState(): ComparisonState {
  const state = initialComparisonState();
  if (!state) {
    throw new Error('The documented default scenario must produce a valid baseline.');
  }
  return state;
}

function candidateFrom(patch: Partial<typeof DEFAULT_SCENARIO_INPUTS>) {
  const state = runCandidate(editDraft(initialState(), patch));
  if (!state.candidate) {
    throw new Error(`Expected a valid candidate run for ${JSON.stringify(patch)}.`);
  }
  return state.candidate;
}

function lastSampleTime(result: SimulationResult): number {
  return result.samples[result.samples.length - 1].timeSeconds;
}

describe('altitudeSeries', () => {
  const baseline = initialState().baseline;
  const series = altitudeSeries(baseline, BODY_RADIUS_KM);

  it('contains exactly one point per recorded sample, in physical kilometres', () => {
    expect(series.points.length).toBe(baseline.result.samples.length);

    series.points.forEach((point, index) => {
      const sample = baseline.result.samples[index];
      expect(point.timeSeconds).toBe(sample.timeSeconds);
      expect(point.altitudeKm).toBeCloseTo(
        magnitude(sample.state.positionKm) - BODY_RADIUS_KM,
        9,
      );
    });

    // The default scenario starts 400 km up; scene units (0.4) would be a bug.
    expect(series.points[0].altitudeKm).toBeCloseTo(400, 6);
    expect(series.points[0].altitudeKm).toBeGreaterThan(1);
  });

  it('carries the run status and the recorded end time', () => {
    expect(series.status).toBe('completed');
    expect(series.endedEarly).toBe(false);
    expect(series.lastRecordedTimeSeconds).toBe(lastSampleTime(baseline.result));
    expect(series.requestedDurationSeconds).toBe(baseline.result.durationSeconds);
  });

  it('never pads a shorter run to match another run', () => {
    const short = candidateFrom({ altitudeKm: 900, orbitCount: 1 });
    const baselineSeries = altitudeSeries(baseline, BODY_RADIUS_KM);
    const shortSeries = altitudeSeries(short, BODY_RADIUS_KM);

    expect(shortSeries.points.length).toBe(short.result.samples.length);
    expect(shortSeries.points.length).not.toBe(baselineSeries.points.length);
    expect(shortSeries.lastRecordedTimeSeconds).toBe(lastSampleTime(short.result));
    expect(baselineSeries.points.length).toBe(baseline.result.samples.length);
  });
});

describe('stopped runs', () => {
  const stopped = candidateFrom({ speedKmPerS: 5 });

  it('is a real stopped run from the engine', () => {
    expect(stopped.result.status).toBe('stopped');
    expect(stopped.result.stopReason).toBe('IMPACT_RADIUS_REACHED');
    expect(lastSampleTime(stopped.result)).toBeLessThan(stopped.result.durationSeconds);
  });

  it('ends the series at the last recorded sample with no fabricated continuation', () => {
    const series = altitudeSeries(stopped, BODY_RADIUS_KM);

    expect(series.endedEarly).toBe(true);
    expect(series.status).toBe('stopped');
    expect(series.points.length).toBe(stopped.result.samples.length);
    expect(series.lastRecordedTimeSeconds).toBe(lastSampleTime(stopped.result));
    // No point exists at the requested duration, so a curve cannot run to it.
    expect(series.points.some((point) => point.timeSeconds >= stopped.result.durationSeconds)).toBe(
      false,
    );
  });

  it('reports the recorded end, never the requested duration, as the final time', () => {
    const endpoints = runEndpoints(stopped.result, BODY_RADIUS_KM);

    expect(endpoints).not.toBeNull();
    expect(endpoints?.endedEarly).toBe(true);
    expect(endpoints?.finalRecordedTimeSeconds).toBe(lastSampleTime(stopped.result));
    expect(endpoints?.finalRecordedTimeSeconds).toBeLessThan(
      endpoints?.requestedDurationSeconds ?? 0,
    );
    expect(endpoints?.initialAltitudeKm).toBeCloseTo(400, 6);
  });

  it('reports a completed run as ending exactly at its requested duration', () => {
    const endpoints = runEndpoints(initialState().baseline.result, BODY_RADIUS_KM);

    expect(endpoints?.endedEarly).toBe(false);
    expect(endpoints?.finalRecordedTimeSeconds).toBe(endpoints?.requestedDurationSeconds);
  });
});

describe('commonComparisonPoint', () => {
  const baseline = initialState().baseline;
  const candidate = candidateFrom({ altitudeKm: 900 });

  it('uses the latest simulated time recorded by both runs', () => {
    const point = commonComparisonPoint(baseline.result, candidate.result, BODY_RADIUS_KM);

    expect(point).not.toBeNull();
    expect(point?.timeSeconds).toBe(
      Math.min(lastSampleTime(baseline.result), lastSampleTime(candidate.result)),
    );
  });

  it('derives every value from the matching engine samples', () => {
    // A circular candidate at 900 km: same altitude *and* the local circular
    // speed, which is what the workspace's "use circular speed" action produces.
    const circular = candidateFrom({
      altitudeKm: 900,
      speedKmPerS: circularOrbitalSpeedKmPerS(BODY_RADIUS_KM + 900, EARTH_MU_KM3_S2),
    });
    const point = commonComparisonPoint(baseline.result, circular.result, BODY_RADIUS_KM);
    if (!point) {
      throw new Error('Expected a common comparison point for these runs.');
    }

    const baselineSample = baseline.result.samples.find(
      (sample) => sample.timeSeconds === point.timeSeconds,
    );
    const candidateSample = circular.result.samples.find(
      (sample) => sample.timeSeconds === point.timeSeconds,
    );
    if (!baselineSample || !candidateSample) {
      throw new Error('The comparison point must come from recorded samples.');
    }

    expect(point.baseline.altitudeKm).toBeCloseTo(
      magnitude(baselineSample.state.positionKm) - BODY_RADIUS_KM,
      9,
    );
    expect(point.candidate.altitudeKm).toBeCloseTo(
      magnitude(candidateSample.state.positionKm) - BODY_RADIUS_KM,
      9,
    );
    expect(point.baseline.speedKmPerS).toBeCloseTo(
      magnitude(baselineSample.state.velocityKmPerS),
      9,
    );
    expect(point.delta.altitudeKm).toBeCloseTo(
      point.candidate.altitudeKm - point.baseline.altitudeKm,
      12,
    );
    expect(point.delta.speedKmPerS).toBeCloseTo(
      point.candidate.speedKmPerS - point.baseline.speedKmPerS,
      9,
    );
    expect(point.delta.specificEnergyKm2PerS2).toBeCloseTo(
      point.candidate.specificEnergyKm2PerS2 - point.baseline.specificEnergyKm2PerS2,
      12,
    );
    // Raising the orbit by 500 km raises the compared altitude by ~500 km.
    expect(point.delta.altitudeKm).toBeGreaterThan(490);
    expect(point.delta.altitudeKm).toBeLessThan(510);
  });

  it('compares runs of different duration at the longest shared recorded time', () => {
    const short = candidateFrom({ altitudeKm: 900, orbitCount: 1 });
    const point = commonComparisonPoint(short.result, baseline.result, BODY_RADIUS_KM);

    expect(point).not.toBeNull();
    expect(point?.timeSeconds).toBe(lastSampleTime(short.result));
    expect(point?.timeSeconds).toBeLessThan(lastSampleTime(baseline.result));
  });

  it('compares a stopped candidate only up to its last recorded sample', () => {
    const stopped = candidateFrom({ speedKmPerS: 5 });
    const point = commonComparisonPoint(baseline.result, stopped.result, BODY_RADIUS_KM);

    expect(point).not.toBeNull();
    expect(point?.timeSeconds).toBe(lastSampleTime(stopped.result));
    expect(point?.timeSeconds).toBeLessThan(stopped.result.durationSeconds);
  });

  it('reports unavailability instead of interpolating when no sample time is shared', () => {
    const disjoint: SimulationResult = {
      ...baseline.result,
      // A single sample on a grid that shares no timestamp with the baseline.
      samples: [
        { timeSeconds: 5, state: baseline.result.samples[0].state },
      ],
    };

    expect(commonComparisonPoint(baseline.result, disjoint, BODY_RADIUS_KM)).toBeNull();
    expect(commonComparisonPoint(disjoint, baseline.result, BODY_RADIUS_KM)).toBeNull();
  });

  it('shows a zero difference when the candidate reproduces the baseline', () => {
    const modified = runCandidate(editDraft(initialState(), { altitudeKm: 900 }));
    const restored = restoreDraftFromBaseline(modified);

    if (!restored.candidate) {
      throw new Error('Expected a restored candidate record.');
    }

    const point = commonComparisonPoint(
      restored.baseline.result,
      restored.candidate.result,
      BODY_RADIUS_KM,
    );

    if (!point) {
      throw new Error('Expected a common comparison point.');
    }

    expect(point.delta.altitudeKm).toBe(0);
    expect(point.delta.radiusKm).toBe(0);
    expect(point.delta.speedKmPerS).toBe(0);
    expect(point.delta.specificEnergyKm2PerS2).toBe(0);
    // Restoring changed the candidate, not the reference.
    expect(restored.baseline.inputs.altitudeKm).toBe(DEFAULT_SCENARIO_INPUTS.altitudeKm);
  });
});
