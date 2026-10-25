import { describe, expect, it } from 'vitest';

import {
  J2000_EPOCH_JD,
  KM_PER_AU,
  calendarDateToJulianDate,
  computeOrbitalState,
  formatJulianDateUtc,
  generateOrbitPathScenePoints,
  heliocentricAuToScene,
  isoDateToJulianDate,
  julianCenturiesSinceJ2000,
  julianDateToCalendarDate,
  julianDateToIsoDate,
  solveKeplerEquation,
} from '../index';

describe('Julian Date conversions', () => {
  it('correctly maps J2000.0 epoch (2000-01-01 12:00:00 UTC) to JD 2451545.0', () => {
    const jd = calendarDateToJulianDate({
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      second: 0,
    });
    expect(jd).toBeCloseTo(J2000_EPOCH_JD, 5);
    expect(julianCenturiesSinceJ2000(jd)).toBeCloseTo(0, 7);
  });

  it('performs roundtrip conversion between calendar date and Julian Date', () => {
    const original = { year: 2026, month: 10, day: 25, hour: 14, minute: 30, second: 0 };
    const jd = calendarDateToJulianDate(original);
    const converted = julianDateToCalendarDate(jd);

    expect(converted.year).toBe(original.year);
    expect(converted.month).toBe(original.month);
    expect(converted.day).toBe(original.day);
    expect(converted.hour).toBe(original.hour);
    expect(converted.minute).toBe(original.minute);
  });

  it('formats Julian Date into readable UTC string and parses ISO date', () => {
    const jd = calendarDateToJulianDate({
      year: 2026,
      month: 10,
      day: 25,
      hour: 8,
      minute: 15,
      second: 0,
    });
    const str = formatJulianDateUtc(jd);
    expect(str).toBe('2026-Oct-25 08:15 UTC');

    const iso = julianDateToIsoDate(jd);
    expect(iso).toBe('2026-10-25');

    const parsedJd = isoDateToJulianDate(iso);
    const parsedCal = julianDateToCalendarDate(parsedJd);
    expect(parsedCal.year).toBe(2026);
    expect(parsedCal.month).toBe(10);
    expect(parsedCal.day).toBe(25);
  });
});

describe('Kepler equation solver', () => {
  it('solves Kepler equation to high numerical precision for circular and eccentric orbits', () => {
    expect(solveKeplerEquation(0, 0.1)).toBeCloseTo(0, 10);
    expect(solveKeplerEquation(Math.PI, 0.2)).toBeCloseTo(Math.PI, 10);

    const testAngles = [0.1, 0.5, 1.2, 2.5, -0.8, -2.1];
    const testEccentricities = [0.01, 0.05, 0.093, 0.2056]; // up to Mercury

    for (const M of testAngles) {
      for (const e of testEccentricities) {
        const E = solveKeplerEquation(M, e);
        const residual = Math.abs(E - e * Math.sin(E) - M);
        expect(residual).toBeLessThan(1e-11);
      }
    }
  });
});

describe('Heliocentric orbital states', () => {
  it('places the central Sun at the coordinate origin', () => {
    const sunState = computeOrbitalState('sun', J2000_EPOCH_JD);
    expect(sunState.positionAu).toEqual([0, 0, 0]);
    expect(sunState.distanceAu).toBe(0);
    expect(sunState.speedKmS).toBe(0);
  });

  it('calculates physically authentic heliocentric positions and speeds for Earth', () => {
    const state = computeOrbitalState('earth', J2000_EPOCH_JD);

    // Earth distance at J2000 should be ~1.0 AU (0.983 to 1.017 AU)
    expect(state.distanceAu).toBeGreaterThan(0.98);
    expect(state.distanceAu).toBeLessThan(1.02);
    expect(state.distanceKm).toBeCloseTo(state.distanceAu * KM_PER_AU, 1);

    // Earth orbital speed should be around 29.8 km/s (29.3 to 30.3 km/s)
    expect(state.speedKmS).toBeGreaterThan(29.0);
    expect(state.speedKmS).toBeLessThan(30.5);

    // Earth at J2000 should have semi-major axis ~1.0000 AU
    expect(state.elements.semiMajorAxisAu).toBeCloseTo(1.0, 3);
  });

  it('calculates Bennu orbit crossing Earth distance with real inclination', () => {
    const state = computeOrbitalState('bennu', J2000_EPOCH_JD);

    // Bennu semi-major axis is 1.126 AU, perihelion 0.897 AU, aphelion 1.356 AU
    expect(state.elements.semiMajorAxisAu).toBeCloseTo(1.126, 2);
    expect(state.elements.eccentricity).toBeCloseTo(0.2037, 2);
    expect(state.elements.inclinationDeg).toBeCloseTo(6.035, 2);

    expect(state.distanceAu).toBeGreaterThan(0.89);
    expect(state.distanceAu).toBeLessThan(1.36);
  });
});

describe('Scene scale mapping & 3D orbit paths', () => {
  it('monotonically orders planetary distances from Sun to Neptune in scene units', () => {
    const planets = [
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ] as const;

    const sceneDistances = planets.map((id) => {
      const state = computeOrbitalState(id, J2000_EPOCH_JD);
      const scenePos = heliocentricAuToScene(state.positionAu);
      return Math.hypot(scenePos[0], scenePos[1], scenePos[2]);
    });

    for (let i = 1; i < sceneDistances.length; i += 1) {
      expect(sceneDistances[i]).toBeGreaterThan(sceneDistances[i - 1]);
    }

    // Mercury must stay clearly outside Sun display sphere (radius 1.8)
    expect(sceneDistances[0]).toBeGreaterThan(3.5);

    // Neptune must remain comfortably within viewport frustum (< 100 units)
    expect(sceneDistances[sceneDistances.length - 1]).toBeLessThan(70);
  });

  it('generates a closed 3D elliptical wireframe loop for planetary orbits', () => {
    const points = generateOrbitPathScenePoints('mars', J2000_EPOCH_JD, 64);
    expect(points.length).toBe(65);

    const first = points[0];
    const last = points[points.length - 1];

    // First and last point must coincide to close the loop
    expect(first[0]).toBeCloseTo(last[0], 5);
    expect(first[1]).toBeCloseTo(last[1], 5);
    expect(first[2]).toBeCloseTo(last[2], 5);
  });
});
