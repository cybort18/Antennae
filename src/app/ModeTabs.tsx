/**
 * Workspace mode switch. This only changes which product surface is mounted; it
 * never touches the comparison records, playback cursor, or simulation engine.
 */

export type WorkspaceMode = 'overview' | 'lab' | 'mission' | 'outpost';

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
        title="Reference visualization: static illustrative positions, no planetary dynamics"
      >
        Solar System
      </button>
      <button
        type="button"
        className={mode === 'lab' ? 'mode-tabs__tab is-active' : 'mode-tabs__tab'}
        aria-pressed={mode === 'lab'}
        onClick={() => onChange('lab')}
        title="Open physics sandbox: edit initial conditions and compare recorded two-body runs"
      >
        Earth Orbit Lab
      </button>
      <button
        type="button"
        className={mode === 'mission' ? 'mode-tabs__tab is-active' : 'mode-tabs__tab'}
        aria-pressed={mode === 'mission'}
        onClick={() => onChange('mission')}
        title="Mission Designer: objective-driven run of the same two-body engine"
      >
        Mission Designer
      </button>
      <button
        type="button"
        className={mode === 'outpost' ? 'mode-tabs__tab is-active' : 'mode-tabs__tab'}
        aria-pressed={mode === 'outpost'}
        onClick={() => onChange('outpost')}
        title="Outpost Mission Trainer: balance life support, radiation, power, and food on Mars"
      >
        Outpost Trainer
      </button>
    </div>
  );
}
