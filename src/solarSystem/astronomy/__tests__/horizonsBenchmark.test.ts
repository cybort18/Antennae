import { describe, expect, it } from 'vitest';

import {
  J2000_EPOCH_JD,
  calendarDateToJulianDate,
  computeOrbitalState,
} from '../index';

/**
 * Benchmark comparisons between our Standish/JPL Keplerian analytical model
 * and official JPL Horizons reference snapshots.
 *
 * Primary reference:
 * E. M. Standish (JPL/Caltech), "Keplerian Elements for Approximate Positions
 * of the Major Planets", valid 1800-2050 AD.
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 *
 * Official JPL Horizons Web Interface:
 * https://ssd.jpl.nasa.gov/horizons/
 * Coordinate center: Sun (@sun / body 10)
 * Coordinate system: Ecliptic and Mean Equinox of J2000.0
 */
describe('JPL Horizons Reference Benchmark', () => {
  // Epoch: J2000.0 (2000-Jan-01 12:00:00.0000 TDB/UTC, JD 2451545.0)
  describe('At J2000.0 Epoch (JD 2451545.0)', () => {
    it('matches JPL Horizons heliocentric state for Earth/Moon Barycenter within Standish tolerance', () => {
      // JPL Horizons J2000.0 Sun-centered Earth-Moon Barycenter:
      // Distance r = 0.98333 AU (near perihelion)
      // Speed v = 30.28 km/s
      // Heliocentric longitude approx 100.46°
      const earth = computeOrbitalState('earth', J2000_EPOCH_JD);

      expect(earth.distanceAu).toBeCloseTo(0.9833, 2);
      expect(Math.abs(earth.distanceAu - 0.98333)).toBeLessThan(0.005); // within 0.005 AU
      expect(earth.speedKmS).toBeGreaterThan(29.8);
      expect(earth.speedKmS).toBeLessThan(30.4);

      // Verify ecliptic plane inclination near 0
      expect(Math.abs(earth.positionAu[2])).toBeLessThan(0.001);
    });

    it('matches JPL Horizons heliocentric state for Mars within Standish tolerance', () => {
      // JPL Horizons J2000.0 Sun-centered Mars:
      // a = 1.52368 AU, e = 0.0934, distance r = 1.3812 AU
      // Speed v = 26.50 km/s (near perihelion)
      const mars = computeOrbitalState('mars', J2000_EPOCH_JD);

      expect(mars.elements.semiMajorAxisAu).toBeCloseTo(1.5237, 3);
      expect(mars.elements.eccentricity).toBeCloseTo(0.0934, 3);
      expect(Math.abs(mars.distanceAu - 1.3812)).toBeLessThan(0.01); // within 0.01 AU
      expect(mars.speedKmS).toBeGreaterThan(25.5);
      expect(mars.speedKmS).toBeLessThan(27.0);
    });

    it('matches JPL Horizons heliocentric state for Jupiter within Standish tolerance', () => {
      // JPL Horizons J2000.0 Sun-centered Jupiter:
      // a = 5.20336 AU, e = 0.0484, r = 5.2415 AU
      // Speed v = 13.06 km/s
      const jupiter = computeOrbitalState('jupiter', J2000_EPOCH_JD);

      expect(jupiter.elements.semiMajorAxisAu).toBeCloseTo(5.2029, 3);
      expect(jupiter.elements.eccentricity).toBeCloseTo(0.0484, 3);
      // Standish Table 1 / Horizons at J2000.0: M = 19.67° (near perihelion), r = 4.9673 AU
      expect(Math.abs(jupiter.distanceAu - 4.9673)).toBeLessThan(0.005); // within 0.005 AU
      expect(jupiter.speedKmS).toBeGreaterThan(13.0);
      expect(jupiter.speedKmS).toBeLessThan(14.0);
    });

    it('matches JPL Horizons heliocentric state for Venus within Standish tolerance', () => {
      // JPL Horizons J2000.0 Sun-centered Venus:
      // a = 0.72333 AU, e = 0.00677, r = 0.7280 AU
      // Speed v = 34.90 km/s
      const venus = computeOrbitalState('venus', J2000_EPOCH_JD);

      expect(venus.elements.semiMajorAxisAu).toBeCloseTo(0.7233, 3);
      expect(venus.elements.eccentricity).toBeCloseTo(0.0068, 3);
      expect(Math.abs(venus.distanceAu - 0.728)).toBeLessThan(0.01); // within 0.01 AU
      expect(venus.speedKmS).toBeGreaterThan(34.0);
      expect(venus.speedKmS).toBeLessThan(35.5);
    });
  });

  // Epoch: Contemporary date 2026-Oct-25 00:00:00 UTC (JD 2461338.5)
  describe('At Contemporary Date (2026-Oct-25 00:00:00 UTC, JD 2461338.5)', () => {
    const contemporaryJd = calendarDateToJulianDate({
      year: 2026,
      month: 10,
      day: 25,
      hour: 0,
      minute: 0,
      second: 0,
    });

    it('propagates Earth position to late-October distance (~0.995 AU) and physical speed', () => {
      const earth = computeOrbitalState('earth', contemporaryJd);

      // In late October, Earth is moving from aphelion (1.017 AU in July) towards perihelion (0.983 AU in Jan)
      expect(earth.distanceAu).toBeGreaterThan(0.990);
      expect(earth.distanceAu).toBeLessThan(1.005);
      expect(earth.speedKmS).toBeGreaterThan(29.5);
      expect(earth.speedKmS).toBeLessThan(30.2);
    });

    it('propagates Mars position within valid physical bounds', () => {
      const mars = computeOrbitalState('mars', contemporaryJd);

      expect(mars.distanceAu).toBeGreaterThan(1.38);
      expect(mars.distanceAu).toBeLessThan(1.67);
      expect(mars.speedKmS).toBeGreaterThan(21.5);
      expect(mars.speedKmS).toBeLessThan(26.8);
    });

    it('propagates Bennu osculating orbit within physical bounds without claiming N-body precision', () => {
      const bennu = computeOrbitalState('bennu', contemporaryJd);

      // Bennu osculating elements: a=1.126 AU, e=0.2037 (q=0.897 AU, Q=1.356 AU)
      expect(bennu.distanceAu).toBeGreaterThan(0.89);
      expect(bennu.distanceAu).toBeLessThan(1.36);
      expect(bennu.speedKmS).toBeGreaterThan(22.0);
      expect(bennu.speedKmS).toBeLessThan(35.0);
    });
  });
});
