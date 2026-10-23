/**
 * Mission evaluator tests driven by the real two-body engine.
 *
 * The expected pass/fail behavior is derived from the documented circular-orbit
 * formulas and actual recorded trajectories. The tests do not mirror evaluator
 * branches with hand-built success claims.
 */

import { describe, expect, it } from 'vitest';

import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MU_KM3_S2,
  circularOrbitalSpeedKmPerS,
  runSimulation,
  type SimulationResult,
} from '../../simulation';
import {
  DEFAULT_SCENARIO_INPUTS,
  buildScenarioConfig,
  type ScenarioInputs,
} from '../../scenarios/scenarioInputs';
import {
  MISSION_MIN_CLEARANCE_KM,
  MISSION_TARGET_ALTITUDE_DEFAULT_KM,
  evaluateCircularOrbitMission,
  idealCircularStartForMission,
  missionTargetIsValid,
} from '..';

const TARGET_ALTITUDE_KM = MISSION_TARGET_ALTITUDE_DEFAULT_KM;
const TIMESTEP_SECONDS = 10;

function circularSpeedAtAltitude(altitudeKm: number): number {
  return circularOrbitalSpeedKmPerS(
    EARTH_MEAN_RADIUS_KM + altitudeKm,
    EARTH_MU_KM3_S2,
  );
}

function missionInputs(
  altitudeKm: number,
  speedFactor = 1,
  orbitCount = 2,
): ScenarioInputs {
  return {
    altitudeKm,
    speedKmPerS: circularSpeedAtAltitude(altitudeKm) * speedFactor,
    orbitCount,
    timestepSeconds: TIMESTEP_SECONDS,
  };
}

function runInputs(inputs: ScenarioInputs): SimulationResult {
  const result = runSimulation(buildScenarioConfig(inputs));
  return result;
}

function cloneResult(result: SimulationResult): SimulationResult {
  return {
    ...result,
    warnings: result.warnings.map((warning) => ({ ...warning })),
    samples: result.samples.map((sample) => ({
      timeSeconds: sample.timeSeconds,
      state: {
        positionKm: { ...sample.state.positionKm },
        velocityKmPerS: { ...sample.state.velocityKmPerS },
      },
    })),
  };
}

describe('circular orbit mission target', () => {
  it('validates the documented target range and derives ideal circular values', () => {
    expect(missionTargetIsValid(MISSION_TARGET_ALTITUDE_DEFAULT_KM)).toBe(true);
    expect(missionTargetIsValid(Number.NaN)).toBe(false);
    expect(missionTargetIsValid(249)).toBe(false);
    expect(missionTargetIsValid(2_001)).toBe(false);

    const ideal = idealCircularStartForMission(400);
    expect(ideal).not.toBeNull();
    expect(ideal?.altitudeKm).toBe(400);
    expect(ideal?.speedKmPerS).toBeCloseTo(circularSpeedAtAltitude(400), 12);
    expect(idealCircularStartForMission(100)).toBeNull();
  });
});

describe('evaluateCircularOrbitMission', () => {
  it('passes an ideal near-circular run that covers at least one target period', () => {
    const result = runInputs(missionInputs(400, 1, 2));
    const evaluation = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result,
    });

    expect(result.status).toBe('completed');
    expect(evaluation.status).toBe('pass');
    expect(evaluation.targetPeriodSeconds).toBeGreaterThan(0);
    expect(evaluation.evaluatedDurationSeconds).toBeGreaterThanOrEqual(
      evaluation.targetPeriodSeconds ?? Number.POSITIVE_INFINITY,
    );
    expect(evaluation.usableSampleCount).toBeGreaterThan(100);
    expect(evaluation.minAltitudeKm).toBeGreaterThanOrEqual(
      TARGET_ALTITUDE_KM - 20,
    );
    expect(evaluation.maxAltitudeKm).toBeLessThanOrEqual(
      TARGET_ALTITUDE_KM + 20,
    );
    expect(evaluation.criteria.every((criterion) => criterion.status === 'pass')).toBe(true);
  });

  it.each([
    ['too slow', 0.99],
    ['too fast', 1.01],
  ])(
    'fails a completed but non-circular trajectory for %s initial speed',
    (_label, speedFactor) => {
      const result = runInputs(missionInputs(400, speedFactor, 2));
      const evaluation = evaluateCircularOrbitMission({
        targetAltitudeKm: TARGET_ALTITUDE_KM,
        result,
      });

      expect(result.status).toBe('completed');
      expect(evaluation.status).toBe('fail');
      const altitudeCriterion = evaluation.criteria.find(
        (criterion) => criterion.id === 'altitude-window',
      );
      expect(altitudeCriterion?.status).toBe('fail');
      expect(evaluation.minAltitudeKm).not.toBeNull();
      expect(evaluation.maxAltitudeKm).not.toBeNull();
    },
  );

  it('fails a completed trajectory that violates the minimum clearance', () => {
    const result = runInputs(missionInputs(300, 0.995, 2));
    const evaluation = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result,
    });

    expect(result.status).toBe('completed');
    expect(evaluation.status).toBe('fail');
    const clearanceCriterion = evaluation.criteria.find(
      (criterion) => criterion.id === 'clearance',
    );
    expect(clearanceCriterion?.status).toBe('fail');
    expect(evaluation.minAltitudeKm).toBeLessThan(MISSION_MIN_CLEARANCE_KM);
  });

  it('rejects invalid target values without inventing a result', () => {
    const result = runInputs(missionInputs(400, 1, 2));

    for (const targetAltitudeKm of [Number.NaN, Number.POSITIVE_INFINITY, 100, 3_000]) {
      const evaluation = evaluateCircularOrbitMission({
        targetAltitudeKm,
        result,
      });
      expect(evaluation.status).toBe('not-evaluable');
      expect(evaluation.targetPeriodSeconds).toBeNull();
      expect(evaluation.criteria.every((criterion) => criterion.status === 'not-evaluable')).toBe(
        true,
      );
      expect(evaluation.reason.length).toBeGreaterThan(0);
    }
  });

  it('is not evaluable when the result is missing, empty, or malformed', () => {
    const result = runInputs(missionInputs(400, 1, 2));

    const missing = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result: null,
    });
    expect(missing.status).toBe('not-evaluable');

    const empty = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result: { ...result, samples: [] },
    });
    expect(empty.status).toBe('not-evaluable');
    expect(empty.recordedSampleCount).toBe(0);

    const oneSample = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result: { ...result, samples: result.samples.slice(0, 1) },
    });
    expect(oneSample.status).toBe('not-evaluable');

    const nonFinite = cloneResult(result);
    nonFinite.samples[3] = {
      ...nonFinite.samples[3],
      state: {
        ...nonFinite.samples[3].state,
        positionKm: {
          ...nonFinite.samples[3].state.positionKm,
          x: Number.NaN,
        },
      },
    };
    const malformed = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result: nonFinite,
    });
    expect(malformed.status).toBe('not-evaluable');
    expect(malformed.minAltitudeKm).toBeNull();
  });

  it('is not evaluable for a stopped run', () => {
    const result = runInputs({
      ...DEFAULT_SCENARIO_INPUTS,
      altitudeKm: 400,
      speedKmPerS: 0.5,
      orbitCount: 2,
    });

    expect(result.status).toBe('stopped');
    const evaluation = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result,
    });
    expect(evaluation.status).toBe('not-evaluable');
    expect(evaluation.runStatus).toBe('stopped');
    expect(
      evaluation.criteria.find((criterion) => criterion.id === 'coverage')?.status,
    ).toBe('not-evaluable');
  });

  it('is not evaluable when the completed run is shorter than one target period', () => {
    const result = runInputs(missionInputs(400, 1, 0.5));
    const evaluation = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result,
    });

    expect(result.status).toBe('completed');
    expect(evaluation.status).toBe('not-evaluable');
    expect(evaluation.reason).toMatch(/shorter than/i);
    expect(evaluation.evaluatedDurationSeconds).toBeLessThan(
      evaluation.targetPeriodSeconds ?? Number.POSITIVE_INFINITY,
    );
  });

  it('does not accept recorded coverage that ends before the target period', () => {
    const result = cloneResult(runInputs(missionInputs(400, 1, 2)));
    const targetPeriod = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result,
    }).targetPeriodSeconds;
    expect(targetPeriod).not.toBeNull();
    const truncated = cloneResult(result);
    truncated.samples = truncated.samples.filter(
      (sample) => sample.timeSeconds < (targetPeriod ?? 0) / 2,
    );
    truncated.completedDurationSeconds = result.completedDurationSeconds;

    const evaluation = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result: truncated,
    });
    expect(evaluation.status).toBe('not-evaluable');
    expect(evaluation.criteria[0].status).toBe('not-evaluable');
  });

  it('is deterministic for repeated evaluation of the same result', () => {
    const result = runInputs(missionInputs(400, 1.01, 2));
    const first = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result,
    });
    const second = evaluateCircularOrbitMission({
      targetAltitudeKm: TARGET_ALTITUDE_KM,
      result,
    });
    expect(second).toEqual(first);
  });
});
