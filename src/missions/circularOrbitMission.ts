/**
 * Mission evaluation for the first math-first mission template.
 *
 * This module is framework-independent. It reads the engine's recorded samples
 * and the documented Earth constants; it never reads React state, scene
 * geometry, or user-entered success claims. A mission outcome is derived only
 * from a completed run's recorded trajectory and explicit numerical criteria.
 *
 * The template is an initial-condition design exercise, not an orbital transfer:
 *
 *   target radius  r = R_Earth + target altitude
 *   circular speed v = sqrt(mu_Earth / r)
 *   target period  T = 2 * PI * sqrt(r^3 / mu_Earth)
 *
 * The existing two-body model remains the sole source of trajectory state.
 * There is no thrust, fuel, mass, attitude, atmosphere, Earth rotation, or
 * operational flight-safety claim.
 */

import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MU_KM3_S2,
  circularOrbitalPeriodSeconds,
  circularOrbitalSpeedKmPerS,
  magnitude,
  type SimulationResult,
  type SimulationStatus,
  type SimulationWarningCode,
} from '../simulation';

/** User-facing mission identity. */
export const CIRCULAR_ORBIT_MISSION_NAME = 'Design a Stable Circular Earth Orbit';

/**
 * Target-altitude range for this LEO/MEO design exercise. The physics engine can
 * represent wider orbits, but this template deliberately keeps the target range
 * narrow enough for a two-orbit initial-state run to cover at least one target
 * period even when the initial altitude is at its minimum.
 */
export const MISSION_TARGET_ALTITUDE_MIN_KM = 250;
export const MISSION_TARGET_ALTITUDE_MAX_KM = 2_000;
export const MISSION_TARGET_ALTITUDE_DEFAULT_KM = 400;

/** Allowed deviation of every recorded altitude from the target altitude. */
export const MISSION_ALTITUDE_TOLERANCE_KM = 20;

/**
 * The recorded trajectory must never go below this altitude above the mean
 * Earth radius. This is a model/geometry clearance, not an atmospheric or
 * collision-risk analysis.
 */
export const MISSION_MIN_CLEARANCE_KM = 200;

/**
 * A trajectory with too few recorded states cannot demonstrate that the orbit
 * stayed inside the target window between sparse endpoints. The default run
 * records roughly 1,000 samples; this floor only rejects empty or degenerate
 * outputs.
 */
export const MISSION_MIN_USABLE_SAMPLES = 8;

/**
 * Mission runs use two reference periods of the *initial* state. With the
 * target range above and the supported minimum initial altitude, this always
 * covers at least one target period (the target period is at most about 1.44x
 * the shortest supported initial period).
 */
export const MISSION_RUN_ORBIT_COUNT = 2;

const EPSILON_SECONDS = 1e-6;
const EPSILON_KM = 1e-6;

export type MissionStatus = 'pass' | 'fail' | 'not-evaluable';
export type MissionCriterionStatus = 'pass' | 'fail' | 'not-evaluable';
export type MissionCriterionId = 'coverage' | 'altitude-window' | 'clearance';

export type MissionCriterion = {
  id: MissionCriterionId;
  label: string;
  status: MissionCriterionStatus;
  /** Plain-language statement of what was observed and why it passed/failed. */
  detail: string;
};

export type MissionEvaluation = {
  status: MissionStatus;
  /** Human-readable summary, never a hidden score. */
  reason: string;
  targetAltitudeKm: number;
  targetToleranceKm: number;
  minClearanceKm: number;
  targetRadiusKm: number | null;
  targetPeriodSeconds: number | null;
  targetCircularSpeedKmPerS: number | null;
  requiredDurationSeconds: number | null;
  evaluatedDurationSeconds: number | null;
  requestedDurationSeconds: number | null;
  recordedSampleCount: number;
  usableSampleCount: number;
  minAltitudeKm: number | null;
  maxAltitudeKm: number | null;
  altitudeSpanKm: number | null;
  runStatus: SimulationStatus | null;
  warningCount: number;
  warningCodes: SimulationWarningCode[];
  criteria: MissionCriterion[];
};

export type MissionEvaluationInput = {
  targetAltitudeKm: number;
  /** Null/undefined means no run has been supplied for evaluation. */
  result: SimulationResult | null | undefined;
};

/** True when the mission target is inside the documented template range. */
export function missionTargetIsValid(targetAltitudeKm: number): boolean {
  return (
    Number.isFinite(targetAltitudeKm) &&
    targetAltitudeKm >= MISSION_TARGET_ALTITUDE_MIN_KM &&
    targetAltitudeKm <= MISSION_TARGET_ALTITUDE_MAX_KM
  );
}

/**
 * Ideal circular starting conditions for a valid target. This is an input
 * suggestion derived from the documented formula; the evaluation still uses
 * the engine's recorded trajectory, not these numbers.
 */
export function idealCircularStartForMission(
  targetAltitudeKm: number,
): { altitudeKm: number; speedKmPerS: number } | null {
  if (!missionTargetIsValid(targetAltitudeKm)) {
    return null;
  }
  const radiusKm = EARTH_MEAN_RADIUS_KM + targetAltitudeKm;
  return {
    altitudeKm: targetAltitudeKm,
    speedKmPerS: circularOrbitalSpeedKmPerS(radiusKm, EARTH_MU_KM3_S2),
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteVec3(value: unknown): value is { x: number; y: number; z: number } {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as { x?: unknown; y?: unknown; z?: unknown };
  return (
    isFiniteNumber(candidate.x) &&
    isFiniteNumber(candidate.y) &&
    isFiniteNumber(candidate.z)
  );
}

function notEvaluableCriterion(
  id: MissionCriterionId,
  label: string,
  detail: string,
): MissionCriterion {
  return { id, label, status: 'not-evaluable', detail };
}

function criteriaForNoResult(reason: string): MissionCriterion[] {
  return [
    notEvaluableCriterion('coverage', 'Covers at least one target period', reason),
    notEvaluableCriterion('altitude-window', 'Stays inside the target-altitude window', reason),
    notEvaluableCriterion('clearance', 'Stays above the minimum clearance', reason),
  ];
}

function baseEvaluation(targetAltitudeKm: number): MissionEvaluation {
  return {
    status: 'not-evaluable',
    reason: '',
    targetAltitudeKm,
    targetToleranceKm: MISSION_ALTITUDE_TOLERANCE_KM,
    minClearanceKm: MISSION_MIN_CLEARANCE_KM,
    targetRadiusKm: null,
    targetPeriodSeconds: null,
    targetCircularSpeedKmPerS: null,
    requiredDurationSeconds: null,
    evaluatedDurationSeconds: null,
    requestedDurationSeconds: null,
    recordedSampleCount: 0,
    usableSampleCount: 0,
    minAltitudeKm: null,
    maxAltitudeKm: null,
    altitudeSpanKm: null,
    runStatus: null,
    warningCount: 0,
    warningCodes: [],
    criteria: criteriaForNoResult('No completed run result is available.'),
  };
}

function invalidTargetEvaluation(targetAltitudeKm: number): MissionEvaluation {
  const reason =
    `Not evaluable: target altitude must be a finite value between ` +
    `${MISSION_TARGET_ALTITUDE_MIN_KM} and ${MISSION_TARGET_ALTITUDE_MAX_KM} km ` +
    `(received ${String(targetAltitudeKm)}).`;
  const evaluation = baseEvaluation(targetAltitudeKm);
  evaluation.reason = reason;
  evaluation.criteria = criteriaForNoResult(reason);
  return evaluation;
}

/**
 * Evaluates a completed, recorded trajectory against the template's explicit
 * criteria. The function is deterministic and has no side effects.
 */
export function evaluateCircularOrbitMission({
  targetAltitudeKm,
  result,
}: MissionEvaluationInput): MissionEvaluation {
  if (!missionTargetIsValid(targetAltitudeKm)) {
    return invalidTargetEvaluation(targetAltitudeKm);
  }

  const targetRadiusKm = EARTH_MEAN_RADIUS_KM + targetAltitudeKm;
  const targetPeriodSeconds = circularOrbitalPeriodSeconds(
    targetRadiusKm,
    EARTH_MU_KM3_S2,
  );
  const targetCircularSpeedKmPerS = circularOrbitalSpeedKmPerS(
    targetRadiusKm,
    EARTH_MU_KM3_S2,
  );

  const evaluation = baseEvaluation(targetAltitudeKm);
  evaluation.targetRadiusKm = targetRadiusKm;
  evaluation.targetPeriodSeconds = targetPeriodSeconds;
  evaluation.targetCircularSpeedKmPerS = targetCircularSpeedKmPerS;
  evaluation.requiredDurationSeconds = targetPeriodSeconds;

  if (!result || typeof result !== 'object') {
    const reason = 'Not evaluable: no simulation result is available. Run the mission first.';
    evaluation.reason = reason;
    evaluation.criteria = criteriaForNoResult(reason);
    return evaluation;
  }

  evaluation.runStatus = result.status;
  evaluation.warningCount = Array.isArray(result.warnings) ? result.warnings.length : 0;
  evaluation.warningCodes = Array.isArray(result.warnings)
    ? result.warnings.map((warning) => warning.code)
    : [];
  evaluation.requestedDurationSeconds = isFiniteNumber(result.durationSeconds)
    ? result.durationSeconds
    : null;

  if (!result.centralBody || result.centralBody.id !== 'earth') {
    const reason =
      'Not evaluable: this mission requires an Earth-centered run; the supplied result is not Earth-centered.';
    evaluation.reason = reason;
    evaluation.criteria = criteriaForNoResult(reason);
    return evaluation;
  }

  if (!Array.isArray(result.samples)) {
    const reason = 'Not evaluable: the result does not contain a recorded sample array.';
    evaluation.reason = reason;
    evaluation.criteria = criteriaForNoResult(reason);
    return evaluation;
  }

  evaluation.recordedSampleCount = result.samples.length;

  if (result.samples.length === 0) {
    const reason = 'Not evaluable: the run recorded no samples.';
    evaluation.reason = reason;
    evaluation.criteria = criteriaForNoResult(reason);
    return evaluation;
  }

  let minAltitudeKm = Infinity;
  let maxAltitudeKm = -Infinity;
  let previousTimeSeconds = -Infinity;

  for (const sample of result.samples) {
    if (
      !sample ||
      !isFiniteNumber(sample.timeSeconds) ||
      sample.timeSeconds < 0 ||
      !sample.state ||
      !isFiniteVec3(sample.state.positionKm) ||
      !isFiniteVec3(sample.state.velocityKmPerS)
    ) {
      const reason =
        'Not evaluable: the recorded samples contain a missing, non-finite, or malformed state.';
      evaluation.reason = reason;
      evaluation.criteria = criteriaForNoResult(reason);
      return evaluation;
    }

    if (sample.timeSeconds < previousTimeSeconds) {
      const reason =
        'Not evaluable: recorded sample times are not in nondecreasing order, so the trajectory cannot be interpreted.';
      evaluation.reason = reason;
      evaluation.criteria = criteriaForNoResult(reason);
      return evaluation;
    }

    previousTimeSeconds = sample.timeSeconds;
    const altitudeKm = magnitude(sample.state.positionKm) - EARTH_MEAN_RADIUS_KM;
    minAltitudeKm = Math.min(minAltitudeKm, altitudeKm);
    maxAltitudeKm = Math.max(maxAltitudeKm, altitudeKm);
  }

  const lastSampleTimeSeconds = result.samples[result.samples.length - 1].timeSeconds;
  evaluation.usableSampleCount = result.samples.length;
  evaluation.evaluatedDurationSeconds = lastSampleTimeSeconds;
  evaluation.minAltitudeKm = minAltitudeKm;
  evaluation.maxAltitudeKm = maxAltitudeKm;
  evaluation.altitudeSpanKm = maxAltitudeKm - minAltitudeKm;

  if (
    !isFiniteNumber(result.completedDurationSeconds) ||
    !isFiniteNumber(result.sampleIntervalSeconds) ||
    result.completedDurationSeconds < 0 ||
    result.sampleIntervalSeconds <= 0 ||
    lastSampleTimeSeconds > result.completedDurationSeconds + EPSILON_SECONDS
  ) {
    const reason =
      'Not evaluable: the recorded sample times are inconsistent with the run metadata.';
    evaluation.reason = reason;
    evaluation.criteria = criteriaForNoResult(reason);
    return evaluation;
  }

  if (evaluation.usableSampleCount < MISSION_MIN_USABLE_SAMPLES) {
    const reason =
      `Not evaluable: only ${evaluation.usableSampleCount} usable samples were recorded; ` +
      `at least ${MISSION_MIN_USABLE_SAMPLES} are required to check the trajectory.`;
    evaluation.reason = reason;
    evaluation.criteria = criteriaForNoResult(reason);
    return evaluation;
  }

  const allowedMinKm = targetAltitudeKm - MISSION_ALTITUDE_TOLERANCE_KM;
  const allowedMaxKm = targetAltitudeKm + MISSION_ALTITUDE_TOLERANCE_KM;

  let coverageStatus: MissionCriterionStatus;
  let coverageDetail: string;

  if (result.status !== 'completed') {
    coverageStatus = 'not-evaluable';
    coverageDetail =
      `The run recorded ${lastSampleTimeSeconds.toFixed(1)} s before stopping; ` +
      'a completed run covering at least one target period is required.';
  } else if (lastSampleTimeSeconds + EPSILON_SECONDS < targetPeriodSeconds) {
    coverageStatus = 'not-evaluable';
    coverageDetail =
      `The recorded trajectory covers ${lastSampleTimeSeconds.toFixed(1)} s, ` +
      `shorter than the ${targetPeriodSeconds.toFixed(1)} s target period.`;
  } else {
    coverageStatus = 'pass';
    coverageDetail =
      `The recorded trajectory covers ${lastSampleTimeSeconds.toFixed(1)} s, ` +
      `at least the ${targetPeriodSeconds.toFixed(1)} s target period.`;
  }

  const coverageCriterion: MissionCriterion = {
    id: 'coverage',
    label: 'Covers at least one target period',
    status: coverageStatus,
    detail: coverageDetail,
  };

  const altitudeStatus: MissionCriterionStatus =
    coverageStatus === 'pass'
      ? evaluation.minAltitudeKm >= allowedMinKm - EPSILON_KM &&
        evaluation.maxAltitudeKm <= allowedMaxKm + EPSILON_KM
        ? 'pass'
        : 'fail'
      : 'not-evaluable';

  const altitudeDetail =
    coverageStatus !== 'pass'
      ? 'Not assessed because the run does not cover the required target period.'
      : altitudeStatus === 'pass'
        ? `Recorded altitude range ${evaluation.minAltitudeKm.toFixed(1)}–${evaluation.maxAltitudeKm.toFixed(1)} km ` +
          `is inside the allowed ${allowedMinKm.toFixed(1)}–${allowedMaxKm.toFixed(1)} km window.`
        : `Recorded altitude range ${evaluation.minAltitudeKm.toFixed(1)}–${evaluation.maxAltitudeKm.toFixed(1)} km ` +
          `is outside the allowed ${allowedMinKm.toFixed(1)}–${allowedMaxKm.toFixed(1)} km window ` +
          `(target ${targetAltitudeKm.toFixed(1)} km ± ${MISSION_ALTITUDE_TOLERANCE_KM} km).`;

  const altitudeCriterion: MissionCriterion = {
    id: 'altitude-window',
    label: 'Stays inside the target-altitude window',
    status: altitudeStatus,
    detail: altitudeDetail,
  };

  const clearanceStatus: MissionCriterionStatus =
    coverageStatus === 'pass'
      ? evaluation.minAltitudeKm >= MISSION_MIN_CLEARANCE_KM - EPSILON_KM
        ? 'pass'
        : 'fail'
      : 'not-evaluable';

  const clearanceDetail =
    coverageStatus !== 'pass'
      ? 'Not assessed because the run does not cover the required target period.'
      : clearanceStatus === 'pass'
        ? `Minimum recorded altitude ${evaluation.minAltitudeKm.toFixed(1)} km is at or above the ` +
          `${MISSION_MIN_CLEARANCE_KM.toFixed(1)} km clearance limit.`
        : `Minimum recorded altitude ${evaluation.minAltitudeKm.toFixed(1)} km is below the ` +
          `${MISSION_MIN_CLEARANCE_KM.toFixed(1)} km clearance limit.`;

  const clearanceCriterion: MissionCriterion = {
    id: 'clearance',
    label: 'Stays above the minimum clearance',
    status: clearanceStatus,
    detail: clearanceDetail,
  };

  evaluation.criteria = [coverageCriterion, altitudeCriterion, clearanceCriterion];

  if (coverageStatus === 'not-evaluable') {
    evaluation.status = 'not-evaluable';
    evaluation.reason = `Not evaluable: ${coverageDetail}`;
    return evaluation;
  }

  const failedCriteria = evaluation.criteria.filter(
    (criterion) => criterion.status === 'fail',
  );

  if (failedCriteria.length > 0) {
    evaluation.status = 'fail';
    evaluation.reason =
      `Fail: ${failedCriteria.map((criterion) => criterion.label.toLowerCase()).join('; ')}. ` +
      `${failedCriteria.map((criterion) => criterion.detail).join(' ')}`;
    return evaluation;
  }

  evaluation.status = 'pass';
  evaluation.reason =
    `Pass: the recorded trajectory covers ${lastSampleTimeSeconds.toFixed(1)} s, ` +
    `stays inside ${targetAltitudeKm.toFixed(1)} ± ${MISSION_ALTITUDE_TOLERANCE_KM} km, ` +
    `and never drops below the ${MISSION_MIN_CLEARANCE_KM.toFixed(1)} km clearance limit.`;
  return evaluation;
}
