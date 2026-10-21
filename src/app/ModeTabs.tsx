/**
 * Workspace mode switch. This only changes which product surface is mounted; it
 * never touches the comparison records, playback cursor, or simulation engine.
 */

export type WorkspaceMode = 'overview' | 'lab';

export function ModeTabs({
  mode,
  onChange,
}: {
  mode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
}) {
  return (
    <div className="mode-tabs" role="group" aria-label="Workspace mode">
      <button
        type="button"
        className={mode === 'overview' ? 'mode-tabs__tab is-active' : 'mode-tabs__tab'}
        aria-pressed={mode === 'overview'}
        onClick={() => onChange('overview')}
      >
        Solar System
      </button>
      <button
        type="button"
        className={mode === 'lab' ? 'mode-tabs__tab is-active' : 'mode-tabs__tab'}
        aria-pressed={mode === 'lab'}
        onClick={() => onChange('lab')}
      >
        Earth Orbit Lab
      </button>
    </div>
  );
}
