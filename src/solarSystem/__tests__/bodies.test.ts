import { describe, expect, it } from 'vitest';

import {
  BENNU_MODEL,
  JULIAN_YEAR_DAYS,
  NEW_PLANET_TEXTURES,
  NEW_PLANET_TEXTURE_BYTES,
  SOLAR_SYSTEM_BODIES,
  SOLAR_SYSTEM_MODE_NOTE,
  SOLAR_SYSTEM_ORBIT_NOTE,
  SOLAR_SYSTEM_REFERENCE_SOURCES,
  SOLAR_SYSTEM_SCALE_NOTE,
  SOLAR_SYSTEM_SCHEMATIC_MOTION_NOTE,
  bodyById,
  bodyPosition,
  bodyPositionAtDays,
  cameraPose,
  kindLabel,
} from '../bodies';

describe('Solar System reference registry', () => {
  it('contains the Sun, eight planets, and 101955 Bennu exactly once with stable unique ids and preserved planet ordinals', () => {
    expect(SOLAR_SYSTEM_BODIES).toHaveLength(10);
    expect(new Set(SOLAR_SYSTEM_BODIES.map((body) => body.id)).size).toBe(10);
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
      '101955 Bennu',
    ]);
    expect(SOLAR_SYSTEM_BODIES.map((body) => body.orderFromSun)).toEqual([
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      null,
    ]);

    const bennuEntries = SOLAR_SYSTEM_BODIES.filter((body) => body.id === 'bennu');
    expect(bennuEntries).toHaveLength(1);
    expect(bennuEntries[0].kind).toBe('small-body');
    expect(kindLabel(bennuEntries[0].kind)).toBe('Near-Earth asteroid (small body)');
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
    expect(SOLAR_SYSTEM_SCHEMATIC_MOTION_NOTE).toMatch(/angular speeds use sidereal orbital periods/i);
    expect(SOLAR_SYSTEM_SCHEMATIC_MOTION_NOTE).toMatch(/do not represent a dated ephemeris/i);
  });

  it('includes sourced physical reference facts for the Sun and eight planets with null Sun orbital fields', () => {
    expect(JULIAN_YEAR_DAYS).toBe(365.25);

    const sun = bodyById('sun');
    expect(sun.facts.meanRadiusKm).toBe(695700);
    expect(sun.facts.semiMajorAxisAu).toBeNull();
    expect(sun.facts.siderealOrbitPeriodYears).toBeNull();
    expect(sun.facts.siderealOrbitPeriodDays).toBeNull();
    expect(sun.facts.eccentricity).toBeNull();
    expect(sun.facts.inclinationDeg).toBeNull();
    expect(sun.facts.sources.map((s) => s.url)).toContain('https://science.nasa.gov/sun/facts/');

    const expectedPeriodsYr: Record<string, number> = {
      mercury: 0.2408467,
      venus: 0.61519726,
      earth: 1.0000174,
      mars: 1.8808476,
      jupiter: 11.862615,
      saturn: 29.447498,
      uranus: 84.016846,
      neptune: 164.79132,
    };

    for (const body of SOLAR_SYSTEM_BODIES.filter(
      (item) => item.id !== 'sun' && item.kind !== 'small-body',
    )) {
      const { facts } = body;
      expect(Number.isFinite(facts.meanRadiusKm)).toBe(true);
      expect(facts.meanRadiusKm).toBeGreaterThan(2000);
      expect(facts.meanRadiusKm).toBeLessThan(80000);

      expect(facts.semiMajorAxisAu).not.toBeNull();
      expect(Number.isFinite(facts.semiMajorAxisAu!)).toBe(true);
      expect(facts.semiMajorAxisAu!).toBeGreaterThan(0.3);
      expect(facts.semiMajorAxisAu!).toBeLessThan(35);

      expect(facts.siderealOrbitPeriodYears).toBe(expectedPeriodsYr[body.id]);
      expect(facts.siderealOrbitPeriodDays).toBeCloseTo(
        expectedPeriodsYr[body.id] * JULIAN_YEAR_DAYS,
        10,
      );

      expect(facts.eccentricity).not.toBeNull();
      expect(facts.eccentricity!).toBeGreaterThan(0);
      expect(facts.eccentricity!).toBeLessThan(0.25);

      expect(facts.inclinationDeg).not.toBeNull();
      expect(facts.inclinationDeg!).toBeGreaterThanOrEqual(0);
      expect(facts.inclinationDeg!).toBeLessThan(10);

      expect(facts.sources.length).toBeGreaterThanOrEqual(2);
      for (const source of facts.sources) {
        expect(source.url).toMatch(/^https:\/\/(ssd\.jpl\.nasa\.gov|nssdc\.gsfc\.nasa\.gov|science\.nasa\.gov)\//);
      }
    }

    // Earth uses its own rounded NSSDC J2000 mean elements rather than silently claiming the JPL EM Bary row.
    const earth = bodyById('earth');
    expect(earth.facts.semiMajorAxisAu).toBe(1.00000011);
    expect(earth.facts.eccentricity).toBe(0.01671022);
    expect(earth.facts.provenanceNote).toMatch(/Earth-Moon barycenter/i);
    expect(earth.facts.sources).toContain(SOLAR_SYSTEM_REFERENCE_SOURCES['nasa-nssdc-fact-sheet']);
  });

  it('includes finite JPL SBDB physical and orbital facts for 101955 Bennu with explicit radius derivation and schematic disclosure', () => {
    const bennu = bodyById('bennu');
    const { facts } = bennu;

    expect(bennu.kind).toBe('small-body');
    expect(bennu.orderFromSun).toBeNull();
    expect(bennu.model).toBe(BENNU_MODEL);
    expect(bennu.orbitRadius).toBeGreaterThan(bodyById('earth').orbitRadius);
    expect(bennu.orbitRadius).toBeLessThan(bodyById('mars').orbitRadius);

    expect(facts.effectiveDiameterKm).toBe(0.48444);
    expect(facts.meanRadiusKm).toBeCloseTo(0.24222, 10);
    expect(facts.meanRadiusDerivedFrom).toMatch(/0\.48444 km \/ 2/i);
    expect(facts.triaxialDimensionsKm).toBe('0.5047 × 0.4918 × 0.4567 km');
    expect(facts.rotationPeriodHours).toBeCloseTo(4.296061, 6);

    expect(facts.semiMajorAxisAu).toBeCloseTo(1.126391025894812, 12);
    expect(facts.perihelionAu).toBeCloseTo(0.8968944004459729, 12);
    expect(facts.aphelionAu).toBeCloseTo(1.355887651343651, 12);
    expect(facts.siderealOrbitPeriodDays).toBeCloseTo(436.6487281120201, 9);
    expect(facts.siderealOrbitPeriodYears).toBeCloseTo(
      436.6487281120201 / JULIAN_YEAR_DAYS,
      12,
    );
    expect(facts.eccentricity).toBeCloseTo(0.2037450762416414, 12);
    expect(facts.inclinationDeg).toBeCloseTo(6.03494377024794, 12);

    expect(facts.sources).toContain(SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-sbdb-api']);
    expect(facts.sources).toContain(SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-sb-orbits']);
    expect(facts.sources).toContain(SOLAR_SYSTEM_REFERENCE_SOURCES['jpl-astro-par']);
    expect(facts.provenanceNote).toMatch(/solution 118/i);
    expect(facts.provenanceNote).toMatch(/diameter \/ 2/i);
    expect(facts.provenanceNote).toMatch(/compressed circular schematic guide/i);
  });

  it('places bodies on display-only schematic guides and focuses the camera without physics', () => {
    expect(bodyPosition('sun')).toEqual([0, 0, 0]);
    expect(bodyPositionAtDays('sun', 250)).toEqual([0, 0, 0]);

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

    const focusedAtDays = cameraPose('body', 'jupiter', 180);
    expect(focusedAtDays.target).toEqual(bodyPositionAtDays('jupiter', 180));

    const focusedBennu = cameraPose('body', 'bennu', 90);
    expect(focusedBennu.target).toEqual(bodyPositionAtDays('bennu', 90));
    expect(focusedBennu.position[1]).toBeGreaterThan(focusedBennu.target[1]);
  });
});
