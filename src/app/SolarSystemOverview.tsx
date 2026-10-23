/**
 * Solar System Overview screen.
 *
 * This screen owns display selection and camera framing only. It has no import
 * from the simulation or comparison layers, and it exposes no playback or
 * parameter controls. The Earth Orbit Lab and Mission Designer are the separate
 * surfaces where the two-body engine can be run.
 */

import { useState } from 'react';

import { Button, Chip } from '../components/ui';
import {
  SOLAR_SYSTEM_BODIES,
  SOLAR_SYSTEM_MODE_NOTE,
  SOLAR_SYSTEM_ORBIT_NOTE,
  SOLAR_SYSTEM_SCALE_NOTE,
  bodyById,
  kindLabel,
  type CameraFocusMode,
  type SolarSystemBodyId,
} from '../solarSystem/bodies';
import { ModeTabs, type WorkspaceMode } from './ModeTabs';
import { SolarSystemViewport } from '../scene/SolarSystemViewport';

function BodySelector({
  selectedId,
  onSelect,
}: {
  selectedId: SolarSystemBodyId;
  onSelect: (id: SolarSystemBodyId) => void;
}) {
  return (
    <section className="panel overview-panel overview-panel--bodies" aria-labelledby="ss-bodies-heading">
      <header className="panel__header">
        <h2 id="ss-bodies-heading">Bodies</h2>
        <p className="panel__subtitle">Sun + eight planets · fixed reference layout</p>
      </header>
      <div className="panel__body">
        <ul className="ss-bodylist">
          {SOLAR_SYSTEM_BODIES.map((body) => (
            <li key={body.id}>
              <button
                type="button"
                className={body.id === selectedId ? 'ss-bodylist__item is-selected' : 'ss-bodylist__item'}
                aria-pressed={body.id === selectedId}
                onClick={() => onSelect(body.id)}
              >
                <span
                  className="ss-bodylist__dot"
                  style={{ backgroundColor: body.accentColor }}
                  aria-hidden="true"
                />
                <span className="ss-bodylist__text">
                  <span className="ss-bodylist__name">{body.name}</span>
                  <span className="ss-bodylist__meta">
                    {body.kind === 'star'
                      ? 'Star · centre'
                      : `${body.orderFromSun} of 8 · ${kindLabel(body.kind)}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="overview-note">
          These positions are static and illustrative only. They are not current planetary
          positions, a computed ephemeris, or a planetary dynamics simulation.
        </p>
      </div>
    </section>
  );
}

function SelectedBodyPanel({
  selectedId,
  focusMode,
  onResetView,
}: {
  selectedId: SolarSystemBodyId;
  focusMode: CameraFocusMode;
  onResetView: () => void;
}) {
  const body = bodyById(selectedId);
  const texture = body.texture;

  return (
    <section
      className="panel overview-panel overview-panel--details"
      aria-labelledby="ss-selected-heading"
      aria-live="polite"
    >
      <header className="panel__header">
        <h2 id="ss-selected-heading">Selected body</h2>
        <p className="panel__subtitle">Reference visualization</p>
      </header>
      <div className="panel__body">
        <div className="ss-selected__title">
          <span
            className="ss-selected__dot"
            style={{ backgroundColor: body.accentColor }}
            aria-hidden="true"
          />
          <h3>{body.name}</h3>
          <Chip tone="info">Reference only</Chip>
        </div>
        <p className="ss-selected__description">{body.description}</p>

        <dl className="ss-facts">
          <div>
            <dt>Order</dt>
            <dd>
              {body.orderFromSun === 0
                ? 'Centre of the system'
                : `${body.orderFromSun} of 8 from the Sun`}
            </dd>
          </div>
          <div>
            <dt>Class</dt>
            <dd>{kindLabel(body.kind)}</dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>Fixed illustrative angle · not an ephemeris</dd>
          </div>
          <div>
            <dt>Orbit guide</dt>
            <dd>Schematic order only</dd>
          </div>
          <div>
            <dt>Display surface</dt>
            <dd>
              {texture ? (
                <>
                  <a href={texture.sourcePageUrl} target="_blank" rel="noreferrer">
                    {texture.illustrative
                      ? 'Illustrative texture'
                      : `${texture.sourceLabel} texture`}
                  </a>
                  {texture.surfaceNote ? ` · ${texture.surfaceNote}` : null}
                </>
              ) : (
                'Procedural display material'
              )}
            </dd>
          </div>
        </dl>

        <p className="overview-note">{SOLAR_SYSTEM_SCALE_NOTE}</p>

        <div className="ss-actions">
          <Button
            variant={focusMode === 'overview' ? 'primary' : 'default'}
            onClick={onResetView}
            title="Return the camera to the whole Solar System"
          >
            Overview view
          </Button>
        </div>

        <details className="ss-disclosure">
          <summary>Sources, scale & limitations</summary>
          <p>{SOLAR_SYSTEM_MODE_NOTE}</p>
          <p>{SOLAR_SYSTEM_ORBIT_NOTE}</p>
          <p>
            The Earth Orbit Lab and Mission Designer are separate surfaces: both use the existing
            two-body test-particle model. This overview does not feed its illustrative positions or
            display sizes into that engine.
          </p>
          {texture ? (
            <p>
              {texture.credit}. {texture.creditDetail}{' '}
              <a href={texture.sourcePageUrl} target="_blank" rel="noreferrer">
                Source page
              </a>
              {' · '}
              <a href={texture.fileUrl} target="_blank" rel="noreferrer">
                Original image
              </a>
            </p>
          ) : (
            <p>
              The Sun, Mercury, Saturn, and Uranus use procedural display materials in this pass;
              no surface texture is claimed for them.
            </p>
          )}
          <p>
            Surface textures are display assets, not physical data. If a local texture cannot be
            loaded, that body keeps its procedural fallback colour. NASA content is used with the
            NASA Images and Media Usage Guidelines; no NASA insignia or logo is used.
          </p>
          <p>
            <a href="https://science.nasa.gov/3d-resources/" target="_blank" rel="noreferrer">
              NASA 3D Resources catalogue
            </a>
            {' · '}
            <a
              href="https://www.nasa.gov/nasa-brand-center/images-and-media/"
              target="_blank"
              rel="noreferrer"
            >
              NASA Images and Media Usage Guidelines
            </a>
          </p>
        </details>
      </div>
    </section>
  );
}

export type SolarSystemOverviewProps = {
  selectedId: SolarSystemBodyId;
  onSelect: (id: SolarSystemBodyId) => void;
  onChangeMode: (mode: WorkspaceMode) => void;
};

export function SolarSystemOverview({
  selectedId,
  onSelect,
  onChangeMode,
}: SolarSystemOverviewProps) {
  const [focusMode, setFocusMode] = useState<CameraFocusMode>('overview');
  const [focusSignal, setFocusSignal] = useState(0);

  const focusBody = (id: SolarSystemBodyId): void => {
    onSelect(id);
    setFocusMode('body');
    setFocusSignal((value) => value + 1);
  };

  const resetView = (): void => {
    setFocusMode('overview');
    setFocusSignal((value) => value + 1);
  };

  return (
    <div className="overview" data-mode="overview">
      <header className="overview__header">
        <div className="overview__brand">
          <span className="topbar__mark" aria-hidden="true" />
          <div>
            <p className="overview__kicker">Antennae · Space Sandbox</p>
            <h1 id="overview-title" tabIndex={-1}>
              Solar System Overview
            </h1>
            <p className="overview__subtitle">Reference visualization · not a dynamics simulation</p>
          </div>
        </div>
        <ModeTabs mode="overview" onChange={onChangeMode} />
      </header>

      <main className="overview__stage">
        <SolarSystemViewport
          selectedId={selectedId}
          focusMode={focusMode}
          focusSignal={focusSignal}
          onSelect={focusBody}
        />

        <aside className="overview__column overview__column--left" aria-label="Solar System bodies">
          <BodySelector selectedId={selectedId} onSelect={focusBody} />
        </aside>

        <aside className="overview__column overview__column--right" aria-label="Selected body details">
          <SelectedBodyPanel
            selectedId={selectedId}
            focusMode={focusMode}
            onResetView={resetView}
          />
        </aside>
      </main>
    </div>
  );
}
