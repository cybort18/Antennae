/**
 * Solar System Overview screen.
 *
 * This screen owns display selection, camera framing, and an opt-in,
 * period-proportional schematic motion control. It has no import from the
 * simulation or comparison layers, and it never calls the physics engine. The
 * Earth Orbit Lab and Mission Designer are the separate surfaces where the
 * two-body engine can be run.
 */

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

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
import {
  computeOrbitalState,
  formatJulianDateUtc,
  isoDateToJulianDate,
  julianDateToIsoDate,
  nowToJulianDate,
} from '../solarSystem/astronomy';
import { clampJulianDate } from '../solarSystem/time';
import { ASTRONOMY_PRESETS, presetById } from '../solarSystem/presets';
import { ModeTabs, type WorkspaceMode } from './ModeTabs';
import { type BennuMeshStatus } from '../scene/bennuModel';
import { SolarSystemViewport } from '../scene/SolarSystemViewport';

const NOT_APPLICABLE = 'Not applicable (central star)';

function formatMeanRadiusKm(meanRadiusKm: number): string {
  if (Number.isInteger(meanRadiusKm)) {
    return `${formatInteger(meanRadiusKm)} km`;
  }
  if (meanRadiusKm < 1) {
    return `${formatNumber(meanRadiusKm, 5)} km (${formatNumber(meanRadiusKm * 1000, 1)} m)`;
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
        <p className="panel__subtitle">
          Sun, eight planets &amp; 101955 Bennu · schematic reference layout
        </p>
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
                      : body.orderFromSun === null
                        ? 'Small body · Apollo NEA (between Earth & Mars)'
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
  simulationJd,
  bennuMeshStatus,
  onResetView,
  onChangeMode,
}: {
  selectedId: SolarSystemBodyId;
  focusMode: CameraFocusMode;
  elapsedDays: number;
  simulationJd: number;
  bennuMeshStatus: BennuMeshStatus;
  onResetView: () => void;
  onChangeMode: (mode: WorkspaceMode) => void;
}) {
  const body = bodyById(selectedId);
  const texture = body.texture;
  const model = body.model;
  const { facts } = body;

  const liveState = useMemo(() => {
    if (selectedId === 'sun' || !Number.isFinite(simulationJd)) {
      return null;
    }
    return computeOrbitalState(selectedId, simulationJd);
  }, [selectedId, simulationJd]);

  return (
    <section
      className="panel overview-panel overview-panel--details"
      aria-labelledby="ss-selected-heading"
      aria-live="polite"
    >
      <header className="panel__header ss-selected__header">
        <div>
          <h2 id="ss-selected-heading">Selected body</h2>
          <p className="panel__subtitle">Reference visualization &amp; physical facts</p>
        </div>
        <Button
          variant={focusMode === 'overview' ? 'primary' : 'default'}
          onClick={onResetView}
          title="Return the camera to the whole Solar System"
        >
          Overview view
        </Button>
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
                : body.orderFromSun === null
                  ? 'Between Earth and Mars (near-Earth asteroid; not a planet)'
                  : `${body.orderFromSun} of 8 from the Sun`}
            </dd>
          </div>
          <div>
            <dt>Class</dt>
            <dd>{facts.orbitClassLabel ?? kindLabel(body.kind)}</dd>
          </div>
          <div>
            <dt>Mean radius</dt>
            <dd>
              {formatMeanRadiusKm(facts.meanRadiusKm)}
              {facts.effectiveDiameterKm !== undefined
                ? ` (derived: ${formatNumber(facts.effectiveDiameterKm, 5)} km diameter / 2)`
                : ''}
            </dd>
          </div>
          {facts.rotationPeriodHours !== undefined ? (
            <div>
              <dt>Rotation period</dt>
              <dd>{formatNumber(facts.rotationPeriodHours, 4)} h (synodic)</dd>
            </div>
          ) : null}
          <div>
            <dt>Semi-major axis</dt>
            <dd>
              {facts.semiMajorAxisAu === null
                ? NOT_APPLICABLE
                : `${formatNumber(facts.semiMajorAxisAu, 4)} AU`}
            </dd>
          </div>
          {facts.perihelionAu !== undefined && facts.aphelionAu !== undefined ? (
            <div>
              <dt>Perihelion / aphelion</dt>
              <dd>
                {formatNumber(facts.perihelionAu, 4)} AU / {formatNumber(facts.aphelionAu, 4)} AU
              </dd>
            </div>
          ) : null}
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
              {body.kind === 'small-body'
                ? elapsedDays === 0
                  ? 'Fixed illustrative angle on circular guide · not an ephemeris or rendered ellipse'
                  : 'Period-proportional circular schematic angle · not an ephemeris or rendered ellipse'
                : elapsedDays === 0
                  ? 'Fixed illustrative angle · not an ephemeris'
                  : 'Period-proportional schematic angle · not an ephemeris'}
            </dd>
          </div>
          <div>
            <dt>Orbit guide</dt>
            <dd>
              {body.kind === 'small-body'
                ? 'Compressed circular schematic between Earth & Mars (real eccentric/inclined orbit not rendered)'
                : 'Schematic order only'}
            </dd>
          </div>
          <div>
            <dt>Display surface</dt>
            <dd>
              {model ? (
                <>
                  <a href={model.sourcePageUrl} target="_blank" rel="noreferrer">
                    {model.sourceLabel} 3D mesh (NASA VTAD)
                  </a>
                  {focusMode === 'overview'
                    ? ' · procedural faceted shape at wide overview (focus body to load mesh)'
                    : bennuMeshStatus === 'fallback'
                      ? ' · mesh unavailable; procedural faceted rocky fallback active'
                      : bennuMeshStatus === 'ready'
                        ? ' · lazy-loaded GLB active (exaggerated display scale)'
                        : ' · loading GLB (procedural faceted rocky fallback active)'}
                </>
              ) : texture ? (
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
          {liveState ? (
            <>
              <div>
                <dt>Live distance</dt>
                <dd>
                  <strong>{`${formatNumber(liveState.distanceAu, 4)} AU`}</strong> (
                  {formatNumber(liveState.distanceKm / 1000000, 2)}M km)
                </dd>
              </div>
              <div>
                <dt>Orbital speed</dt>
                <dd>
                  <strong>{`${formatNumber(liveState.speedKmS, 2)} km/s`}</strong> (vis-viva)
                </dd>
              </div>
              <div>
                <dt>True anomaly</dt>
                <dd>{formatNumber(liveState.trueAnomalyDeg, 1)}°</dd>
              </div>
              <div>
                <dt>J2000 [X, Y, Z]</dt>
                <dd>
                  [{formatNumber(liveState.positionAu[0], 2)}, {formatNumber(liveState.positionAu[1], 2)}, {formatNumber(liveState.positionAu[2], 2)}] AU
                </dd>
              </div>
            </>
          ) : null}
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

        {selectedId === 'mars' ? (
          <div className="overview-mars-portal" data-testid="mars-outpost-portal">
            <span className="overview-mars-portal__badge">NASA SPACE APPS 2026 CHALLENGE</span>
            <h4 className="overview-mars-portal__title">Active Capstone Mission: Sol 42 Jezero Outpost Crisis</h4>
            <p className="overview-mars-portal__desc">
              Experience the official challenge: manage life support, power grid, water recovery, and food production during severe Martian dust storms.
            </p>
            <Button
              variant="primary"
              onClick={() => onChangeMode('outpost')}
            >
              Launch Outpost Mission Trainer →
            </Button>
          </div>
        ) : null}

        {facts.provenanceNote ? (
          <p className="overview-note">{facts.provenanceNote}</p>
        ) : null}

        <p className="overview-note">{SOLAR_SYSTEM_SCALE_NOTE}</p>

        <details className="ss-disclosure">
          <summary>Sources, scale &amp; limitations</summary>
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
            <a href="https://ssd-api.jpl.nasa.gov/doc/sbdb.html" target="_blank" rel="noreferrer">
              JPL Small-Body Database (SBDB) API
            </a>{' '}
            and{' '}
            <a href="https://ssd.jpl.nasa.gov/sb/orbits.html" target="_blank" rel="noreferrer">
              JPL Small-Body Orbital Elements
            </a>{' '}
            (101955 Bennu physical parameters and osculating elements),{' '}
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
          {model ? (
            <p>
              {model.credit}. {model.creditDetail} {model.renderNote}{' '}
              <a href={model.sourcePageUrl} target="_blank" rel="noreferrer">
                Source page
              </a>
              {' · '}
              <a href={model.fileUrl} target="_blank" rel="noreferrer">
                Original GLB
              </a>
            </p>
          ) : texture ? (
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
            Surface textures and 3D meshes are display assets, not physical data. If a local texture
            or mesh cannot be loaded, that body keeps its procedural fallback shape or colour. NASA
            content is used with the NASA Images and Media Usage Guidelines; no NASA insignia or
            logo is used.
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
  simulationJd,
  onReset,
  onTogglePlay,
  onStepDays,
  onScrubDays,
  onChangeRate,
  onJumpDate,
  onSelectPreset,
}: {
  elapsedDays: number;
  playing: boolean;
  rateDaysPerSec: SchematicPlaybackRate;
  simulationJd: number;
  onReset: () => void;
  onTogglePlay: () => void;
  onStepDays: (deltaDays: number) => void;
  onScrubDays: (nextDays: number) => void;
  onChangeRate: (rate: SchematicPlaybackRate) => void;
  onJumpDate: (isoDate: string) => void;
  onSelectPreset: (presetId: string) => void;
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
          title="Reset simulation time to current system date (Now)"
        >
          ⟲ Now
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
        <div className="ss-motion__date-picker-wrap">
          <label htmlFor="ss-date-picker-input" className="ss-motion__date-label">
            Date
          </label>
          <input
            id="ss-date-picker-input"
            className="ss-motion__date-picker"
            type="date"
            min="1800-01-01"
            max="2050-12-31"
            value={julianDateToIsoDate(simulationJd)}
            aria-label="Jump to simulation date"
            title="Jump to date between 1800 AD and 2050 AD"
            onChange={(event) => onJumpDate(event.target.value)}
          />
        </div>
        <div className="ss-motion__preset-wrap">
          <label htmlFor="ss-preset-select" className="ss-motion__date-label">
            Preset
          </label>
          <select
            id="ss-preset-select"
            className="ss-preset-select"
            aria-label="Verified event presets"
            defaultValue=""
            data-testid="astronomy-preset-select"
            onChange={(event) => {
              if (event.target.value) {
                onSelectPreset(event.target.value);
                event.target.value = '';
              }
            }}
          >
            <option value="" disabled>
              Select event...
            </option>
            <optgroup label="Astronomical Epochs">
              {ASTRONOMY_PRESETS.filter((p) => p.category === 'epoch').map((p) => (
                <option key={p.id} value={p.id} title={p.description}>
                  {p.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Historic NASA Missions">
              {ASTRONOMY_PRESETS.filter((p) => p.category === 'historic-mission').map((p) => (
                <option key={p.id} value={p.id} title={p.description}>
                  {p.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Planetary Science & Future">
              {ASTRONOMY_PRESETS.filter(
                (p) => p.category === 'planetary-science' || p.category === 'future-mission',
              ).map((p) => (
                <option key={p.id} value={p.id} title={p.description}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="ss-motion__track">
        <input
          className="ss-motion__scrubber"
          type="range"
          min={0}
          max={SCHEMATIC_DURATION_MAX_DAYS}
          step={0.1}
          value={clampSchematicDays(elapsedDays)}
          aria-label="Schematic elapsed time (Earth days)"
          onChange={(event) => onScrubDays(Number(event.target.value))}
        />
        <div className="ss-motion__readout">
          <span data-testid="schematic-elapsed-readout">
            Schematic elapsed time: +{formatNumber(elapsedDays, 1)} Earth days
          </span>
          <span className="ss-motion__date-readout" data-testid="simulation-date-readout">
            Date: <strong>{formatJulianDateUtc(simulationJd)}</strong>
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
        <span className="ss-badge ss-badge--motion">STANDISH J2000 (1800–2050 AD)</span>
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
  initialPlaying?: boolean;
};

export function SolarSystemOverview({
  selectedId,
  onSelect,
  elapsedDays: controlledElapsedDays,
  onChangeElapsedDays,
  rateDaysPerSec: controlledRateDaysPerSec,
  onChangeRateDaysPerSec,
  onChangeMode,
  initialPlaying,
}: SolarSystemOverviewProps) {
  const [focusMode, setFocusMode] = useState<CameraFocusMode>('overview');
  const [focusSignal, setFocusSignal] = useState(0);
  const [bennuMeshStatus, setBennuMeshStatus] =
    useState<BennuMeshStatus>('procedural-overview');
  const [localElapsedDays, setLocalElapsedDays] = useState(0);
  const [localRateDaysPerSec, setLocalRateDaysPerSec] =
    useState<SchematicPlaybackRate>(DEFAULT_SCHEMATIC_RATE);

  const [baseJd, setBaseJd] = useState(() => nowToJulianDate());

  // Decision 1: Solar System playback starts automatically at 1 Earth day per real second
  // whenever entering Solar System mode, unless configured otherwise.
  const [playing, setPlaying] = useState(initialPlaying ?? true);
  const [showTrails, setShowTrails] = useState(false);

  const elapsedDays = controlledElapsedDays ?? localElapsedDays;
  const setElapsedDays = onChangeElapsedDays ?? setLocalElapsedDays;
  const rateDaysPerSec = controlledRateDaysPerSec ?? localRateDaysPerSec;
  const setRateDaysPerSec = onChangeRateDaysPerSec ?? setLocalRateDaysPerSec;

  const simulationJd = clampJulianDate(baseJd + elapsedDays);

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

  const focusBody = useCallback(
    (id: SolarSystemBodyId): void => {
      onSelect(id);
      setFocusMode('body');
      setFocusSignal((value) => value + 1);
    },
    [onSelect],
  );

  const resetView = (): void => {
    setFocusMode('overview');
    setFocusSignal((value) => value + 1);
  };

  const handleResetMotion = useCallback(() => {
    setPlaying(false);
    setBaseJd(nowToJulianDate());
    setElapsedDays(0);
  }, [setElapsedDays]);

  const handleJumpDate = useCallback(
    (isoDate: string) => {
      if (!isoDate) {
        return;
      }
      setPlaying(false);
      const targetJd = isoDateToJulianDate(isoDate);
      setBaseJd(targetJd);
      setElapsedDays(0);
    },
    [setElapsedDays],
  );

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

  const handleToggleTrails = useCallback(() => {
    setShowTrails((previous) => !previous);
  }, []);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const preset = presetById(presetId);
      if (!preset) {
        return;
      }
      setPlaying(false);
      setBaseJd(preset.julianDate);
      setElapsedDays(0);
      if (preset.targetBodyId) {
        focusBody(preset.targetBodyId);
      }
    },
    [focusBody, setElapsedDays],
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
        <div className="topbar__brand">
          <span className="topbar__mark" aria-hidden="true" />
          <span className="topbar__title">Antennae</span>
          <span className="topbar__product">Space Sandbox</span>
        </div>
        <ModeTabs mode="overview" onChange={handleModeSelect} />
        <div className="overview__summary">
          <h1 id="overview-title" tabIndex={-1}>
            Solar System Overview
          </h1>
          <p className="overview__subtitle">Reference visualization · not a dynamics simulation</p>
        </div>
      </header>

      <main className="overview__stage">
        <SolarSystemViewport
          selectedId={selectedId}
          focusMode={focusMode}
          focusSignal={focusSignal}
          elapsedDays={elapsedDays}
          julianDate={simulationJd}
          showTrails={showTrails}
          onToggleTrails={handleToggleTrails}
          onSelect={focusBody}
          onBennuMeshStatusChange={setBennuMeshStatus}
        />

        <aside className="overview__column overview__column--left" aria-label="Solar System bodies">
          <BodySelector selectedId={selectedId} onSelect={focusBody} />
        </aside>

        <aside className="overview__column overview__column--right" aria-label="Selected body details">
          <SelectedBodyPanel
            selectedId={selectedId}
            focusMode={focusMode}
            elapsedDays={elapsedDays}
            simulationJd={simulationJd}
            bennuMeshStatus={bennuMeshStatus}
            onResetView={resetView}
            onChangeMode={handleModeSelect}
          />
        </aside>
      </main>

      <SchematicMotionStrip
        elapsedDays={elapsedDays}
        playing={playing}
        rateDaysPerSec={rateDaysPerSec}
        simulationJd={simulationJd}
        onReset={handleResetMotion}
        onTogglePlay={handleTogglePlay}
        onStepDays={handleStepDays}
        onScrubDays={handleScrubDays}
        onChangeRate={setRateDaysPerSec}
        onJumpDate={handleJumpDate}
        onSelectPreset={handleSelectPreset}
      />
    </div>
  );
}
