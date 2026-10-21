import { describe, expect, it } from 'vitest';

import {
  GOES16_HORIZONS_RESULT,
  GOES16_HORIZONS_SIGNATURE,
} from '../fixtures/goes16Horizons';
import {
  parseHorizonsVector,
  ReferenceDataError,
  type HorizonsApiPayload,
  type HorizonsSignature,
} from '../horizons';

function payload(result = GOES16_HORIZONS_RESULT): HorizonsApiPayload {
  return {
    signature: { ...GOES16_HORIZONS_SIGNATURE },
    result,
  };
}

function expectInvalid(result: string, signature: HorizonsSignature = { ...GOES16_HORIZONS_SIGNATURE }) {
  expect(() => parseHorizonsVector({ signature, result })).toThrow(ReferenceDataError);
}

describe('parseHorizonsVector', () => {
  it('parses the cached GOES-16 state and preserves its provenance fields', () => {
    const parsed = parseHorizonsVector(payload());

    expect(parsed.signature).toEqual({ source: 'NASA/JPL Horizons API', version: '1.2' });
    expect(parsed.targetName).toBe('GOES-16 (spacecraft)');
    expect(parsed.targetId).toBe('-141866');
    expect(parsed.centerName).toBe('Earth');
    expect(parsed.centerId).toBe('399');
    expect(parsed.centerSite).toBe('BODY CENTER');
    expect(parsed.frame).toBe('ICRF');
    expect(parsed.outputUnits).toBe('KM-S');
    expect(parsed.outputType).toBe('GEOMETRIC cartesian states');
    expect(parsed.epochTdb).toBe('2026-Oct-20 00:00:00.0000 TDB');
    expect(parsed.julianDateTdb).toBe(2461333.5);
  });

  it('parses the exact position and velocity components in km and km/s', () => {
    const { state } = parseHorizonsVector(payload());

    expect(state.positionKm.x).toBeCloseTo(9603.113140073136, 9);
    expect(state.positionKm.y).toBeCloseTo(-41049.29701925249, 8);
    expect(state.positionKm.z).toBeCloseTo(-170.8594080548074, 9);
    expect(state.velocityKmPerS.x).toBeCloseTo(2.994143623466347, 12);
    expect(state.velocityKmPerS.y).toBeCloseTo(0.7001000064703707, 12);
    expect(state.velocityKmPerS.z).toBeCloseTo(-0.03991601822488292, 12);
  });

  it('rejects a payload from a different source or with no signature version', () => {
    expectInvalid(GOES16_HORIZONS_RESULT, {
      source: 'Synthetic generator',
      version: '1.2',
    });
    expectInvalid(GOES16_HORIZONS_RESULT, {
      source: 'NASA/JPL Horizons API',
      version: '',
    });
  });

  it('rejects a response without the $$SOE/$$EOE table', () => {
    expectInvalid(GOES16_HORIZONS_RESULT.replace(/\$\$SOE[\s\S]*?\$\$EOE/, ''));
  });

  it('rejects more than one vector row', () => {
    const row = GOES16_HORIZONS_RESULT.slice(
      GOES16_HORIZONS_RESULT.indexOf('$$SOE') + 5,
      GOES16_HORIZONS_RESULT.indexOf('$$EOE'),
    ).trim();
    const duplicated = GOES16_HORIZONS_RESULT.replace('$$EOE', `${row}\n${row}\n$$EOE`);
    expectInvalid(duplicated);
  });

  it('rejects a row with the wrong number of columns, an empty cell, or a non-finite component', () => {
    expectInvalid(GOES16_HORIZONS_RESULT.replace(', -4.104929701925249E+04', ''));
    expectInvalid(GOES16_HORIZONS_RESULT.replace('9.603113140073136E+03', ''));
    expectInvalid(GOES16_HORIZONS_RESULT.replace('9.603113140073136E+03', 'NaN'));
    expectInvalid(GOES16_HORIZONS_RESULT.replace('9.603113140073136E+03', '0x10'));
  });

  it('rejects a vector row whose calendar epoch does not match the header start time', () => {
    expectInvalid(
      GOES16_HORIZONS_RESULT.replace(
        'Start time      : A.D. 2026-Oct-20 00:00:00.0000 TDB',
        'Start time      : A.D. 2026-Oct-20 00:01:00.0000 TDB',
      ),
    );
  });

  it('rejects a Julian date that disagrees with the row calendar or a non-TDB table label', () => {
    expectInvalid(GOES16_HORIZONS_RESULT.replace('2461333.500000000', '2461333.600000000'));
    expectInvalid(
      GOES16_HORIZONS_RESULT.replace('Calendar Date (TDB)', 'Calendar Date (UT)'),
    );
  });

  it('rejects an Earth-centered state with a zero position magnitude', () => {
    const zeroed = GOES16_HORIZONS_RESULT
      .replace('9.603113140073136E+03', '0')
      .replace('-4.104929701925249E+04', '0')
      .replace('-1.708594080548074E+02', '0');
    expectInvalid(zeroed);
  });

  it('rejects unsupported frame, units, center, center-site, time scale, or output type', () => {
    expectInvalid(GOES16_HORIZONS_RESULT.replace('Reference frame : ICRF', 'Reference frame : J2000'));
    expectInvalid(GOES16_HORIZONS_RESULT.replace('Output units    : KM-S', 'Output units    : AU-D'));
    expectInvalid(
      GOES16_HORIZONS_RESULT.replace('Center body name: Earth (399)', 'Center body name: Mars (499)'),
    );
    expectInvalid(
      GOES16_HORIZONS_RESULT.replace('Center-site name: BODY CENTER', 'Center-site name: GEOCENTRIC'),
    );
    expectInvalid(
      GOES16_HORIZONS_RESULT.replace(
        'Start time      : A.D. 2026-Oct-20 00:00:00.0000 TDB',
        'Start time      : A.D. 2026-Oct-20 00:00:00.0000 UT',
      ),
    );
    expectInvalid(
      GOES16_HORIZONS_RESULT.replace(
        'Output type     : GEOMETRIC cartesian states',
        'Output type     : ASTROMETRIC cartesian states',
      ),
    );
    expectInvalid(
      GOES16_HORIZONS_RESULT.replace(
        'Output type     : GEOMETRIC cartesian states',
        'Output type     : NON-GEOMETRIC cartesian states',
      ),
    );
  });
});
