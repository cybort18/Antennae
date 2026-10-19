/**
 * Model, provenance, and limitation disclosure.
 *
 * This block exists so a user can never mistake this output for observational
 * data or an operational prediction. It restates the engine's own metadata
 * rather than asserting anything independently.
 */

import { Panel } from '../components/ui';
import { formatNumber } from '../results/format';
import { DISPLAY_SCALE_NOTE } from '../scene/displayScale';
import type { SimulationResult } from '../simulation';

export type ModelNoticeProps = {
  result: SimulationResult;
  /** Reference body radius used for altitude and the stop radius, km. */
  bodyRadiusKm: number;
};

export function ModelNotice({ result, bodyRadiusKm }: ModelNoticeProps) {
  return (
    <Panel title="Model & limitations" subtitle="Read before interpreting any number">
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
          Synthetic educational idealization built from recorded Earth constants. <strong>Not NASA/JPL
          observational data</strong>, no real spacecraft, no launch epoch, no ephemeris.
        </dd>

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

        <dt>Not for operational use</dt>
        <dd>
          Not a flight-safety, navigation, collision-risk, or impact-prediction tool. Do not use these
          numbers for real mission decisions.
        </dd>
      </dl>
    </Panel>
  );
}
