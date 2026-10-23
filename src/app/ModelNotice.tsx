/**
 * Model, provenance, and limitation disclosure.
 *
 * This block exists so a user can never mistake this output for observational
 * data or an operational prediction. It restates the engine's own metadata
 * rather than asserting anything independently.
 */

import { Panel } from '../components/ui';
import type { ReferencePreset } from '../data/types';
import { formatNumber } from '../results/format';
import { DISPLAY_SCALE_NOTE } from '../scene/displayScale';
import { GOES16_MODEL, GOES16_REFERENCE_TARGET_ID } from '../scene/spacecraftModels';
import type { SimulationResult } from '../simulation';

export type ModelNoticeProps = {
  result: SimulationResult;
  /** Reference body radius used for altitude and the stop radius, km. */
  bodyRadiusKm: number;
  /** Present when the displayed run uses a cached reference state exactly. */
  reference?: ReferencePreset | null;
  /** Present when the run is a circular approximation derived from a cached state. */
  derivedFrom?: ReferencePreset | null;
};

export function ModelNotice({
  result,
  bodyRadiusKm,
  reference = null,
  derivedFrom = null,
}: ModelNoticeProps) {
  const source = reference ?? derivedFrom;
  const goesModel = source?.provenance.targetId === GOES16_REFERENCE_TARGET_ID;
  return (
    <Panel title="Model & limitations" subtitle="Read before interpreting any number">
      <p className="note">
        Simplified two-body model; not an ephemeris or operational predictor. Open for units, frame,
        provenance, scale, and imagery credits.
      </p>
      <details className="model-disclosure">
        <summary>Read model limitations and provenance</summary>
        <dl className="notice">
        <dt>Model</dt>
        <dd>
          Simplified two-body point-mass gravity: a massless test particle around a fixed central
          body. Educational model, not an ephemeris or flight-dynamics product.
        </dd>

        <dt>Units</dt>
        <dd>
          {result.units.distance}, {result.units.time}, {result.units.mass}, {result.units.velocity},
          and {result.units.gravitationalParameter}. Every displayed value carries its unit.
        </dd>

        <dt>Frame</dt>
        <dd>
          Earth-centered inertial axes ({result.frame.id}), origin at the central body's centre of
          mass, right-handed, +z toward the north rotation axis. No epoch is attached and no
          precession / Earth-orientation handling exists: states are relative to t = 0 of this run.
          {source
            ? ` The cached reference state is expressed in ${source.provenance.frame} at ${source.provenance.epochTdb}; those labels are provenance metadata, not a transformation performed by this model.`
            : ''}
        </dd>

        <dt>Integrator</dt>
        <dd>
          Fixed-step kick-drift-kick leapfrog (symplectic, second order), {result.timestepSeconds} s
          step. Energy error stays bounded but is not exactly zero, and phase error accumulates.
        </dd>

        <dt>Central body</dt>
        <dd>
          GM = {formatNumber(result.centralBody.gravitationalParameterKm3PerS2, 4)} km³/s². Fixed at
          the origin by definition; no rotation, oblateness, terrain, or atmosphere. Altitudes and the
          stop radius are referenced to a smooth sphere of the mean radius,{' '}
          {formatNumber(bodyRadiusKm, 1)} km.
        </dd>

        <dt>Preset provenance</dt>
        <dd>
          {reference ? (
            <>
              Cached <strong>NASA/JPL Horizons</strong> reference state for{' '}
              {reference.provenance.targetName} ({reference.provenance.targetId}) at{' '}
              {reference.provenance.epochTdb}, {reference.provenance.frame},{' '}
              {reference.provenance.center}; units {reference.provenance.units.distance},{' '}
              {reference.provenance.units.time}, {reference.provenance.units.velocity}. Retrieved{' '}
              {reference.provenance.retrievedAt}. The initial vector is provider data; the simulated
              trajectory is a <strong>hypothetical two-body propagation, not the satellite's real
              ephemeris</strong>. No live request is made at runtime.
            </>
          ) : derivedFrom ? (
            <>
              This is a <strong>circular approximation derived from a cached NASA/JPL Horizons
              reference state</strong> for {derivedFrom.provenance.targetName} (
              {derivedFrom.provenance.targetId}) at {derivedFrom.provenance.epochTdb},{' '}
              {derivedFrom.provenance.frame}, {derivedFrom.provenance.center}. The original provider
              vector is retained in the record but is not propagated; the circular initial state is a
              user edit. The simulated trajectory is a <strong>hypothetical two-body propagation, not
              the satellite's real ephemeris</strong>. No live request is made at runtime.
            </>
          ) : (
            <>
              Synthetic educational idealization built from recorded Earth constants.{' '}
              <strong>Not NASA/JPL observational data</strong>, no real spacecraft, no launch epoch,
              no ephemeris.
            </>
          )}
        </dd>

        {goesModel ? (
          <>
            <dt>GOES spacecraft mesh</dt>
            <dd>
              This GOES-16 reference-derived run displays a local NASA GOES spacecraft glTF mesh as
              a <strong>render-only</strong> marker at the recorded sample. It adds no mass,
              attitude, thrust, fuel, or dynamics and does not change the simulated trajectory.
              Source:{' '}
              <a href={GOES16_MODEL.sourcePageUrl} target="_blank" rel="noreferrer">
                NASA GOES Spacecraft 3D Model
              </a>
              , {GOES16_MODEL.format}, {GOES16_MODEL.bytes.toLocaleString('en-US')} bytes, retrieved{' '}
              {GOES16_MODEL.retrievedAt}. {GOES16_MODEL.creditDetail} Usage:{' '}
              <a href={GOES16_MODEL.usageUrl} target="_blank" rel="noreferrer">
                NASA Images and Media Usage Guidelines
              </a>
              . The file is stored locally and served from this app; no runtime model request is
              made.
            </dd>
          </>
        ) : null}

        <dt>Playback</dt>
        <dd>
          Sample-quantized: {result.sampleIntervalSeconds} s between recorded states, replay only. No
          interpolated or predicted states are generated for smoothness.
        </dd>

        <dt>Stopping policy</dt>
        <dd>
          A run stops and reports a warning if the particle crosses the stop radius, leaves the
          numerically supported range, produces a non-finite state, or deviates more than 10% from
          the conserved specific orbital energy. The energy rule is valid only for this conservative
          force model.
        </dd>

        <dt>Comparison</dt>
        <dd>
          Baseline and candidate series come from two separate engine runs and keep their own
          parameters, timestep, and samples. The chart connects recorded samples only; it computes no
          intermediate states, never extends a stopped run, and never pads a series to match another
          one. Edited parameters become a result only after selecting Run candidate.
        </dd>

        <dt>Scale</dt>
        <dd>{DISPLAY_SCALE_NOTE} The viewport is labelled NOT TO SCALE.</dd>

        <dt>Imagery</dt>
        <dd>
          Earth surface and cloud textures are static NASA Blue Marble visualization assets, not
          current weather or a physical model. Surface:{' '}
          <a
            href="https://earthobservatory.nasa.gov/features/BlueMarble"
            target="_blank"
            rel="noreferrer"
          >
            NASA Earth Observatory, Blue Marble: Next Generation
          </a>
          , produced by Reto Stöckli (NASA Goddard Space Flight Center). Clouds: NASA Earth
          Observatory Blue Marble Clouds. NASA media usage guidance:{' '}
          <a href="https://www.nasa.gov/nasa-brand-center/images-and-media/" target="_blank" rel="noreferrer">
            NASA Images and Media Usage Guidelines
          </a>
          . No NASA insignia or logo is used. Both textures are stored locally and served from this app;
          the app makes no remote or provider texture request at runtime.
        </dd>

        <dt>Not for operational use</dt>
        <dd>
          Not a flight-safety, navigation, collision-risk, or impact-prediction tool. Do not use these
          numbers for real mission decisions.
        </dd>
        </dl>
      </details>
    </Panel>
  );
}
