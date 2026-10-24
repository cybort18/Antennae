import { describe, expect, it } from 'vitest';

import {
  SOLAR_SYSTEM_BODIES,
  bodyPosition,
  type SolarSystemBodyId,
} from '../bodies';
import {
  SCHEMATIC_DURATION_MAX_DAYS,
  SCHEMATIC_RATE_OPTIONS,
  SCHEMATIC_STEP_DAYS,
  advanceSchematicDays,
  clampSchematicDays,
  schematicAngleRadians,
  schematicAngularSpeedRadPerDay,
  schematicBodyPosition,
  stepSchematicDays,
} from '../schematicMotion';

describe('Solar System pure schematic motion', () => {
  it('returns the exact static schematic coordinates at elapsed time 0', () => {
    for (const body of SOLAR_SYSTEM_BODIES) {
      expect(schematicBodyPosition(body.id, 0)).toEqual(bodyPosition(body.id));
      expect(schematicAngleRadians(body.id, 0)).toBe(body.phaseRadians);
    }
  });

  it('keeps the Sun fixed at the origin at any elapsed time', () => {
    for (const days of [0, 10, 365.25, 1825, 3650]) {
      expect(schematicBodyPosition('sun', days)).toEqual([0, 0, 0]);
      expect(schematicAngularSpeedRadPerDay('sun')).toBe(0);
    }
  });

  it('returns each planet to its initial schematic position after one full sidereal period within 1e-9 scene units', () => {
    for (const body of SOLAR_SYSTEM_BODIES.filter((item) => item.id !== 'sun')) {
      const periodDays = body.facts.siderealOrbitPeriodDays;
      expect(periodDays).not.toBeNull();
      const origin = bodyPosition(body.id);
      const afterOnePeriod = schematicBodyPosition(body.id, periodDays!);
      const distanceError = Math.hypot(
        afterOnePeriod[0] - origin[0],
        afterOnePeriod[1] - origin[1],
        afterOnePeriod[2] - origin[2],
      );
      expect(distanceError).toBeLessThan(1e-9);
      expect(Math.hypot(afterOnePeriod[0], afterOnePeriod[2])).toBeCloseTo(
        body.orbitRadius,
        12,
      );
    }
  });

  it('orders angular speeds inversely proportional to each body sidereal orbital period', () => {
    const bodyOrderByPeriod: SolarSystemBodyId[] = [
      'mercury',
      'venus',
      'earth',
      'bennu',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ];

    for (let i = 0; i < bodyOrderByPeriod.length - 1; i += 1) {
      const inner = bodyOrderByPeriod[i];
      const outer = bodyOrderByPeriod[i + 1];
      const innerSpeed = schematicAngularSpeedRadPerDay(inner);
      const outerSpeed = schematicAngularSpeedRadPerDay(outer);
      expect(innerSpeed).toBeGreaterThan(outerSpeed);
    }

    // Verify exact inverse proportionality ratio between Mercury and Earth
    const mercuryPeriod = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'mercury')!.facts
      .siderealOrbitPeriodDays!;
    const earthPeriod = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!.facts
      .siderealOrbitPeriodDays!;
    expect(
      schematicAngularSpeedRadPerDay('mercury') / schematicAngularSpeedRadPerDay('earth'),
    ).toBeCloseTo(earthPeriod / mercuryPeriod, 12);
  });

  it('clamps, steps, and advances elapsed schematic time deterministically within [0, 3650]', () => {
    expect(SCHEMATIC_DURATION_MAX_DAYS).toBe(3650);
    expect(SCHEMATIC_STEP_DAYS).toBe(10);
    expect(SCHEMATIC_RATE_OPTIONS).toEqual([10, 60, 365]);

    expect(clampSchematicDays(-25)).toBe(0);
    expect(clampSchematicDays(120)).toBe(120);
    expect(clampSchematicDays(5000)).toBe(3650);
    expect(clampSchematicDays(Number.NaN)).toBe(0);

    expect(stepSchematicDays(0, -10)).toBe(0);
    expect(stepSchematicDays(0, 10)).toBe(10);
    expect(stepSchematicDays(3645, 10)).toBe(3650);

    expect(advanceSchematicDays(0, 0.5, 10)).toBe(5);
    expect(advanceSchematicDays(5, 0.5, 60)).toBe(35);
    expect(advanceSchematicDays(35, 1.0, 365)).toBe(400);
    expect(advanceSchematicDays(3600, 1.0, 365)).toBe(3650);
    expect(advanceSchematicDays(100, -1, 60)).toBe(100);
  });
});
