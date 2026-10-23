/**
 * Top bar: application identity, the record currently displayed, model status,
 * the baseline/candidate view switcher, and compact playback controls (the full
 * control set lives in the bottom timeline).
 */

import type { CandidateRunState, RecordRole, ScenarioRecord } from '../comparison/records';
import { Button, Chip } from '../components/ui';
import { describeModel, describeWarning } from '../results/labels';
import { ModeTabs, type WorkspaceMode } from './ModeTabs';

export type TopBarProps = {
  mode: WorkspaceMode;
  record: ScenarioRecord;
  view: RecordRole;
  onChangeView: (view: RecordRole) => void;
  candidateAvailable: boolean;
  candidateRunState: CandidateRunState;
  onChangeMode: (mode: WorkspaceMode) => void;
};

function roleLabel(role: RecordRole): string {
  return role === 'baseline' ? 'Baseline' : 'Candidate';
}

export function TopBar({
  mode,
  record,
  view,
  onChangeView,
  candidateAvailable,
  candidateRunState,
  onChangeMode,
}: TopBarProps) {
  const { result } = record;
  const stopped = result.status === 'stopped';

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true" />
        <span className="topbar__title">Antennae</span>
        <span className="topbar__product">Space Sandbox</span>
      </div>

      <ModeTabs mode={mode} onChange={onChangeMode} />

      <div className="topbar__scenario">
        <p className="topbar__label" title={result.label}>
          <span className="topbar__record">{roleLabel(record.role)}</span>
          {' · '}
          {result.label ?? 'Unnamed scenario'}
        </p>
        <div className="topbar__chips">
          <Chip tone="neutral" title={describeModel(result.model)}>
            Two-body model
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
    </header>
  );
}
