import { describe, expect, it } from 'vitest';

import {
  CANONICAL_OUTPOST_SCENARIO,
  evaluateOutpostMission,
  runOutpostSimulation,
  type SubsystemAllocation,
} from '../index';

describe('outpostEvaluator', () => {
  it('returns NOT_EVALUABLE for null or empty run results', () => {
    const evalNull = evaluateOutpostMission(null);
    expect(evalNull.outcome).toBe('NOT_EVALUABLE');

    const evalUndefined = evaluateOutpostMission(undefined);
    expect(evalUndefined.outcome).toBe('NOT_EVALUABLE');
  });

  it('evaluates PASS when power is prudently managed through the crisis', () => {
    // Cadet strategy: activate shielding on Sols 6-8 (SPE), maintain ECLSS, ration food during dust storm
    const schedule = CANONICAL_OUTPOST_SCENARIO.environmentalSchedule;
    const cadetStrategy: SubsystemAllocation[] = schedule.map((env) => ({
      lifeSupportKw: 16,
      radiationShieldKw: env.solarParticleEventActive ? 12 : 0,
      foodProductionKw: env.dustOpacityTau > 0.6 ? 4 : 14,
      auxiliaryKw: 2,
    }));

    const run = runOutpostSimulation(CANONICAL_OUTPOST_SCENARIO, cadetStrategy);
    expect(run.completed).toBe(true);

    const evaluation = evaluateOutpostMission(run);
    expect(evaluation.outcome).toBe('PASS');
    expect(evaluation.criteria.every((c) => c.passed)).toBe(true);
    expect(evaluation.maxRadiationDoseMsv).toBeLessThan(40);
    expect(evaluation.finalCropHealthPercent).toBeGreaterThanOrEqual(40);
    expect(evaluation.minOxygenPercent).toBeGreaterThanOrEqual(19.5);
    expect(evaluation.summary).toContain('Outpost nominal');
  });

  it('evaluates FAIL when radiation shielding is neglected during the solar flare', () => {
    // Allocates 0 kW to shielding during the storm
    const recklessAllocation: SubsystemAllocation = {
      lifeSupportKw: 16,
      radiationShieldKw: 0,
      foodProductionKw: 14,
      auxiliaryKw: 4,
    };

    const run = runOutpostSimulation(CANONICAL_OUTPOST_SCENARIO, recklessAllocation);
    const evaluation = evaluateOutpostMission(run);

    expect(evaluation.outcome).toBe('FAIL');
    const radCriterion = evaluation.criteria.find((c) => c.id === 'radiation-protection');
    expect(radCriterion?.passed).toBe(false);
    expect(evaluation.debriefNotes.some((n) => n.includes('Radiation Alert'))).toBe(true);
  });

  it('evaluates FAIL when crops suffer irreversible starvation blight', () => {
    // Starves the greenhouse completely
    const zeroFoodAllocation: SubsystemAllocation = {
      lifeSupportKw: 16,
      radiationShieldKw: 12,
      foodProductionKw: 0,
      auxiliaryKw: 4,
    };

    const run = runOutpostSimulation(CANONICAL_OUTPOST_SCENARIO, zeroFoodAllocation);
    const evaluation = evaluateOutpostMission(run);

    expect(evaluation.outcome).toBe('FAIL');
    const cropCriterion = evaluation.criteria.find((c) => c.id === 'food-production');
    expect(cropCriterion?.passed).toBe(false);
    expect(evaluation.finalCropHealthPercent).toBe(0);
  });

  it('evaluates FAIL when life support is starved causing crew hypoxia', () => {
    const starvedEclss: SubsystemAllocation = {
      lifeSupportKw: 4, // Far below minimum survival!
      radiationShieldKw: 12,
      foodProductionKw: 14,
      auxiliaryKw: 4,
    };

    const run = runOutpostSimulation(CANONICAL_OUTPOST_SCENARIO, starvedEclss);
    const evaluation = evaluateOutpostMission(run);

    expect(evaluation.outcome).toBe('FAIL');
    const eclssCriterion = evaluation.criteria.find((c) => c.id === 'eclss-atmosphere');
    expect(eclssCriterion?.passed).toBe(false);
  });
});
