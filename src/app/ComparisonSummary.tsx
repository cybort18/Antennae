/**
 * Comparison summary: compact metrics for the baseline and candidate runs, plus
 * the differences at a common recorded sample time.
 *
 * Every value comes from `SimulationResult.samples` and the engine's
 * derived-metric utilities. "Final recorded" always means the last sample the
 * engine actually recorded — never the requested duration of a stopped run — and
 * any value that cannot be derived is reported as unavailable.
 */

import { useMemo } from 'react';

import {
  commonComparisonPoint,
  runEndpoints,
  type RunEndpoints,
  type SampleComparison,
} from '../comparison/compareRuns';
import type { ScenarioRecord } from '../comparison/records';
import { Chip, MetricRow, Panel } from '../components/ui';
import {
  UNAVAILABLE,
  formatInteger,
  formatNumber,
  formatSignedNumber,
} from '../results/format';
import { describeWarning } from '../results/labels';
import { describeScenarioInputs } from '../scenarios/scenarioInputs';

export type ComparisonSummaryProps = {
  baseline: ScenarioRecord;
  candidate: ScenarioRecord | null;
  bodyRadiusKm: number;
};

function statusChip(endpoints: RunEndpoints | null) {
  if (!endpoints) {
    return <Chip tone="warn">{UNAVAILABLE}</Chip>;
  }
  if (endpoints.status === 'stopped') {
    return (
      <Chip tone="danger">
        Stopped · {endpoints.stopReason ? describeWarning(endpoints.stopReason) : 'unknown reason'}
      </Chip>
    );
  }
  return <Chip tone="ok">Completed</Chip>;
}

function finalTimeText(endpoints: RunEndpoints | null): string {
  if (!endpoints) {
    return UNAVAILABLE;
  }
  const recorded = `${formatNumber(endpoints.finalRecordedTimeSeconds, 1)} s`;
  if (!endpoints.endedEarly) {
    return recorded;
  }
  return `${recorded} (of ${formatInteger(endpoints.requestedDurationSeconds)} s requested)`;
}

export function ComparisonSummary({ baseline, candidate, bodyRadiusKm }: ComparisonSummaryProps) {
  const baselineEndpoints = useMemo(
    () => runEndpoints(baseline.result, bodyRadiusKm),
    [baseline, bodyRadiusKm],
  );
  const candidateEndpoints = useMemo(
    () => (candidate ? runEndpoints(candidate.result, bodyRadiusKm) : null),
    [candidate, bodyRadiusKm],
  );

  const comparison: SampleComparison | null = useMemo(
    () =>
      candidate
        ? commonComparisonPoint(baseline.result, candidate.result, bodyRadiusKm)
        : null,
    [baseline, candidate, bodyRadiusKm],
  );

  return (
    <Panel
      title="Comparison summary"
      subtitle="Recorded samples of each run; differences are candidate − baseline"
    >
      <table className="summary-table">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">
              Baseline
              <span className="summary-table__params">{describeScenarioInputs(baseline.inputs)}</span>
            </th>
            <th scope="col">
              Candidate
              <span className="summary-table__params">
                {candidate ? describeScenarioInputs(candidate.inputs) : 'not run yet'}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Initial orbital altitude</th>
            <td>
              {baselineEndpoints
                ? `${formatNumber(baselineEndpoints.initialAltitudeKm, 3)} km`
                : UNAVAILABLE}
            </td>
            <td>
              {candidateEndpoints
                ? `${formatNumber(candidateEndpoints.initialAltitudeKm, 3)} km`
                : UNAVAILABLE}
            </td>
          </tr>
          <tr>
            <th scope="row">Final recorded altitude</th>
            <td>
              {baselineEndpoints
                ? `${formatNumber(baselineEndpoints.finalRecordedAltitudeKm, 3)} km`
                : UNAVAILABLE}
            </td>
            <td>
              {candidateEndpoints
                ? `${formatNumber(candidateEndpoints.finalRecordedAltitudeKm, 3)} km`
                : UNAVAILABLE}
            </td>
          </tr>
          <tr>
            <th scope="row">Final recorded simulated time</th>
            <td>{finalTimeText(baselineEndpoints)}</td>
            <td>{finalTimeText(candidateEndpoints)}</td>
          </tr>
          <tr>
            <th scope="row">Recorded samples</th>
            <td>{baselineEndpoints ? formatInteger(baselineEndpoints.sampleCount) : UNAVAILABLE}</td>
            <td>{candidateEndpoints ? formatInteger(candidateEndpoints.sampleCount) : UNAVAILABLE}</td>
          </tr>
          <tr>
            <th scope="row">Run status</th>
            <td>{statusChip(baselineEndpoints)}</td>
            <td>{candidate ? statusChip(candidateEndpoints) : <Chip tone="neutral">Not run</Chip>}</td>
          </tr>
        </tbody>
      </table>

      <h3 className="panel__subheading">Difference at a common recorded sample</h3>

      {!candidate ? (
        <p className="note">Run candidate to compare the two runs at the same simulated time.</p>
      ) : null}

      {candidate && !comparison ? (
        <p className="note note--attention">
          The two runs share no recorded sample time (their sampling grids do not overlap), so
          differences are unavailable. No value is interpolated to force a comparison.
        </p>
      ) : null}

      {comparison ? (
        <>
          <p className="note">
            Common comparison point: t = {formatNumber(comparison.timeSeconds, 1)} s — the latest
            simulated time recorded by <em>both</em> runs (exact sample timestamps, no
            interpolation).
          </p>
          <div className="metrics metrics--compact">
            <MetricRow
              label="Altitude difference"
              value={`${formatSignedNumber(comparison.delta.altitudeKm, 3)} km`}
            />
            <MetricRow
              label="Orbital radius difference"
              value={`${formatSignedNumber(comparison.delta.radiusKm, 3)} km`}
            />
            <MetricRow
              label="Speed difference"
              value={`${formatSignedNumber(comparison.delta.speedKmPerS, 4)} km/s`}
            />
            <MetricRow
              label="Specific orbital energy difference"
              value={`${formatSignedNumber(comparison.delta.specificEnergyKm2PerS2, 4)} km²/s²`}
            />
          </div>
          <p className="note">
            Baseline at that time: {formatNumber(comparison.baseline.altitudeKm, 3)} km altitude,{' '}
            {formatNumber(comparison.baseline.speedKmPerS, 4)} km/s. Candidate:{' '}
            {formatNumber(comparison.candidate.altitudeKm, 3)} km altitude,{' '}
            {formatNumber(comparison.candidate.speedKmPerS, 4)} km/s.
          </p>
        </>
      ) : null}

      {candidateEndpoints?.endedEarly ? (
        <p className="note">
          The candidate stopped early: its final recorded sample is t ={' '}
          {formatNumber(candidateEndpoints.finalRecordedTimeSeconds, 1)} s, which is not the{' '}
          {formatInteger(candidateEndpoints.requestedDurationSeconds)} s requested. The difference
          above is evaluated only where both runs recorded a sample.
        </p>
      ) : null}

      <p className="note">
        An altered orbit is a hypothetical comparison against a simplified two-body model; it is not
        a feasible operational mission trajectory. Unavailable values are shown as {UNAVAILABLE}{' '}
        rather than estimated.
      </p>
    </Panel>
  );
}
