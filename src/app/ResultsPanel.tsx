/**
 * Results panel.
 *
 * Everything displayed here is derived from the current run's recorded samples
 * or from the engine's own diagnostics. Aggregates are labelled as covering the
 * recorded samples only.
 */

import { Chip, MetricRow, Panel } from '../components/ui';
import { formatClock, formatInteger, formatNumber, formatPercent } from '../results/format';
import { describeIntegrator, describeWarning, warningTone } from '../results/labels';
import type { SimulationResult } from '../simulation';
import type { RunAggregates, SampleMetrics } from '../results/runSummary';

export type ResultsPanelProps = {
  result: SimulationResult;
  metrics: SampleMetrics;
  aggregates: RunAggregates;
  /** Index of the sample currently drawn in the viewport. */
  sampleIndex: number;
  /** True when the currently displayed sample is the last recorded one. */
  atFinalSample: boolean;
  /** Which record these numbers describe ("Baseline (reference)" / "Candidate"). */
  recordLabel: string;
};

export function ResultsPanel({
  result,
  metrics,
  aggregates,
  sampleIndex,
  atFinalSample,
  recordLabel,
}: ResultsPanelProps) {
  const unitDistance = result.units.distance;
  const unitSpeed = result.units.velocity;

  return (
    <Panel
      title={`Results — ${recordLabel}`}
      subtitle={`Recorded sample ${formatInteger(sampleIndex + 1)} of ${formatInteger(aggregates.sampleCount)}${atFinalSample ? ' · showing final sample' : ''}`}
    >
      <h3 className="panel__subheading">Current sample</h3>
      <div className="metrics">
        <MetricRow
          label="Simulated time"
          value={`${formatNumber(metrics.timeSeconds, 1)} ${result.units.time} (${formatClock(metrics.timeSeconds)})`}
        />
        <MetricRow
          label="Radius from centre"
          value={`${formatNumber(metrics.radiusKm, 3)} ${unitDistance}`}
          emphasis
        />
        <MetricRow label="Altitude (mean radius reference)" value={`${formatNumber(metrics.altitudeKm, 3)} ${unitDistance}`} />
        <MetricRow label="Speed" value={`${formatNumber(metrics.speedKmPerS, 4)} ${unitSpeed}`} />
        <MetricRow
          label="Specific orbital energy"
          value={`${formatNumber(metrics.specificEnergyKm2PerS2, 4)} km²/s²`}
          hint="v²/2 − μ/r, computed by the engine's derived-metric utility."
        />
        <MetricRow
          label="Orbital eccentricity"
          value={formatNumber(metrics.eccentricity, 5)}
          hint="From the Laplace–Runge–Lenz eccentricity vector."
        />
        <MetricRow
          label="Specific angular momentum"
          value={`${formatNumber(metrics.specificAngularMomentumKm2PerS, 2)} km²/s`}
          hint="|r × v|."
        />
      </div>

      <h3 className="panel__subheading">Run summary</h3>
      <div className="metrics">
        <MetricRow
          label="Status"
          value={
            result.status === 'completed'
              ? 'Completed'
              : `Stopped${result.stopReason ? ` · ${describeWarning(result.stopReason)}` : ''}`
          }
        />
        <MetricRow
          label="Integrated duration"
          value={`${formatInteger(result.completedDurationSeconds)} s of ${formatInteger(result.durationSeconds)} s requested`}
          hint="Integration time reached by the engine. A state that violates a geometric limit (such as the impact radius) is not recorded as a sample, so the playable timeline can end before this time."
        />
        <MetricRow
          label="Samples recorded / steps taken"
          value={`${formatInteger(aggregates.sampleCount)} / ${formatInteger(result.diagnostics.steps)}`}
        />
        <MetricRow
          label="Sample interval"
          value={`${result.sampleIntervalSeconds} s (playback resolution)`}
        />
        <MetricRow label="Integrator" value={describeIntegrator(result.integrator)} />
        <MetricRow
          label="Max relative energy deviation"
          value={formatPercent(result.diagnostics.maxRelativeEnergyDeviation, 6)}
          hint="Numerical quality indicator for this conservative model, not a proof of accuracy."
        />
      </div>

      <h3 className="panel__subheading">Extremes across recorded samples</h3>
      <div className="metrics metrics--compact">
        <MetricRow
          label="Radius min / max"
          value={`${formatNumber(aggregates.minRadiusKm, 2)} / ${formatNumber(aggregates.maxRadiusKm, 2)} ${unitDistance}`}
        />
        <MetricRow
          label="Altitude min / max"
          value={`${formatNumber(aggregates.minAltitudeKm, 2)} / ${formatNumber(aggregates.maxAltitudeKm, 2)} ${unitDistance}`}
        />
        <MetricRow
          label="Speed min / max"
          value={`${formatNumber(aggregates.minSpeedKmPerS, 4)} / ${formatNumber(aggregates.maxSpeedKmPerS, 4)} ${unitSpeed}`}
        />
      </div>

      <h3 className="panel__subheading">Warnings</h3>
      {result.warnings.length === 0 ? (
        <p className="note">No warnings: the run completed within the model's checks.</p>
      ) : (
        <ul className="warnings">
          {result.warnings.map((warning) => (
            <li key={`${warning.code}:${warning.timeSeconds}`}>
              <Chip tone={warningTone(warning.code)}>{describeWarning(warning.code)}</Chip>
              <span className="warnings__time">t = {formatNumber(warning.timeSeconds, 1)} s</span>
              <p className="warnings__message">{warning.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
