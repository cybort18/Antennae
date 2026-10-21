/**
 * Cached reference-data panel.
 *
 * The panel displays provider provenance before any simulation is run and loads
 * the exact cached state into the candidate draft. It never fetches at runtime:
 * the fixture is bundled and the panel says so explicitly.
 */

import { Button, Chip, MetricRow, Panel } from '../components/ui';
import type { ReferencePreset } from '../data/types';
import { formatNumber } from '../results/format';

export type ReferencePresetPanelProps = {
  preset: ReferencePreset | null;
  error: string | null;
  loadedPresetId: string | null;
  onLoad: (preset: ReferencePreset) => void;
};

export function ReferencePresetPanel({
  preset,
  error,
  loadedPresetId,
  onLoad,
}: ReferencePresetPanelProps) {
  if (error) {
    return (
      <Panel title="Reference data" subtitle="Cached NASA/JPL state">
        <p className="note note--attention">
          The cached reference preset is unavailable: {error}
        </p>
        <p className="note">
          The synthetic baseline still works. No different target or synthetic state is substituted
          for the unavailable reference data.
        </p>
      </Panel>
    );
  }

  if (!preset) {
    return (
      <Panel title="Reference data" subtitle="Cached NASA/JPL state">
        <p className="note">No cached reference preset is configured.</p>
      </Panel>
    );
  }

  const { provenance: source, state } = preset;
  const loaded = loadedPresetId === preset.id;

  return (
    <Panel title="Reference data" subtitle="Cached NASA/JPL state — no live request">
      <div className="record-block">
        <div className="record-block__head">
          <span className="record-block__name">{preset.label}</span>
          <Chip tone="info">Cached</Chip>
        </div>
        <p className="note">{preset.description}</p>

        <div className="reference-summary">
          <span className="reference-summary__source">{source.provider} · {source.targetName}</span>
          <span className="reference-summary__meta">
            {source.frame} · {source.epochTdb} · {source.center}
          </span>
        </div>

        <div className="field__actions">
          <Button
            variant="primary"
            onClick={() => onLoad(preset)}
            disabled={loaded}
            title="Load the exact cached state into the candidate parameters without running it"
          >
            {loaded ? 'Loaded in draft' : 'Load reference into candidate'}
          </Button>
        </div>

        {loaded ? (
          <p className="note" role="status">
            Exact cached state is in the candidate draft; no simulation has been run.
          </p>
        ) : null}

        <p className="note">
          The exact cached vector is propagated as a hypothetical two-body trajectory, not the real
          ephemeris. Editing altitude or speed converts the candidate to a circular approximation and
          retains the source vector as provenance.
        </p>

        <details className="reference-details">
          <summary>Provider, epoch, frame & units</summary>
          <div className="metrics metrics--compact">
            <MetricRow label="Provider" value={source.provider} />
            <MetricRow
              label="Target"
              value={`${source.targetName} (${source.targetId})`}
            />
            <MetricRow label="Epoch (TDB)" value={source.epochTdb} />
            <MetricRow label="Frame" value={source.frame} />
            <MetricRow label="Center" value={source.center} />
            <MetricRow
              label="Units"
              value={`${source.units.distance} · ${source.units.time} · ${source.units.velocity}`}
            />
            <MetricRow label="Retrieved (UTC)" value={source.retrievedAt} />
            <MetricRow label="API signature" value={source.apiVersion} />
          </div>
        </details>

        <details className="reference-details">
          <summary>Exact cached state vector</summary>
          <div className="metrics metrics--compact">
            <MetricRow
              label="Position X (km)"
              value={formatNumber(state.positionKm.x, 6)}
            />
            <MetricRow
              label="Position Y (km)"
              value={formatNumber(state.positionKm.y, 6)}
            />
            <MetricRow
              label="Position Z (km)"
              value={formatNumber(state.positionKm.z, 6)}
            />
            <MetricRow
              label="Velocity X (km/s)"
              value={formatNumber(state.velocityKmPerS.x, 9)}
            />
            <MetricRow
              label="Velocity Y (km/s)"
              value={formatNumber(state.velocityKmPerS.y, 9)}
            />
            <MetricRow
              label="Velocity Z (km/s)"
              value={formatNumber(state.velocityKmPerS.z, 9)}
            />
            <MetricRow label="Julian date (TDB)" value={formatNumber(source.julianDateTdb, 3)} />
            <MetricRow label="Output type" value={source.outputType} />
          </div>
        </details>

        <details className="reference-details">
          <summary>Provider query and source</summary>
          <p className="note">
            Exact VECTORS request cached with this preset. It was retrieved once; the app does not
            call Horizons while running.
          </p>
          <code className="reference-query">{source.queryUrl}</code>
          <p className="note">
            <a href={source.sourceUrl} target="_blank" rel="noreferrer">
              JPL Horizons API documentation
            </a>
          </p>
        </details>
      </div>
    </Panel>
  );
}
