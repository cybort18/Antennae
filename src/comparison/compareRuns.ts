/**
 * Comparison math over recorded engine samples.
 *
 * Everything here reads `SimulationResult.samples` (kilometres, seconds) and the
 * engine's own derived-metric utilities. Nothing interpolates, extrapolates, or
 * resamples: series keep exactly the recorded samples of their own run, so a
 * stopped run is never extended and a run is never padded to match another one.
 *
 * Scene/display units are not used anywhere in this module; altitude is computed
 * in physical kilometres against the reference body radius.
 */

import {
  magnitude,
  specificOrbitalEnergyKm2PerS2,
  type SimulationResult,
  type SimulationSample,
  type SimulationStatus,
  type SimulationWarningCode,
} from '../simulation';
import type { ScenarioRecord } from './records';

/** Quantizes timestamps to microseconds so grid matching is not float-fragile. */
const TIME_KEY_SCALE = 1e6;
const TIME_EPSILON_SECONDS = 1e-9;

function timeKey(timeSeconds: number): number {
  return Math.round(timeSeconds * TIME_KEY_SCALE);
}

function lastSampleTime(result: SimulationResult): number {
  const last = result.samples[result.samples.length - 1];
  return last ? last.timeSeconds : 0;
}

export type AltitudePoint = {
  timeSeconds: number;
  altitudeKm: number;
};

export type AltitudeSeries = {
  role: ScenarioRecord['role'];
  points: AltitudePoint[];
  /** Simulated time of the last recorded sample — never a requested duration. */
  lastRecordedTimeSeconds: number;
  requestedDurationSeconds: number;
  status: SimulationStatus;
  stopReason: SimulationWarningCode | null;
  /** True when the engine stopped before the requested duration. */
  endedEarly: boolean;
};

/** Altitude above the reference body radius at each recorded sample. */
export function altitudeSeries(record: ScenarioRecord, bodyRadiusKm: number): AltitudeSeries {
  const { result } = record;
  const points = result.samples.map((sample) => ({
    timeSeconds: sample.timeSeconds,
    altitudeKm: magnitude(sample.state.positionKm) - bodyRadiusKm,
  }));

  const lastRecordedTimeSeconds = lastSampleTime(result);

  return {
    role: record.role,
    points,
    lastRecordedTimeSeconds,
    requestedDurationSeconds: result.durationSeconds,
    status: result.status,
    stopReason: result.stopReason ?? null,
    endedEarly:
      result.status === 'stopped' ||
      lastRecordedTimeSeconds < result.durationSeconds - TIME_EPSILON_SECONDS,
  };
}

export type RunEndpoints = {
  initialAltitudeKm: number;
  finalRecordedAltitudeKm: number;
  finalRecordedTimeSeconds: number;
  requestedDurationSeconds: number;
  status: SimulationStatus;
  stopReason: SimulationWarningCode | null;
  endedEarly: boolean;
  sampleCount: number;
};

/**
 * First and last recorded values of one run. `finalRecordedTimeSeconds` is the
 * last sample the engine actually recorded; it is deliberately never reported as
 * the requested duration (a stopped run would then look complete).
 */
export function runEndpoints(result: SimulationResult, bodyRadiusKm: number): RunEndpoints | null {
  const first = result.samples[0];
  const last = result.samples[result.samples.length - 1];

  if (!first || !last) {
    return null;
  }

  const finalRecordedTimeSeconds = last.timeSeconds;

  return {
    initialAltitudeKm: magnitude(first.state.positionKm) - bodyRadiusKm,
    finalRecordedAltitudeKm: magnitude(last.state.positionKm) - bodyRadiusKm,
    finalRecordedTimeSeconds,
    requestedDurationSeconds: result.durationSeconds,
    status: result.status,
    stopReason: result.stopReason ?? null,
    endedEarly:
      result.status === 'stopped' ||
      finalRecordedTimeSeconds < result.durationSeconds - TIME_EPSILON_SECONDS,
    sampleCount: result.samples.length,
  };
}

export type SampleState = {
  altitudeKm: number;
  radiusKm: number;
  speedKmPerS: number;
  specificEnergyKm2PerS2: number;
};

function sampleState(
  sample: SimulationSample,
  gravitationalParameterKm3PerS2: number,
  bodyRadiusKm: number,
): SampleState {
  const radiusKm = magnitude(sample.state.positionKm);
  return {
    altitudeKm: radiusKm - bodyRadiusKm,
    radiusKm,
    speedKmPerS: magnitude(sample.state.velocityKmPerS),
    specificEnergyKm2PerS2: specificOrbitalEnergyKm2PerS2(
      sample.state,
      gravitationalParameterKm3PerS2,
    ),
  };
}

export type SampleComparison = {
  /** Simulated time of a sample recorded by both runs. */
  timeSeconds: number;
  baseline: SampleState;
  candidate: SampleState;
  /** Candidate minus baseline at that common sample. */
  delta: {
    altitudeKm: number;
    radiusKm: number;
    speedKmPerS: number;
    specificEnergyKm2PerS2: number;
  };
};

/**
 * Largest simulated time at which both runs recorded a sample.
 *
 * Only exact timestamp matches count (quantized to microseconds to absorb binary
 * representation noise); no value is interpolated between samples, so a
 * comparison is either available at a real recorded time or reported as
 * unavailable (null).
 */
export function commonComparisonPoint(
  baselineResult: SimulationResult,
  candidateResult: SimulationResult,
  bodyRadiusKm: number,
): SampleComparison | null {
  if (baselineResult.samples.length === 0 || candidateResult.samples.length === 0) {
    return null;
  }

  const candidateByTime = new Map<number, SimulationSample>();
  for (const sample of candidateResult.samples) {
    candidateByTime.set(timeKey(sample.timeSeconds), sample);
  }

  const limit =
    Math.min(lastSampleTime(baselineResult), lastSampleTime(candidateResult)) +
    TIME_EPSILON_SECONDS;

  for (let index = baselineResult.samples.length - 1; index >= 0; index -= 1) {
    const sample = baselineResult.samples[index];

    if (sample.timeSeconds > limit) {
      continue;
    }

    const matching = candidateByTime.get(timeKey(sample.timeSeconds));

    if (!matching) {
      continue;
    }

    const baseline = sampleState(
      sample,
      baselineResult.centralBody.gravitationalParameterKm3PerS2,
      bodyRadiusKm,
    );
    const candidate = sampleState(
      matching,
      candidateResult.centralBody.gravitationalParameterKm3PerS2,
      bodyRadiusKm,
    );

    return {
      timeSeconds: sample.timeSeconds,
      baseline,
      candidate,
      delta: {
        altitudeKm: candidate.altitudeKm - baseline.altitudeKm,
        radiusKm: candidate.radiusKm - baseline.radiusKm,
        speedKmPerS: candidate.speedKmPerS - baseline.speedKmPerS,
        specificEnergyKm2PerS2:
          candidate.specificEnergyKm2PerS2 - baseline.specificEnergyKm2PerS2,
      },
    };
  }

  return null;
}
