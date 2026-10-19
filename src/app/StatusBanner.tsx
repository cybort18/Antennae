/**
 * Run-status banner: parameter problems, rejected candidate runs, and stopped
 * runs of the displayed record.
 *
 * A stopped or invalid run is never presented as a completed one. Invalid
 * candidate parameters change nothing: the baseline and the last candidate record
 * stay exactly as they were, and the banner says so.
 */

import { Chip } from '../components/ui';
import { formatInteger, formatNumber } from '../results/format';
import { describeWarning } from '../results/labels';
import type { SimulationResult, ValidationIssue } from '../simulation';

export type StatusBannerProps = {
  /** Result of the record currently displayed. */
  result: SimulationResult;
  /** Label of the displayed record ("Baseline" / "Candidate"). */
  recordLabel: string;
  /** Validation issues of the candidate parameters currently being edited. */
  draftIssues: ValidationIssue[];
  /** Issues reported by the most recent explicit candidate run (null = none yet). */
  lastRunIssues: ValidationIssue[] | null;
  /** Engine error from the most recent candidate run attempt, if any. */
  engineError: string | null;
  /** Simulated time of the last recorded sample of the displayed run. */
  lastSampleTimeSeconds: number;
};

export function StatusBanner({
  result,
  recordLabel,
  draftIssues,
  lastRunIssues,
  engineError,
  lastSampleTimeSeconds,
}: StatusBannerProps) {
  const stopped = result.status === 'stopped';
  const stopWarning = result.stopReason
    ? result.warnings.find((warning) => warning.code === result.stopReason)
    : undefined;
  const rejectedRun = lastRunIssues !== null && lastRunIssues.length > 0;

  if (!stopped && !engineError && !rejectedRun && draftIssues.length === 0) {
    return null;
  }

  return (
    <div className="banners">
      {engineError ? (
        <div className="banner banner--danger" role="alert">
          <Chip tone="danger">Candidate run failed</Chip>
          <p>{engineError}</p>
        </div>
      ) : null}

      {rejectedRun ? (
        <div className="banner banner--warn" role="alert">
          <Chip tone="warn">Candidate run rejected — nothing was integrated</Chip>
          <p>
            {lastRunIssues?.length ?? 0} parameter problem
            {(lastRunIssues?.length ?? 0) === 1 ? '' : 's'} blocked the run. The baseline and the
            previous candidate record are unchanged; the parameter messages are listed in the
            inspector.
          </p>
        </div>
      ) : null}

      {!rejectedRun && draftIssues.length > 0 ? (
        <div className="banner banner--warn" role="alert">
          <Chip tone="warn">Candidate parameters invalid — not integrated</Chip>
          <ul className="banner__list">
            {draftIssues.map((issue) => (
              <li key={`${issue.field}:${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
          <p className="banner__meta">
            Selecting Run candidate reports this without changing the baseline or the previous
            candidate record.
          </p>
        </div>
      ) : null}

      {stopped ? (
        <div className="banner banner--danger" role="alert">
          <Chip tone="danger">
            {recordLabel} stopped ·{' '}
            {result.stopReason ? describeWarning(result.stopReason) : 'unknown reason'}
          </Chip>
          <p>
            {stopWarning?.message ??
              'The engine stopped this run; the recorded output is incomplete.'}
          </p>
          <p className="banner__meta">
            Playback ends at the last recorded sample: t = {formatNumber(lastSampleTimeSeconds, 1)} s
            of the {formatInteger(result.durationSeconds)} s requested. The scene does not continue
            as though the run had completed, and the comparison does not extend this series.
          </p>
        </div>
      ) : null}
    </div>
  );
}
