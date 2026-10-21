/**
 * Comparison panel: the altitude-versus-time chart plus the labels that make its
 * semantics explicit (which run each series belongs to, its status, and whether
 * the parameters have changed since that run was made).
 */

import { useState } from 'react';

import type { AltitudeSeries } from '../comparison/compareRuns';
import type { CandidateRunState, ScenarioRecord } from '../comparison/records';
import { sameInputs } from '../comparison/records';
import { Chip } from '../components/ui';
import { formatInteger, formatNumber } from '../results/format';
import { describeWarning } from '../results/labels';
import { describeScenarioInputs } from '../scenarios/scenarioInputs';
import { AltitudeChart } from './AltitudeChart';

export type ComparisonPanelProps = {
  series: AltitudeSeries[];
  baseline: ScenarioRecord;
  candidate: ScenarioRecord | null;
  candidateRunState: CandidateRunState;
  bodyRadiusKm: number;
};

function recordFor(role: 'baseline' | 'candidate', baseline: ScenarioRecord, candidate: ScenarioRecord | null) {
  return role === 'baseline' ? baseline : candidate;
}

export function ComparisonPanel({
  series,
  baseline,
  candidate,
  candidateRunState,
  bodyRadiusKm,
}: ComparisonPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const candidateMatchesBaseline =
    candidate !== null && sameInputs(candidate.inputs, baseline.inputs);
  const chartBodyId = 'comparison-chart-body';

  return (
    <section
      className="panel comparison-panel"
      aria-labelledby="comparison-panel-title"
      data-testid="comparison-panel"
    >
      <header className="panel__header comparison-panel__header">
        <div>
          <h2 id="comparison-panel-title">Comparison — altitude vs time</h2>
          <p className="panel__subtitle">
            One series per run, drawn from that run's recorded samples
          </p>
        </div>
        <button
          type="button"
          className="button button--ghost comparison-panel__toggle"
          aria-expanded={expanded}
          aria-controls={chartBodyId}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Hide chart' : 'Show chart'}
        </button>
      </header>

      <div
        id={chartBodyId}
        className="panel__body comparison-panel__body"
        hidden={!expanded}
      >
        <AltitudeChart series={series} bodyRadiusKm={bodyRadiusKm} />

        <ul className="series-legend">
          {series.map((one) => {
            const record = recordFor(one.role, baseline, candidate);
            return (
              <li key={one.role} className="series-legend__item">
                <span className={`series-legend__swatch series-legend__swatch--${one.role}`} />
                <span className="series-legend__name">
                  {one.role === 'baseline' ? 'Baseline' : 'Candidate'}
                </span>
                <span className="series-legend__params">
                  {record ? describeScenarioInputs(record.inputs) : 'unavailable'}
                </span>
                <span className="series-legend__meta">
                  {formatInteger(one.points.length)} samples · last recorded t ={' '}
                  {formatNumber(one.lastRecordedTimeSeconds, 1)} s
                </span>
                {one.status === 'stopped' ? (
                  <Chip tone="danger" title="This series ends at its last recorded sample">
                    Stopped · {one.stopReason ? describeWarning(one.stopReason) : 'unknown reason'}
                  </Chip>
                ) : (
                  <Chip tone="ok">Completed</Chip>
                )}
              </li>
            );
          })}
        </ul>

        {series.some((one) => one.endedEarly) ? (
          <p className="note">
            A series marked stopped ends at its own last recorded sample; it is not extended to the
            requested duration and no sample is repeated to fill the gap.
            {series
              .filter((one) => one.endedEarly)
              .map((one) => (
                <span key={`early-${one.role}`} className="note__segment">
                  {' '}
                  {one.role === 'baseline' ? 'Baseline' : 'Candidate'} ended at t ={' '}
                  {formatNumber(one.lastRecordedTimeSeconds, 1)} s of{' '}
                  {formatInteger(one.requestedDurationSeconds)} s requested.
                </span>
              ))}
          </p>
        ) : null}

        <p className="note">
          Lines connect recorded samples in time order; no intermediate states are computed, and the
          two series may have different lengths, grids, or durations. Altitude uses physical kilometres
          above the mean Earth radius and the recorded timestamps — never scene coordinates.
        </p>

        {!candidate ? (
          <p className="note note--attention">
            No candidate run yet. Edit the candidate parameters, then select{' '}
            <strong>Run candidate</strong> to add a second series.
          </p>
        ) : null}

        {candidate && candidateRunState === 'unrun-changes' ? (
          <p className="note note--attention">
            Candidate parameters changed after the last candidate run. The chart still shows the last
            candidate run, listed above with the parameters that produced it.
          </p>
        ) : null}

        {candidateMatchesBaseline ? (
          <p className="note">
            Candidate currently uses the same parameters as the baseline, so both series describe the
            same run.
          </p>
        ) : null}
      </div>
    </section>
  );
}
