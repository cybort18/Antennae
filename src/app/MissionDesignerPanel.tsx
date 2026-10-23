/**
 * Mission Designer panel for the first math-first mission template.
 *
 * The panel edits a target altitude and the existing supported starting
 * conditions. It never computes a trajectory: the outcome shown here is the
 * domain evaluator's deterministic reading of the last recorded engine run.
 */

import { Button, Chip, Panel } from '../components/ui';
import { NumberField } from '../components/NumberField';
import type { CandidateRunState, ScenarioRecord } from '../comparison/records';
import {
  CIRCULAR_ORBIT_MISSION_NAME,
  MISSION_ALTITUDE_TOLERANCE_KM,
  MISSION_MIN_CLEARANCE_KM,
  MISSION_RUN_ORBIT_COUNT,
  MISSION_TARGET_ALTITUDE_MAX_KM,
  MISSION_TARGET_ALTITUDE_MIN_KM,
  idealCircularStartForMission,
  missionTargetIsValid,
  type MissionCriterion,
  type MissionEvaluation,
} from '../missions';
import { formatClock, formatInteger, formatNumber, UNAVAILABLE } from '../results/format';
import { describeWarning } from '../results/labels';
import {
  INPUT_LIMITS,
  describeScenarioInputs,
  type ScenarioInputs,
  type ScenarioReference,
} from '../scenarios/scenarioInputs';
import { EARTH_MEAN_RADIUS_KM, EARTH_MU_KM3_S2, type ValidationIssue } from '../simulation';

export type MissionDesignerPanelProps = {
  /** Mission target, separate from the runnable initial conditions. */
  targetAltitudeKm: number;
  onTargetAltitudeChange: (targetAltitudeKm: number) => void;
  draft: ScenarioInputs;
  draftReference: ScenarioReference;
  draftIssues: ValidationIssue[];
  onChange: (patch: Partial<ScenarioInputs>) => void;
  onRunMission: () => void;
  onSetIdealStart: () => void;
  evaluation: MissionEvaluation;
  /** Candidate when present, otherwise the baseline reference. */
  evaluatedRecord: ScenarioRecord | null;
  candidate: ScenarioRecord | null;
  candidateRunState: CandidateRunState;
};

const STATUS_LABEL: Record<MissionEvaluation['status'], string> = {
  pass: 'PASS',
  fail: 'FAIL',
  'not-evaluable': 'NOT EVALUABLE',
};

const CRITERION_LABEL: Record<MissionCriterion['status'], string> = {
  pass: 'PASS',
  fail: 'FAIL',
  'not-evaluable': 'NOT EVALUABLE',
};

function criterionTone(status: MissionCriterion['status']): 'ok' | 'danger' | 'warn' {
  if (status === 'pass') {
    return 'ok';
  }
  if (status === 'fail') {
    return 'danger';
  }
  return 'warn';
}

function recordLabel(record: ScenarioRecord | null, candidate: ScenarioRecord | null): string {
  if (!record) {
    return 'No recorded run';
  }
  if (record.role === 'candidate') {
    return 'Evaluated run: Candidate';
  }
  return candidate ? 'Evaluated run: Baseline' : 'Evaluated run: Baseline reference';
}

function runStatusText(evaluation: MissionEvaluation): string {
  if (!evaluation.runStatus) {
    return UNAVAILABLE;
  }
  return evaluation.runStatus === 'completed' ? 'Completed' : 'Stopped';
}

function targetText(targetAltitudeKm: number): string {
  return missionTargetIsValid(targetAltitudeKm)
    ? `${formatNumber(targetAltitudeKm, 1)} km`
    : `${String(targetAltitudeKm)} (invalid)`;
}

export function MissionDesignerPanel({
  targetAltitudeKm,
  onTargetAltitudeChange,
  draft,
  draftReference,
  draftIssues,
  onChange,
  onRunMission,
  onSetIdealStart,
  evaluation,
  evaluatedRecord,
  candidate,
  candidateRunState,
}: MissionDesignerPanelProps) {
  const targetValid = missionTargetIsValid(targetAltitudeKm);
  const idealStart = idealCircularStartForMission(targetAltitudeKm);
  const targetWindowMinKm = targetAltitudeKm - MISSION_ALTITUDE_TOLERANCE_KM;
  const targetWindowMaxKm = targetAltitudeKm + MISSION_ALTITUDE_TOLERANCE_KM;
  const targetPeriodSeconds = evaluation.targetPeriodSeconds;
  const coverageShort =
    targetPeriodSeconds !== null &&
    draftReference.durationSeconds + 1e-6 < targetPeriodSeconds;

  const warnings = evaluatedRecord?.result.warnings ?? [];
  const evaluatedParams = evaluatedRecord
    ? describeScenarioInputs(evaluatedRecord.inputs)
    : 'No recorded parameters.';

  return (
    <Panel
      title="Mission Designer"
      subtitle="Objective-driven run of the same two-body engine"
      className="mission-panel"
    >
      <div className="mission-objective">
        <div className="mission-objective__tags">
          <span className="mission-kicker">Mission Template</span>
          <span className="mission-objective__tag">Two-Body LEO/MEO</span>
        </div>
        <h3 id="mission-designer-title" className="mission-title" tabIndex={-1}>
          {CIRCULAR_ORBIT_MISSION_NAME}
        </h3>
        <p className="mission-copy">
          Configure initial speed and altitude to establish a stable circular orbit at your target altitude.
        </p>
        <div className="mission-rule" aria-label="Pass rule">
          <span className="mission-rule__badge">Pass rule</span>
          <span className="mission-rule__text">
            Completed run · coverage ≥ 1 target period · target ± {MISSION_ALTITUDE_TOLERANCE_KM} km · clearance ≥ {MISSION_MIN_CLEARANCE_KM} km
          </span>
        </div>
      </div>

      <div className="mission-controls">
        <div className="mission-controls__group">
          <div className="mission-controls__header">
            <label htmlFor="mission-target-altitude" className="mission-group-title">
              1. Target Altitude
            </label>
            <button
              type="button"
              aria-label="Use ideal circular start"
              className="mission-helper-link"
              onClick={onSetIdealStart}
              disabled={!idealStart}
              title="Set initial altitude to the target and calculate theoretical circular velocity"
            >
              <span aria-hidden="true">⟳ </span>Use ideal circular start
            </button>
          </div>

          <NumberField
            id="mission-target-altitude"
            label="Target altitude"
            unit="km"
            value={targetAltitudeKm}
            min={MISSION_TARGET_ALTITUDE_MIN_KM}
            max={MISSION_TARGET_ALTITUDE_MAX_KM}
            step={10}
            onCommit={onTargetAltitudeChange}
            hint={`Allowed target range: ${MISSION_TARGET_ALTITUDE_MIN_KM}–${MISSION_TARGET_ALTITUDE_MAX_KM} km.`}
          />

          {!targetValid ? (
            <p className="note note--attention" role="alert">
              Target altitude is outside the template range. The mission is NOT EVALUABLE until the
              target is corrected.
            </p>
          ) : null}
        </div>

        <div className="mission-controls__group">
          <span className="mission-group-title">2. Starting Conditions</span>
          <div className="mission-controls__pair">
            <NumberField
              id="mission-initial-altitude"
              label="Initial altitude"
              unit="km"
              value={draft.altitudeKm}
              min={INPUT_LIMITS.altitudeKm.min}
              max={INPUT_LIMITS.altitudeKm.max}
              step={10}
              onCommit={(altitudeKm) => onChange({ altitudeKm })}
            />
            <NumberField
              id="mission-initial-speed"
              label="Initial speed"
              unit="km/s"
              value={draft.speedKmPerS}
              min={INPUT_LIMITS.speedKmPerS.min}
              max={INPUT_LIMITS.speedKmPerS.max}
              step={0.01}
              onCommit={(speedKmPerS) => onChange({ speedKmPerS })}
            />
          </div>
          <div className="mission-reference-hint">
            <span>Ideal circular speed: <strong>{formatNumber(draftReference.circularSpeedKmPerS, 3)} km/s</strong></span>
            <span>Draft window: {draft.orbitCount} orbits ({formatNumber(draftReference.durationSeconds, 0)} s)</span>
          </div>
        </div>

        <div className="mission-actions">
          <div className="mission-run">
            <Button
              variant="primary"
              onClick={onRunMission}
              title={
                draftIssues.length > 0
                  ? 'These starting conditions are outside the supported range; the run will report validation messages and leave the previous record unchanged'
                  : 'Integrate these starting conditions with the same engine and evaluate the recorded trajectory'
              }
            >
              Run Mission
            </Button>
          </div>

          {candidateRunState === 'unrun-changes' ? (
            <div className="mission-unrun-alert">
              <span className="mission-unrun-dot" aria-hidden="true" />
              <span>Starting conditions changed. Click Run Mission to evaluate.</span>
            </div>
          ) : null}

          {coverageShort ? (
            <p className="note note--attention">
              The current draft window ({formatNumber(draftReference.durationSeconds, 0)} s) is shorter
              than one target period ({formatNumber(targetPeriodSeconds, 0)} s). Run Mission extends
              the window to at least {MISSION_RUN_ORBIT_COUNT} initial orbit periods before
              integrating.
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={`mission-outcome mission-outcome--${evaluation.status}`}
        data-testid="mission-outcome"
        data-status={evaluation.status}
        role="status"
        aria-live="polite"
      >
        <div className="mission-outcome__head">
          <div className="mission-outcome__badge-group">
            <span className="mission-outcome__status">{STATUS_LABEL[evaluation.status]}</span>
            <span className="mission-outcome__record">
              {recordLabel(evaluatedRecord, candidate)}
            </span>
          </div>
          {candidateRunState === 'unrun-changes' ? (
            <span className="mission-outcome__pending-tag">Unrun changes</span>
          ) : null}
        </div>
        <p className="mission-outcome__reason">{evaluation.reason}</p>
        {evaluatedRecord ? (
          <p className="mission-outcome__params">{evaluatedParams}</p>
        ) : null}
      </div>

      <section className="mission-criteria" aria-labelledby="mission-criteria-title">
        <div className="mission-criteria__heading-row">
          <h4 id="mission-criteria-title" className="mission-section-title">
            Criteria
          </h4>
          <span className="mission-criteria__tally">
            {evaluation.criteria.filter((c) => c.status === 'pass').length} of {evaluation.criteria.length} passed
          </span>
        </div>
        <details className="mission-details mission-criteria-details" open={evaluation.status === 'fail'}>
          <summary>Criterion breakdown & evidence</summary>
          <ul className="mission-criteria__list">
            {evaluation.criteria.map((criterion) => (
              <li key={criterion.id} className={`mission-criterion mission-criterion--${criterion.status}`}>
                <div className="mission-criterion__head">
                  <span className="mission-criterion__label">{criterion.label}</span>
                  <Chip tone={criterionTone(criterion.status)}>
                    {CRITERION_LABEL[criterion.status]}
                  </Chip>
                </div>
                <p className="mission-criterion__detail">{criterion.detail}</p>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <details className="mission-details">
        <summary>Computed metrics</summary>
        <dl className="mission-stats">
          <div>
            <dt>Target altitude</dt>
            <dd>{targetText(targetAltitudeKm)}</dd>
          </div>
          <div>
            <dt>Allowed window</dt>
            <dd>
              {targetValid
                ? `${formatNumber(targetWindowMinKm, 1)}–${formatNumber(targetWindowMaxKm, 1)} km`
                : UNAVAILABLE}
            </dd>
          </div>
          <div>
            <dt>Ideal circular speed</dt>
            <dd>
              {evaluation.targetCircularSpeedKmPerS === null
                ? UNAVAILABLE
                : `${formatNumber(evaluation.targetCircularSpeedKmPerS, 4)} km/s`}
            </dd>
          </div>
          <div>
            <dt>Target period</dt>
            <dd>
              {targetPeriodSeconds === null
                ? UNAVAILABLE
                : `${formatNumber(targetPeriodSeconds, 1)} s`}
            </dd>
          </div>
          <div>
            <dt>Evaluation duration</dt>
            <dd>
              {evaluation.evaluatedDurationSeconds === null
                ? UNAVAILABLE
                : `${formatNumber(evaluation.evaluatedDurationSeconds, 1)} s`}
            </dd>
          </div>
          <div>
            <dt>Required coverage</dt>
            <dd>
              {evaluation.requiredDurationSeconds === null
                ? UNAVAILABLE
                : `${formatNumber(evaluation.requiredDurationSeconds, 1)} s`}
            </dd>
          </div>
          <div>
            <dt>Altitude min / max</dt>
            <dd>
              {evaluation.minAltitudeKm === null || evaluation.maxAltitudeKm === null
                ? UNAVAILABLE
                : `${formatNumber(evaluation.minAltitudeKm, 1)} / ${formatNumber(evaluation.maxAltitudeKm, 1)} km`}
            </dd>
          </div>
          <div>
            <dt>Altitude span</dt>
            <dd>
              {evaluation.altitudeSpanKm === null
                ? UNAVAILABLE
                : `${formatNumber(evaluation.altitudeSpanKm, 1)} km`}
            </dd>
          </div>
          <div>
            <dt>Usable samples</dt>
            <dd>
              {formatInteger(evaluation.usableSampleCount)} of{' '}
              {formatInteger(evaluation.recordedSampleCount)}
            </dd>
          </div>
          <div>
            <dt>Run status</dt>
            <dd>{runStatusText(evaluation)}</dd>
          </div>
          <div>
            <dt>Warnings</dt>
            <dd>{formatInteger(evaluation.warningCount)}</dd>
          </div>
          <div>
            <dt>Target period (clock)</dt>
            <dd>
              {targetPeriodSeconds === null ? UNAVAILABLE : formatClock(targetPeriodSeconds)}
            </dd>
          </div>
        </dl>
        <p className="note">
          Altitude span is max − min. The ±{MISSION_ALTITUDE_TOLERANCE_KM} km window permits a span
          of at most {MISSION_ALTITUDE_TOLERANCE_KM * 2} km; span is reported for context and is not
          a separate pass condition.
        </p>
      </details>

      <details className="mission-details">
        <summary>Run record, warnings & validation</summary>
        <p className="note">{evaluatedParams}</p>
        {warnings.length === 0 ? (
          <p className="note">No warnings were recorded for this run.</p>
        ) : (
          <ul className="warnings">
            {warnings.map((warning) => (
              <li key={`${warning.code}:${warning.timeSeconds}`}>
                <Chip tone="warn">{describeWarning(warning.code)}</Chip>
                <span className="warnings__time">t = {formatNumber(warning.timeSeconds, 1)} s</span>
                <p className="warnings__message">{warning.message}</p>
              </li>
            ))}
          </ul>
        )}
        {draftIssues.length > 0 ? (
          <ul className="issues" role="alert">
            {draftIssues.map((issue) => (
              <li key={`${issue.field}:${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        ) : (
          <p className="note">Current starting conditions pass the engine input validation.</p>
        )}
      </details>

      <details className="mission-details">
        <summary>Method, thresholds, units & limitations</summary>
        <dl className="notice">
          <dt>Target radius</dt>
          <dd>
            r = Earth mean radius + target altitude = {formatNumber(EARTH_MEAN_RADIUS_KM, 1)} km +{' '}
            {formatNumber(targetAltitudeKm, 1)} km.
          </dd>
          <dt>Circular speed</dt>
          <dd>
            v = √(μ / r), with μ = {formatNumber(EARTH_MU_KM3_S2, 4)} km³/s². The displayed value is
            a formula-derived target, not a trajectory result.
          </dd>
          <dt>Target period</dt>
          <dd>
            T = 2π √(r³ / μ). The run must record at least this much simulated time.
          </dd>
          <dt>Altitude window</dt>
          <dd>
            Every recorded altitude must be within ±{MISSION_ALTITUDE_TOLERANCE_KM} km of the target.
            The span metric is the difference between the highest and lowest recorded altitudes; a
            span at most {MISSION_ALTITUDE_TOLERANCE_KM * 2} km is consistent with the window.
          </dd>
          <dt>Clearance</dt>
          <dd>
            Every recorded altitude must be at least {MISSION_MIN_CLEARANCE_KM} km above the mean
            Earth radius. This is a geometric clearance check, not an atmosphere or collision model.
          </dd>
          <dt>Evaluation source</dt>
          <dd>
            Pass, fail, and not-evaluable outcomes come from the engine's recorded samples. The
            mission does not score the user's target or speed input directly.
          </dd>
          <dt>Model limits</dt>
          <dd>
            Fixed central body, massless test particle, fixed-step two-body gravity. No thrust, fuel,
            mass, attitude, transfer burn, Earth rotation, atmosphere, frame conversion, or
            operational flight-safety claim.
          </dd>
          <dt>Not evaluable</dt>
          <dd>
            Missing, empty, non-finite, stopped, malformed, or too-short runs are NOT EVALUABLE, not
            a pass or a fail. A completed run that violates a criterion is FAIL.
          </dd>
        </dl>
      </details>
    </Panel>
  );
}
