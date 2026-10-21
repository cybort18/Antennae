/**
 * Inspector for the test particle: the locked baseline reference, the editable
 * candidate parameters, and the actions that connect them.
 *
 * Semantic rules made visible here:
 * - Editing only changes candidate *parameters*; nothing is integrated until the
 *   user runs the candidate, so an edit can never silently rewrite a result.
 * - The baseline is locked. Replacing it is a deliberate, confirmed action.
 * - Restoring copies the baseline parameters back and re-runs them, so the
 *   restored candidate is bound to the baseline configuration.
 */

import { useMemo, useState } from 'react';

import { Button, Chip, MetricRow, Panel } from '../components/ui';
import { NumberField } from '../components/NumberField';
import type { CandidateRunState, ScenarioRecord } from '../comparison/records';
import { formatInteger, formatNumber } from '../results/format';
import { describeWarning } from '../results/labels';
import {
  INPUT_LIMITS,
  ORBIT_COUNT_OPTIONS,
  buildScenarioConfig,
  describeScenarioInputs,
  type ScenarioInputs,
  type ScenarioReference,
} from '../scenarios/scenarioInputs';
import {
  eccentricity,
  type SimulationResult,
  type ValidationIssue,
} from '../simulation';
import type { Selection } from './ObjectBrowser';

export type InspectorPanelProps = {
  selection: Selection;
  /** Candidate parameters being edited (not yet a result). */
  draft: ScenarioInputs;
  draftReference: ScenarioReference;
  draftIssues: ValidationIssue[];
  onChange: (patch: Partial<ScenarioInputs>) => void;
  onRunCandidate: () => void;
  onRestoreBaseline: () => void;
  onPromoteCandidate: () => void;
  baseline: ScenarioRecord;
  candidate: ScenarioRecord | null;
  candidateRunState: CandidateRunState;
  lastRunIssues: ValidationIssue[] | null;
  lastRunEngineError: string | null;
  /** Reference body radius used to express the central body's mean radius, km. */
  bodyRadiusKm: number;
  /** Result currently displayed in the viewport (used for the Earth inspector). */
  displayedResult: SimulationResult;
};

function recordChips(record: ScenarioRecord) {
  const { result } = record;
  if (result.status === 'stopped') {
    return (
      <Chip tone="danger">
        Stopped · {result.stopReason ? describeWarning(result.stopReason) : 'unknown reason'}
      </Chip>
    );
  }
  return <Chip tone="ok">Completed</Chip>;
}

export function InspectorPanel({
  selection,
  draft,
  draftReference,
  draftIssues,
  onChange,
  onRunCandidate,
  onRestoreBaseline,
  onPromoteCandidate,
  baseline,
  candidate,
  candidateRunState,
  lastRunIssues,
  lastRunEngineError,
  bodyRadiusKm,
  displayedResult,
}: InspectorPanelProps) {
  const [confirmingBaseline, setConfirmingBaseline] = useState(false);

  // Eccentricity of the initial state the candidate parameters describe, from
  // the engine's own utility. Depends only on radius and speed, so it is valid
  // even while the draft is outside the runnable limits.
  const initialEccentricity = useMemo(
    () => eccentricity(buildScenarioConfig(draft).initialState, displayedResult.centralBody.gravitationalParameterKm3PerS2),
    [draft, displayedResult.centralBody.gravitationalParameterKm3PerS2],
  );

  if (selection === 'earth') {
    return (
      <Panel title="Inspector — Earth" subtitle="Central body of the two-body model">
        <div className="metrics">
          <MetricRow label="Role" value="Fixed force centre at frame origin" />
          <MetricRow
            label="Gravitational parameter GM"
            value={`${formatNumber(baseline.result.centralBody.gravitationalParameterKm3PerS2, 4)} km³/s²`}
          />
          <MetricRow
            label="Mean radius (display + stop radius)"
            value={`${formatNumber(bodyRadiusKm, 1)} km`}
          />
          <MetricRow label="Ephemeris state" value="Not modelled" />
          <MetricRow label="Rotation / oblateness" value="Not modelled" />
        </div>
        <p className="note">
          The central body does not move in this model, so it has no simulated trajectory. Its
          position is the exact frame origin by definition, not a computed value. Terrain,
          atmosphere, oblateness, and rotation are outside the current force model, and the stop
          radius is a smooth-sphere approximation of the mean radius.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Inspector — Test particle"
      subtitle="Baseline reference and candidate parameters · text applies on Enter or on blur"
    >
      <h3 className="panel__subheading">Baseline (reference)</h3>
      <div className="record-block">
        <div className="record-block__head">
          <span className="record-block__name">Locked comparison reference</span>
          {recordChips(baseline)}
        </div>
        <p className="record-block__params">{describeScenarioInputs(baseline.inputs)}</p>
        {baseline.inputs.reference ? (
          <p className="note">
            This baseline uses a cached {baseline.inputs.reference.provenance.provider} reference
            state. The simulated path is a hypothetical two-body propagation, not a real ephemeris.
          </p>
        ) : null}
        <div className="metrics metrics--compact">
          <MetricRow
            label="Requested duration"
            value={`${formatInteger(baseline.result.durationSeconds)} s`}
          />
          <MetricRow
            label="Recorded samples"
            value={formatInteger(baseline.result.samples.length)}
          />
        </div>
        <div className="field__actions">
          <Button
            onClick={onRestoreBaseline}
            title="Copy the baseline parameters into the candidate and run them"
          >
            Restore baseline parameters
          </Button>
        </div>

        {candidate ? (
          <div className="field__actions">
            <Button
              onClick={() => setConfirmingBaseline(true)}
              disabled={confirmingBaseline}
              title="Replace the current baseline with the candidate record"
            >
              Replace baseline with candidate…
            </Button>
          </div>
        ) : (
          <p className="note">Run a candidate to make it available as a new baseline.</p>
        )}

        {confirmingBaseline ? (
          <div className="confirm" role="alert">
            <p>
              Replace the baseline with the current candidate run?
              <br />
              The candidate record is then cleared and the viewport returns to the new baseline.
              This cannot be undone within the session.
            </p>
            <div className="field__actions">
              <Button
                variant="primary"
                onClick={() => {
                  onPromoteCandidate();
                  setConfirmingBaseline(false);
                }}
              >
                Confirm replace baseline
              </Button>
              <Button onClick={() => setConfirmingBaseline(false)}>Cancel</Button>
            </div>
          </div>
        ) : null}
      </div>

      <h3 className="panel__subheading">Candidate parameters</h3>
      {candidateRunState === 'unrun-changes' ? (
        <p className="note note--attention">
          Unrun changes: these parameters differ from the last candidate run.
        </p>
      ) : null}
      {candidateRunState === 'in-sync' ? (
        <p className="note">These parameters match the last candidate run.</p>
      ) : null}
      {candidateRunState === 'not-run' ? (
        <p className="note">No candidate run yet for the current parameter set.</p>
      ) : null}

      {draft.reference ? (
        <div className="record-block">
          <div className="record-block__head">
            <span className="record-block__name">Cached reference state</span>
            <Chip tone="info">Exact provider vector</Chip>
          </div>
          <p className="record-block__params">{draft.reference.label}</p>
          <div className="metrics metrics--compact">
            <MetricRow
              label="Target"
              value={`${draft.reference.provenance.targetName} (${draft.reference.provenance.targetId})`}
            />
            <MetricRow label="Epoch (metadata)" value={draft.reference.provenance.epochTdb} />
            <MetricRow
              label="Frame / centre"
              value={`${draft.reference.provenance.frame} · ${draft.reference.provenance.center}`}
            />
            <MetricRow
              label="Units"
              value={`${draft.reference.provenance.units.distance} · ${draft.reference.provenance.units.time} · ${draft.reference.provenance.units.velocity}`}
            />
            <MetricRow label="Retrieved" value={draft.reference.provenance.retrievedAt} />
            <MetricRow
              label="Reference radius altitude"
              value={`${formatNumber(draftReference.radiusKm - bodyRadiusKm, 3)} km`}
            />
            <MetricRow
              label="Reference speed magnitude"
              value={`${formatNumber(
                Math.hypot(
                  draft.reference.state.velocityKmPerS.x,
                  draft.reference.state.velocityKmPerS.y,
                  draft.reference.state.velocityKmPerS.z,
                ),
                6,
              )} km/s`}
            />
          </div>
          <div className="metrics metrics--compact">
            <MetricRow
              label="Cached position (km)"
              value={`${formatNumber(draft.reference.state.positionKm.x, 6)}, ${formatNumber(
                draft.reference.state.positionKm.y,
                6,
              )}, ${formatNumber(draft.reference.state.positionKm.z, 6)}`}
            />
            <MetricRow
              label="Cached velocity (km/s)"
              value={`${formatNumber(draft.reference.state.velocityKmPerS.x, 9)}, ${formatNumber(
                draft.reference.state.velocityKmPerS.y,
                9,
              )}, ${formatNumber(draft.reference.state.velocityKmPerS.z, 9)}`}
            />
          </div>
          <p className="note">
            This candidate uses the exact cached vector. The two-body trajectory is a hypothetical
            propagation, not the satellite's real ephemeris. Editing altitude or speed detaches the
            exact vector from propagation, retains it as provenance, and converts the candidate to a
            circular approximation.
          </p>
          <div className="field__actions">
            <Button
              onClick={() =>
                onChange({
                  altitudeKm: draft.altitudeKm,
                  speedKmPerS: draft.speedKmPerS,
                })
              }
              title="Detach the exact reference vector from propagation and use a circular state at its radius and speed"
            >
              Convert to circular approximation
            </Button>
          </div>
        </div>
      ) : (
        <>
          {draft.derivedFrom ? (
            <div className="record-block" role="status">
              <div className="record-block__head">
                <span className="record-block__name">Circular approximation</span>
                <Chip tone="info">Reference-derived</Chip>
              </div>
              <p className="note">
                Derived from {draft.derivedFrom.label} ({draft.derivedFrom.provenance.provider}{' '}
                {draft.derivedFrom.provenance.targetId}, {draft.derivedFrom.provenance.epochTdb}).
                The original cached vector is retained in this scenario's provenance but is no longer
                propagated. These circular parameters are a user edit; the resulting trajectory is
                hypothetical.
              </p>
            </div>
          ) : null}
          <NumberField
            id="altitude"
            label="Initial altitude"
            unit="km"
            value={draft.altitudeKm}
            min={INPUT_LIMITS.altitudeKm.min}
            max={INPUT_LIMITS.altitudeKm.max}
            step={10}
            showSlider
            onCommit={(altitudeKm) => onChange({ altitudeKm })}
          />

          <NumberField
            id="speed"
            label="Initial tangential speed"
            unit="km/s"
            value={draft.speedKmPerS}
            min={INPUT_LIMITS.speedKmPerS.min}
            max={INPUT_LIMITS.speedKmPerS.max}
            step={0.01}
            showSlider
            onCommit={(speedKmPerS) => onChange({ speedKmPerS })}
            hint={`Circular speed at this altitude: ${formatNumber(draftReference.circularSpeedKmPerS, 3)} km/s (= 1.00x). Current: ${formatNumber(draftReference.speedRatio, 2)}x circular.`}
          />

          <div className="field__actions">
            <Button
              onClick={() => onChange({ speedKmPerS: Number(draftReference.circularSpeedKmPerS.toFixed(3)) })}
              title="Set the initial speed to the circular speed for the current altitude"
            >
              Use circular speed
            </Button>
          </div>
        </>
      )}

      <div className="field">
        <label className="field__label" htmlFor="revolutions">
          Revolutions to integrate
        </label>
        <select
          id="revolutions"
          className="field__input"
          value={String(draft.orbitCount)}
          onChange={(event) => onChange({ orbitCount: Number(event.target.value) })}
        >
          {ORBIT_COUNT_OPTIONS.map((option) => (
            <option key={option} value={String(option)}>
              {option} × reference period
            </option>
          ))}
        </select>
      </div>

      <div className="field__actions">
        <Button
          variant="primary"
          onClick={onRunCandidate}
          title={
            draftIssues.length > 0
              ? 'These parameters are outside the supported range; running reports the messages above and changes nothing'
              : 'Integrate these parameters as the candidate run'
          }
        >
          Run candidate
        </Button>
      </div>
      <p className="note">
        Running the candidate integrates the parameters above with the same engine, timestep, and
        integrator as the baseline. The baseline is never modified by a candidate run.
      </p>

      <div className="metrics metrics--compact">
        <MetricRow label="Orbit radius" value={`${formatNumber(draftReference.radiusKm, 1)} km`} />
        <MetricRow
          label="Reference period (circular)"
          value={`${formatNumber(draftReference.periodSeconds, 1)} s`}
        />
        <MetricRow
          label="Requested duration"
          value={`${formatInteger(draftReference.durationSeconds)} s`}
        />
        <MetricRow
          label="Samples if completed"
          value={formatInteger(draftReference.estimatedSampleCount)}
        />
        <MetricRow
          label="Initial-state eccentricity"
          value={formatNumber(initialEccentricity, 4)}
          hint="Computed by the engine from the initial state these parameters describe (0 = circular)."
        />
      </div>

      {draftIssues.length > 0 ? (
        <ul className="issues" role="alert">
          {draftIssues.map((issue) => (
            <li key={`${issue.field}:${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}

      {lastRunIssues && lastRunIssues.length > 0 ? (
        <p className="note note--attention">
          The last candidate run was rejected; the previous candidate record (if any) and the
          baseline are unchanged.
        </p>
      ) : null}

      {lastRunEngineError ? (
        <p className="note note--attention">Engine error: {lastRunEngineError}</p>
      ) : null}
    </Panel>
  );
}
