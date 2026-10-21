import { describe, expect, it } from 'vitest';

import { EARTH_MEAN_RADIUS_KM, magnitude } from '../../simulation';
import { loadReferencePresets } from '../referencePresets';

describe('loadReferencePresets', () => {
  it('loads the cached GOES-16 preset without a load error', () => {
    const result = loadReferencePresets();

    expect(result.error).toBeNull();
    expect(result.presets).toHaveLength(1);
    const preset = result.presets[0];
    expect(preset.id).toBe('jpl-horizons-goes16-2026-10-20');
    expect(preset.label).toContain('GOES-16');
    expect(preset.description).toContain('hypothetical');
  });

  it('preserves the provider target, epoch, frame, center, units, and retrieval metadata', () => {
    const preset = loadReferencePresets().presets[0];

    expect(preset.provenance.provider).toBe('NASA/JPL Horizons');
    expect(preset.provenance.apiVersion).toBe('1.2');
    expect(preset.provenance.targetName).toBe('GOES-16 (spacecraft)');
    expect(preset.provenance.targetId).toBe('-141866');
    expect(preset.provenance.epochTdb).toBe('2026-Oct-20 00:00:00.0000 TDB');
    expect(preset.provenance.julianDateTdb).toBe(2461333.5);
    expect(preset.provenance.frame).toBe('ICRF');
    expect(preset.provenance.center).toBe('Earth (399), BODY CENTER');
    expect(preset.provenance.units).toEqual({ distance: 'km', time: 's', velocity: 'km/s' });
    expect(preset.provenance.retrievedAt).toBe('2026-10-20T08:11:49Z');
    expect(preset.provenance.outputType).toContain('GEOMETRIC');
    expect(preset.provenance.query.ephemType).toBe('VECTORS');
    expect(preset.provenance.query.center).toBe('500@399');
    expect(preset.provenance.query.tlist).toBe('2461333.5');
    expect(preset.provenance.query.refSystem).toBe('ICRF');
    expect(preset.provenance.queryUrl).toContain('-141866');
  });

  it('keeps the exact state vector and derives a geostationary-scale radius/speed', () => {
    const preset = loadReferencePresets().presets[0];
    const radiusKm = magnitude(preset.state.positionKm);
    const speedKmPerS = magnitude(preset.state.velocityKmPerS);

    expect(radiusKm).toBeCloseTo(42157.962, 3);
    expect(radiusKm - EARTH_MEAN_RADIUS_KM).toBeCloseTo(35786.962, 3);
    expect(speedKmPerS).toBeCloseTo(3.075163, 6);
    expect(preset.state.positionKm.z).toBeCloseTo(-170.859408, 6);
    expect(preset.state.velocityKmPerS.x).toBeCloseTo(2.994143623, 9);
  });
});
