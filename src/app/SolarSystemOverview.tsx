/**
 * Solar System Overview screen.
 *
 * This screen owns display selection, camera framing, and an opt-in,
 * period-proportional schematic motion control. It has no import from the
 * simulation or comparison layers, and it never calls the physics engine. The
 * Earth Orbit Lab and Mission Designer are the separate surfaces where the
 * two-body engine can be run.
 */

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { Button, Chip } from '../components/ui';
import { formatInteger, formatNumber } from '../results/format';
import {
  SOLAR_SYSTEM_BODIES,
  SOLAR_SYSTEM_MODE_NOTE,
  SOLAR_SYSTEM_ORBIT_NOTE,
  SOLAR_SYSTEM_SCALE_NOTE,
  SOLAR_SYSTEM_SCHEMATIC_MOTION_NOTE,
  bodyById,
  kindLabel,
  type CameraFocusMode,
  type SolarSystemBodyId,
} from '../solarSystem/bodies';
import {
  DEFAULT_SCHEMATIC_RATE,
  MAX_SCHEMATIC_FRAME_DELTA_SECONDS,
  SCHEMATIC_DURATION_MAX_DAYS,
  SCHEMATIC_RATE_OPTIONS,
  SCHEMATIC_STEP_DAYS,
  advanceSchematicDays,
  clampSchematicDays,
  stepSchematicDays,
  type SchematicPlaybackRate,
} from '../solarSystem/schematicMotion';
import { ModeTabs, type WorkspaceMode } from './ModeTabs';
import { SolarSystemViewport } from '../scene/SolarSystemViewport';

const NOT_APPLICABLE = 'Not applicable (central star)';

function formatMeanRadiusKm(meanRadiusKm: number): string {
  if (Number.isInteger(meanRadiusKm)) {
    return `${formatInteger(meanRadiusKm)} km`;
  }
  return `${formatNumber(meanRadiusKm, 1)} km`;
}

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
        <p className="panel__subtitle">Sun + eight planets · schematic reference layout</p>
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
          These positions are illustrative only. They are not current planetary positions, a
          computed ephemeris, or a planetary dynamics simulation.
        </p>
      </div>
    </section>
  );
}

function SelectedBodyPanel({
  selectedId,
  focusMode,
  elapsedDays,
  onResetView,
}: {
  selectedId: SolarSystemBodyId;
  focusMode: CameraFocusMode;
  elapsedDays: number;
  onResetView: () => void;
}) {
  const body = bodyById(selectedId);
  const texture = body.texture;
  const { facts } = body;

  return (
    <section
      className="panel overview-panel overview-panel--details"
      aria-labelledby="ss-selected-heading"
      aria-live="polite"
    >
      <header className="panel__header">
        <h2 id="ss-selected-heading">Selected body</h2>
        <p className="panel__subtitle">Reference visualization & physical facts</p>
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
            <dt>Mean radius</dt>
            <dd>{formatMeanRadiusKm(facts.meanRadiusKm)}</dd>
          </div>
          <div>
            <dt>Semi-major axis</dt>
            <dd>
              {facts.semiMajorAxisAu === null
                ? NOT_APPLICABLE
                : `${formatNumber(facts.semiMajorAxisAu, 4)} AU`}
            </dd>
          </div>
          <div>
            <dt>Sidereal period</dt>
            <dd>
              {facts.siderealOrbitPeriodDays === null || facts.siderealOrbitPeriodYears === null
                ? NOT_APPLICABLE
                : `${formatNumber(facts.siderealOrbitPeriodDays, 2)} Earth days (${formatNumber(
                    facts.siderealOrbitPeriodYears,
                    4,
                  )} Julian yr)`}
            </dd>
          </div>
          <div>
            <dt>Eccentricity</dt>
            <dd>
              {facts.eccentricity === null ? NOT_APPLICABLE : formatNumber(facts.eccentricity, 4)}
            </dd>
          </div>
          <div>
            <dt>Inclination</dt>
            <dd>
              {facts.inclinationDeg === null
                ? NOT_APPLICABLE
                : `${formatNumber(facts.inclinationDeg, 2)}° (J2000 ecliptic)`}
            </dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>
              {elapsedDays === 0
                ? 'Fixed illustrative angle · not an ephemeris'
                : 'Period-proportional schematic angle · not an ephemeris'}
            </dd>
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
          <div>
            <dt>Fact sources</dt>
            <dd className="ss-facts__sources">
              {facts.sources.map((source, index) => (
                <span key={source.id}>
                  {index > 0 ? ' · ' : null}
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.label}
                  </a>
                </span>
              ))}
            </dd>
          </div>
        </dl>

        {facts.provenanceNote ? (
          <p className="overview-note">{facts.provenanceNote}</p>
        ) : null}

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
          <p>{SOLAR_SYSTEM_SCHEMATIC_MOTION_NOTE}</p>
          <p>{SOLAR_SYSTEM_ORBIT_NOTE}</p>
          <p>
            Physical reference facts come from{' '}
            <a href="https://ssd.jpl.nasa.gov/planets/phys_par.html" target="_blank" rel="noreferrer">
              JPL Planetary Physical Parameters
            </a>{' '}
            (mean radius and sidereal orbital period in Julian years),{' '}
            <a href="https://ssd.jpl.nasa.gov/planets/approx_pos.html" target="_blank" rel="noreferrer">
              JPL Approximate Positions of the Planets
            </a>{' '}
            (Table 1 J2000 mean-ecliptic Keplerian elements, valid 1800–2050),{' '}
            <a href="https://ssd.jpl.nasa.gov/astro_par.html" target="_blank" rel="noreferrer">
              JPL Astrodynamic Parameters
            </a>{' '}
            (1 Julian year = 365.25 days),{' '}
            <a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/" target="_blank" rel="noreferrer">
              NASA/NSSDC Planetary Fact Sheet
            </a>{' '}
            (Earth J2000 mean orbital elements), and{' '}
            <a href="https://science.nasa.gov/sun/facts/" target="_blank" rel="noreferrer">
              NASA Sun Facts
            </a>
            .
          </p>
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

function SchematicMotionStrip({
  elapsedDays,
  playing,
  rateDaysPerSec,
  onReset,
  onTogglePlay,
  onStepDays,
  onScrubDays,
  onChangeRate,
}: {
  elapsedDays: number;
  playing: boolean;
  rateDaysPerSec: SchematicPlaybackRate;
  onReset: () => void;
  onTogglePlay: () => void;
  onStepDays: (deltaDays: number) => void;
  onScrubDays: (nextDays: number) => void;
  onChangeRate: (rate: SchematicPlaybackRate) => void;
}) {
  const atStart = elapsedDays <= 0;
  const atEnd = elapsedDays >= SCHEMATIC_DURATION_MAX_DAYS - 1e-9;

  return (
    <section
      className="ss-motion"
      aria-label="Illustrative schematic motion controls"
      data-testid="schematic-motion-strip"
    >
      <div className="ss-motion__controls">
        <Button
          onClick={onReset}
          disabled={atStart && !playing}
          ariaLabel="Reset schematic motion"
          title="Reset schematic elapsed time to 0 Earth days"
        >
          ⟲ Reset
        </Button>
        <Button
          onClick={() => onStepDays(-SCHEMATIC_STEP_DAYS)}
          disabled={atStart}
          ariaLabel="Step back 10 Earth days"
          title="Step back 10 Earth days (pauses schematic motion)"
        >
          −10 d
        </Button>
        <Button
          variant="default"
          onClick={onTogglePlay}
          ariaPressed={playing}
          ariaLabel={playing ? 'Pause schematic motion' : 'Play schematic motion'}
          title={
            playing
              ? 'Pause illustrative schematic motion'
              : 'Play period-proportional schematic motion'
          }
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </Button>
        <Button
          onClick={() => onStepDays(SCHEMATIC_STEP_DAYS)}
          disabled={atEnd}
          ariaLabel="Step forward 10 Earth days"
          title="Step forward 10 Earth days (pauses schematic motion)"
        >
          +10 d
        </Button>
      </div>

      <div className="ss-motion__track">
        <input
          className="ss-motion__scrubber"
          type="range"
          min={0}
          max={SCHEMATIC_DURATION_MAX_DAYS}
          step={1}
          value={clampSchematicDays(elapsedDays)}
          aria-label="Schematic elapsed time (Earth days)"
          onChange={(event) => onScrubDays(Number(event.target.value))}
        />
        <div className="ss-motion__readout">
          <span data-testid="schematic-elapsed-readout">
            Schematic elapsed time: +{formatNumber(elapsedDays, 1)} Earth days
          </span>
          <span>
            0–{formatInteger(SCHEMATIC_DURATION_MAX_DAYS)} d (10 Julian years)
          </span>
        </div>
      </div>

      <div
        className="ss-motion__rates"
        role="group"
        aria-label="Schematic playback rate (Earth days per second)"
      >
        <span className="ss-motion__rate-label">Rate</span>
        {SCHEMATIC_RATE_OPTIONS.map((option) => (
          <Button
            key={option}
            variant={rateDaysPerSec === option ? 'primary' : 'ghost'}
            ariaPressed={rateDaysPerSec === option}
            onClick={() => onChangeRate(option)}
            title={`${option} schematic Earth days per real second`}
          >
            {option} d/s
          </Button>
        ))}
      </div>

      <div className="ss-motion__disclosure">
        <span className="ss-badge ss-badge--motion">ILLUSTRATIVE MOTION · NOT AN EPHEMERIS</span>
        <p className="ss-motion__note">{SOLAR_SYSTEM_SCHEMATIC_MOTION_NOTE}</p>
      </div>
    </section>
  );
}

export type SolarSystemOverviewProps = {
  selectedId: SolarSystemBodyId;
  onSelect: (id: SolarSystemBodyId) => void;
  elapsedDays?: number;
  onChangeElapsedDays?: Dispatch<SetStateAction<number>>;
  rateDaysPerSec?: SchematicPlaybackRate;
  onChangeRateDaysPerSec?: Dispatch<SetStateAction<SchematicPlaybackRate>>;
  onChangeMode: (mode: WorkspaceMode) => void;
};

export function SolarSystemOverview({
  selectedId,
  onSelect,
  elapsedDays: controlledElapsedDays,
  onChangeElapsedDays,
  rateDaysPerSec: controlledRateDaysPerSec,
  onChangeRateDaysPerSec,
  onChangeMode,
}: SolarSystemOverviewProps) {
  const [focusMode, setFocusMode] = useState<CameraFocusMode>('overview');
  const [focusSignal, setFocusSignal] = useState(0);
  const [localElapsedDays, setLocalElapsedDays] = useState(0);
  const [localRateDaysPerSec, setLocalRateDaysPerSec] =
    useState<SchematicPlaybackRate>(DEFAULT_SCHEMATIC_RATE);

  // Motion is opt-in and always starts paused (including under prefers-reduced-motion: reduce
  // and when returning from Earth Orbit Lab or Mission Designer).
  const [playing, setPlaying] = useState(false);

  const elapsedDays = controlledElapsedDays ?? localElapsedDays;
  const setElapsedDays = onChangeElapsedDays ?? setLocalElapsedDays;
  const rateDaysPerSec = controlledRateDaysPerSec ?? localRateDaysPerSec;
  const setRateDaysPerSec = onChangeRateDaysPerSec ?? setLocalRateDaysPerSec;

  if (playing && elapsedDays >= SCHEMATIC_DURATION_MAX_DAYS - 1e-9) {
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing) {
      return undefined;
    }

    let frame = 0;
    let last = performance.now();

    const tick = (now: number): void => {
      const deltaSeconds = Math.min(
        Math.max((now - last) / 1000, 0),
        MAX_SCHEMATIC_FRAME_DELTA_SECONDS,
      );
      last = now;
      setElapsedDays((previous) =>
        advanceSchematicDays(
          previous,
          deltaSeconds,
          rateDaysPerSec,
          SCHEMATIC_DURATION_MAX_DAYS,
        ),
      );
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, rateDaysPerSec, setElapsedDays]);

  const focusBody = (id: SolarSystemBodyId): void => {
    onSelect(id);
    setFocusMode('body');
    setFocusSignal((value) => value + 1);
  };

  const resetView = (): void => {
    setFocusMode('overview');
    setFocusSignal((value) => value + 1);
  };

  const handleResetMotion = useCallback(() => {
    setPlaying(false);
    setElapsedDays(0);
  }, [setElapsedDays]);

  const handleTogglePlay = useCallback(() => {
    setPlaying((previous) => {
      if (previous) {
        return false;
      }
      if (elapsedDays >= SCHEMATIC_DURATION_MAX_DAYS - 1e-9) {
        return false;
      }
      return true;
    });
  }, [elapsedDays]);

  const handleStepDays = useCallback(
    (deltaDays: number) => {
      setPlaying(false);
      setElapsedDays((previous) =>
        stepSchematicDays(previous, deltaDays, SCHEMATIC_DURATION_MAX_DAYS),
      );
    },
    [setElapsedDays],
  );

  const handleScrubDays = useCallback(
    (nextDays: number) => {
      setElapsedDays(clampSchematicDays(nextDays));
    },
    [setElapsedDays],
  );

  const handleModeSelect = useCallback(
    (nextMode: WorkspaceMode) => {
      setPlaying(false);
      onChangeMode(nextMode);
    },
    [onChangeMode],
  );

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
        <ModeTabs mode="overview" onChange={handleModeSelect} />
      </header>

      <main className="overview__stage">
        <SolarSystemViewport
          selectedId={selectedId}
          focusMode={focusMode}
          focusSignal={focusSignal}
          elapsedDays={elapsedDays}
          onSelect={focusBody}
        />

        <aside className="overview__column overview__column--left" aria-label="Solar System bodies">
          <BodySelector selectedId={selectedId} onSelect={focusBody} />
        </aside>

        <aside className="overview__column overview__column--right" aria-label="Selected body details">
          <SelectedBodyPanel
            selectedId={selectedId}
            focusMode={focusMode}
            elapsedDays={elapsedDays}
            onResetView={resetView}
          />
        </aside>
      </main>

      <SchematicMotionStrip
        elapsedDays={elapsedDays}
        playing={playing}
        rateDaysPerSec={rateDaysPerSec}
        onReset={handleResetMotion}
        onTogglePlay={handleTogglePlay}
        onStepDays={handleStepDays}
        onScrubDays={handleScrubDays}
        onChangeRate={setRateDaysPerSec}
      />
    </div>
  );
}
