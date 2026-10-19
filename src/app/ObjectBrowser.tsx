/**
 * Object browser: the two objects that exist in this model — the fixed central
 * body and the massless test particle.
 */

import { Panel } from '../components/ui';
import { formatNumber } from '../results/format';
import type { SimulationResult } from '../simulation';
import type { SampleMetrics } from '../results/runSummary';

export type Selection = 'particle' | 'earth';

export type ObjectBrowserProps = {
  result: SimulationResult;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  metrics: SampleMetrics;
};

export function ObjectBrowser({ result, selection, onSelect, metrics }: ObjectBrowserProps) {
  return (
    <Panel title="Objects" subtitle="Scene contents (2)">
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
      </ul>
      <p className="note">
        The model contains no other objects. Third bodies, spacecraft models, and
        asset-loaded meshes are out of scope for this milestone.
      </p>
    </Panel>
  );
}
