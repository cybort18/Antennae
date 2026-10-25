import { describe, expect, it } from 'vitest';
import {
  ASTRONOMY_PRESETS,
  presetById,
} from '../astronomyPresets';
import {
  MIN_SUPPORTED_JD,
  MAX_SUPPORTED_JD,
} from '../../astronomy/julianDate';

describe('Astronomy Presets Registry', () => {
  it('contains at least 7 verified presets spanning epochs, historic missions, and future windows', () => {
    expect(ASTRONOMY_PRESETS.length).toBeGreaterThanOrEqual(7);
  });

  it('ensures every preset has valid UTC dates, non-empty labels, descriptions, and credible source URLs', () => {
    for (const preset of ASTRONOMY_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.description.length).toBeGreaterThan(20);
      expect(preset.sourceUrl).toMatch(/^https:\/\/(www\.)?(nasa\.gov|science\.nasa\.gov|ssd\.jpl\.nasa\.gov|voyager\.jpl\.nasa\.gov)/);
      expect(preset.sourceLabel).toBeTruthy();
      expect(preset.isoDateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('guarantees all presets fall strictly within the 1800 AD to 2050 AD supported baseline', () => {
    for (const preset of ASTRONOMY_PRESETS) {
      expect(preset.julianDate).toBeGreaterThanOrEqual(MIN_SUPPORTED_JD);
      expect(preset.julianDate).toBeLessThanOrEqual(MAX_SUPPORTED_JD);
    }
  });

  it('includes J2000 epoch at exactly JD 2451545.0', () => {
    const j2000 = presetById('j2000-epoch');
    expect(j2000).toBeDefined();
    expect(j2000?.julianDate).toBe(2451545.0);
  });

  it('includes Perseverance landing on Mars (2021-02-18)', () => {
    const percy = presetById('perseverance-landing');
    expect(percy).toBeDefined();
    expect(percy?.targetBodyId).toBe('mars');
    expect(percy?.isoDateString).toBe('2021-02-18');
  });

  it('includes Apollo 11 moon landing (1969-07-20)', () => {
    const apollo = presetById('apollo-11-landing');
    expect(apollo).toBeDefined();
    expect(apollo?.isoDateString).toBe('1969-07-20');
  });
});
