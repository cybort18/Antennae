/**
 * Object browser: the two objects that exist in this model — the fixed central
 * body and the massless test particle.
 */

import { Panel } from '../components/ui';
import { formatNumber } from '../results/format';
import type { SimulationResult } from '../simulation';
import type { SampleMetrics } from '../results/runSummary';
import type { SpacecraftModelId } from '../scene/spacecraftModels';

export type Selection = 'particle' | 'earth';

export type ObjectBrowserProps = {
  result: SimulationResult;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  metrics: SampleMetrics;
  /** Render-only mesh associated with the displayed record, if any. */
  spacecraftModel?: SpacecraftModelId | null;
};

export function ObjectBrowser({
  result,
  selection,
  onSelect,
  metrics,
  spacecraftModel = null,
}: ObjectBrowserProps) {
  return (
    <Panel title="Objects" subtitle={`Scene contents (${spacecraftModel ? 3 : 2})`}>
      <ul className="objectlist">
        <li>
          <button
            type="button"
            className={selection === 'particle' ? 'objectlist__item is-selected' : 'objectlist__item'}
            aria-pressed={selection === 'particle'}
            onClick={() => onSelect('particle')}
          >
            <span className="objectlist__name">Test particle</span>
            <span className="objectlist__meta">
              massless · {formatNumber(metrics.altitudeKm, 1)} km altitude
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={selection === 'earth' ? 'objectlist__item is-selected' : 'objectlist__item'}
            aria-pressed={selection === 'earth'}
            onClick={() => onSelect('earth')}
          >
            <span className="objectlist__name">{result.centralBody.name}</span>
            <span className="objectlist__meta">central body · fixed at frame origin</span>
          </button>
        </li>
        {spacecraftModel ? (
          <li>
            <div className="objectlist__item objectlist__item--static">
              <span className="objectlist__name">GOES-16 spacecraft</span>
              <span className="objectlist__meta">render-only mesh · no physical effect</span>
            </div>
          </li>
        ) : null}
      </ul>
      <p className="note">
        The physics model contains only the central body and a massless test particle.
        {spacecraftModel
          ? ' The GOES-16 mesh is drawn at the same recorded sample as a render-only representation; it adds no mass, attitude, thrust, fuel, or dynamics.'
          : ' No spacecraft mesh is shown for this synthetic run.'}
      </p>
    </Panel>
  );
}
