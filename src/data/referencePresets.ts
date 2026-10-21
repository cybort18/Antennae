/**
 * Cached reference presets.
 *
 * The preset is built once from the provider-shaped fixture through the Horizons
 * parser. A malformed fixture becomes an explicit load error rather than a
 * partially usable preset or a silent fallback to synthetic data.
 */

import { vec3 } from '../simulation';
import {
  GOES16_HORIZONS_QUERY,
  GOES16_HORIZONS_QUERY_URL,
  GOES16_HORIZONS_RESULT,
  GOES16_HORIZONS_RETRIEVED_AT,
  GOES16_HORIZONS_SIGNATURE,
  GOES16_HORIZONS_SOURCE_URL,
} from './fixtures/goes16Horizons';
import { parseHorizonsVector, ReferenceDataError } from './horizons';
import type { ReferencePreset } from './types';

export type ReferencePresetLoadResult = {
  presets: ReferencePreset[];
  error: string | null;
};

function createGoes16Preset(): ReferencePreset {
  const parsed = parseHorizonsVector({
    signature: GOES16_HORIZONS_SIGNATURE,
    result: GOES16_HORIZONS_RESULT,
  });

  if (parsed.targetId !== '-141866') {
    throw new ReferenceDataError(
      `Expected GOES-16 target id -141866; received ${parsed.targetId}.`,
    );
  }

  return {
    id: 'jpl-horizons-goes16-2026-10-20',
    label: 'GOES-16 — cached JPL Horizons reference state',
    description:
      'Geostationary weather satellite state from JPL Horizons. The cached vector is used as an ' +
      'initial condition for the simplified two-body model; the simulated trajectory is hypothetical, ' +
      'not the satellite’s real ephemeris.',
    provenance: {
      provider: 'NASA/JPL Horizons',
      apiVersion: parsed.signature.version,
      targetName: parsed.targetName,
      targetId: parsed.targetId,
      epochTdb: parsed.epochTdb,
      julianDateTdb: parsed.julianDateTdb,
      frame: parsed.frame,
      center: `${parsed.centerName} (${parsed.centerId}), ${parsed.centerSite}`,
      units: { distance: 'km', time: 's', velocity: 'km/s' },
      retrievedAt: GOES16_HORIZONS_RETRIEVED_AT,
      sourceUrl: GOES16_HORIZONS_SOURCE_URL,
      queryUrl: GOES16_HORIZONS_QUERY_URL,
      query: { ...GOES16_HORIZONS_QUERY },
      outputType: parsed.outputType,
      notes:
        'Geometric Cartesian state with no light-time or aberration corrections. The epoch is ' +
        'metadata for audit; the model has no epoch/time-scale handling and treats this instant as ' +
        't = 0. ICRF axes are used directly as the model’s Earth-centered inertial axes; no frame ' +
        'rotation is applied. This is a cached response, not a live request.',
    },
    state: {
      positionKm: vec3(
        parsed.state.positionKm.x,
        parsed.state.positionKm.y,
        parsed.state.positionKm.z,
      ),
      velocityKmPerS: vec3(
        parsed.state.velocityKmPerS.x,
        parsed.state.velocityKmPerS.y,
        parsed.state.velocityKmPerS.z,
      ),
    },
  };
}

/**
 * Loads the cached preset list. The current milestone ships exactly one curated
 * preset; parsing errors are reported to the caller so the UI can show an
 * explicit unavailable state without replacing it with another target.
 */
export function loadReferencePresets(): ReferencePresetLoadResult {
  try {
    return { presets: [createGoes16Preset()], error: null };
  } catch (error) {
    return {
      presets: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
