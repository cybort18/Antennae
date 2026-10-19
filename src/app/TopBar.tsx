/**
 * Top bar: application identity, the record currently displayed, model status,
 * the baseline/candidate view switcher, and compact playback controls (the full
 * control set lives in the bottom timeline).
 */

import type { CandidateRunState, RecordRole, ScenarioRecord } from '../comparison/records';
import { Button, Chip } from '../components/ui';
import { formatInteger } from '../results/format';
import { describeIntegrator, describeModel, describeWarning } from '../results/labels';

export type TopBarProps = {
  record: ScenarioRecord;
  sampleIndex: number;
  playing: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  view: RecordRole;
  onChangeView: (view: RecordRole) => void;
  candidateAvailable: boolean;
  candidateRunState: CandidateRunState;
};

function roleLabel(role: RecordRole): string {
  return role === 'baseline' ? 'Baseline' : 'Candidate';
}

export function TopBar({
  record,
  sampleIndex,
  playing,
  onTogglePlay,
  onReset,
  view,
  onChangeView,
  candidateAvailable,
  candidateRunState,
}: TopBarProps) {
  const { result } = record;
  const stopped = result.status === 'stopped';
  const warningCount = result.warnings.length;

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__title">Antennae</span>
        <span className="topbar__product">Space Sandbox</span>
      </div>

      <div className="topbar__scenario">
        <p className="topbar__label" title={result.label}>
          <span className="topbar__record">{roleLabel(record.role)}</span>
          {' · '}
          {result.label ?? 'Unnamed scenario'}
        </p>
        <div className="topbar__chips">
          <Chip tone="info" title={describeModel(result.model)}>
            Two-body model
          </Chip>
          <Chip tone="neutral" title={describeIntegrator(result.integrator)}>
            KDK leapfrog · {result.timestepSeconds} s step
          </Chip>
          {stopped ? (
            <Chip
              tone="danger"
              title={result.stopReason ? describeWarning(result.stopReason) : undefined}
            >
              Stopped · {result.stopReason}
            </Chip>
          ) : (
            <Chip tone="ok">Completed</Chip>
          )}
          {warningCount > 0 ? (
            <Chip tone="warn" title="See the warnings list in the results panel">
              {warningCount} warning{warningCount === 1 ? '' : 's'}
            </Chip>
          ) : null}
          {candidateRunState === 'unrun-changes' ? (
            <Chip tone="warn" title="Candidate parameters changed since the last candidate run">
              Unrun changes
            </Chip>
          ) : null}
        </div>
      </div>

      <div className="topbar__view" role="group" aria-label="Displayed trajectory">
        <span className="topbar__view-label">Trajectory</span>
        <Button
          variant={view === 'baseline' ? 'primary' : 'ghost'}
          ariaPressed={view === 'baseline'}
          onClick={() => onChangeView('baseline')}
          title="Display the baseline run in the viewport and timeline"
        >
          Baseline
        </Button>
        <Button
          variant={view === 'candidate' ? 'primary' : 'ghost'}
          ariaPressed={view === 'candidate'}
          disabled={!candidateAvailable}
          onClick={() => onChangeView('candidate')}
          title={
            candidateAvailable
              ? 'Display the candidate run in the viewport and timeline'
              : 'Run a candidate first'
          }
        >
          Candidate
        </Button>
      </div>

      <div className="topbar__controls">
        <Button
          variant="primary"
          onClick={onTogglePlay}
          ariaLabel={playing ? 'Pause playback' : 'Run playback'}
          ariaPressed={playing}
          title={playing ? 'Pause playback' : 'Run playback of recorded samples'}
        >
          {playing ? '❚❚ Pause' : '▶ Run'}
        </Button>
        <Button onClick={onReset} title="Return playback to the first recorded sample">
          ⟲ Reset
        </Button>
        <p className="topbar__counter">
          sample {formatInteger(Math.min(sampleIndex + 1, result.samples.length))} /{' '}
          {formatInteger(result.samples.length)}
        </p>
      </div>
    </header>
  );
}
