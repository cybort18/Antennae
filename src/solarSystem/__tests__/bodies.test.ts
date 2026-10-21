import { describe, expect, it } from 'vitest';

import {
  NEW_PLANET_TEXTURES,
  NEW_PLANET_TEXTURE_BYTES,
  SOLAR_SYSTEM_BODIES,
  SOLAR_SYSTEM_MODE_NOTE,
  SOLAR_SYSTEM_ORBIT_NOTE,
  SOLAR_SYSTEM_SCALE_NOTE,
  bodyById,
  bodyPosition,
  cameraPose,
} from '../bodies';

describe('Solar System reference registry', () => {
  it('contains exactly the Sun and eight planets with stable unique ids', () => {
    expect(SOLAR_SYSTEM_BODIES).toHaveLength(9);
    expect(new Set(SOLAR_SYSTEM_BODIES.map((body) => body.id)).size).toBe(9);
    expect(SOLAR_SYSTEM_BODIES.map((body) => body.name)).toEqual([
      'Sun',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ]);
    expect(SOLAR_SYSTEM_BODIES.map((body) => body.orderFromSun)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  it('ships the four new non-Earth textures from the official catalog', () => {
    expect(NEW_PLANET_TEXTURES).toHaveLength(4);
    expect(new Set(NEW_PLANET_TEXTURES.map((texture) => texture.localPath)).size).toBe(4);
    expect(NEW_PLANET_TEXTURES.some((texture) => texture.localPath.includes('earth'))).toBe(false);

    for (const texture of NEW_PLANET_TEXTURES) {
      expect(texture.localPath.startsWith('/assets/planets/')).toBe(true);
      expect(texture.localPath).not.toMatch(/^https?:/);
      expect(texture.sourceLabel).toBe('NASA 3D Resources');
      expect(texture.sourcePageUrl).toContain('science.nasa.gov/3d-resources/');
      expect(texture.fileUrl).toContain('assets.science.nasa.gov/content/dam/science/cds/3d/resources/');
      expect(texture.credit.length).toBeGreaterThan(0);
      expect(texture.format).toBe('JPEG');
      expect(texture.width).toBeGreaterThan(0);
      expect(texture.height).toBeGreaterThan(0);
      expect(texture.bytes).toBeGreaterThan(0);
    }

    expect(NEW_PLANET_TEXTURE_BYTES).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(NEW_PLANET_TEXTURE_BYTES).toBe(2576276);
  });

  it('keeps the Earth texture attributed to the Earth Observatory, not 3D Resources', () => {
    expect(bodyById('earth').texture?.sourceLabel).toBe('NASA Earth Observatory');
    expect(bodyById('earth').texture?.sourcePageUrl).toContain('earthobservatory.nasa.gov');
    expect(bodyById('mars').texture?.credit).toBe('NASA / Jet Propulsion Laboratory & Caltech');
    expect(bodyById('venus').texture?.creditDetail).toMatch(/no separate credit line/i);
  });

  it('keeps a fallback colour and a reference-only description for every body', () => {
    for (const body of SOLAR_SYSTEM_BODIES) {
      expect(body.fallbackColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(body.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(body.description.length).toBeGreaterThan(15);
    }
    expect(bodyById('saturn').ring).toBeDefined();
    expect(bodyById('mercury').texture).toBeUndefined();
    expect(bodyById('uranus').texture).toBeUndefined();
  });

  it('states the schematic scale and non-ephemeris limitations explicitly', () => {
    expect(SOLAR_SYSTEM_SCALE_NOTE).toMatch(/not to scale/i);
    expect(SOLAR_SYSTEM_SCALE_NOTE).toMatch(/not an ephemeris/i);
    expect(SOLAR_SYSTEM_ORBIT_NOTE).toMatch(/not fitted orbits/i);
    expect(SOLAR_SYSTEM_MODE_NOTE).toMatch(/No planetary dynamics/i);
  });

  it('places bodies on display-only schematic guides and focuses the camera without physics', () => {
    expect(bodyPosition('sun')).toEqual([0, 0, 0]);

    for (const body of SOLAR_SYSTEM_BODIES.filter((item) => item.id !== 'sun')) {
      const position = bodyPosition(body.id);
      expect(position[1]).toBe(0);
      expect(Math.hypot(position[0], position[2])).toBeCloseTo(body.orbitRadius, 12);
    }

    const overview = cameraPose('overview', 'jupiter');
    expect(overview.target).toEqual([0, 0, 0]);

    const focused = cameraPose('body', 'jupiter');
    expect(focused.target).toEqual(bodyPosition('jupiter'));
    expect(focused.position[1]).toBeGreaterThan(focused.target[1]);
    expect(focused.maxDistance).toBeGreaterThan(0);
  });
});
