/**
 * Input validation tests: non-finite values, invalid timestep/duration,
 * singular separation, guard-rail bounds, and safety limits must all be
 * rejected with a specific, actionable issue.
 */
import { describe, expect, it } from 'vitest';

import { EARTH_MEAN_RADIUS_KM } from '../constants';
import { SimulationInputError } from '../errors';
import { EARTH_CENTRAL_BODY } from '../presets';
import { runSimulation } from '../runSimulation';
import type { SimulationConfig } from '../types';
import {
  MAX_SUPPORTED_RADIUS_KM,
  MAX_SUPPORTED_SPEED_KM_PER_S,
  MIN_SUPPORTED_RADIUS_KM,
  validateSimulationConfig,
} from '../validation';
import { vec3 } from '../vector3';

const RADIUS_KM = EARTH_MEAN_RADIUS_KM + 400;

function baseConfig(): SimulationConfig {
  return {
    label: 'validation fixture',
    centralBody: EARTH_CENTRAL_BODY,
    initialState: {
      positionKm: vec3(RADIUS_KM, 0, 0),
      velocityKmPerS: vec3(0, 7.67, 0),
    },
    timestepSeconds: 10,
    durationSeconds: 1000,
  };
}

const VALID_MUTATION_OFFSET = 1000;

describe('validateSimulationConfig', () => {
  it('accepts a well-formed configuration', () => {
    expect(validateSimulationConfig(baseConfig())).toEqual([]);
  });

  type Case = { name: string; mutate: (config: SimulationConfig) => void; field: string };

  const cases: Case[] = [
    {
      name: 'non-finite position (NaN)',
      mutate: (c) => {
        c.initialState = { ...c.initialState, positionKm: vec3(Number.NaN, 0, 0) };
      },
      field: 'initialState.positionKm',
    },
    {
      name: 'non-finite position (Infinity)',
      mutate: (c) => {
        c.initialState = { ...c.initialState, positionKm: vec3(0, Number.POSITIVE_INFINITY, 0) };
      },
      field: 'initialState.positionKm',
    },
    {
      name: 'non-finite velocity (NaN)',
      mutate: (c) => {
        c.initialState = { ...c.initialState, velocityKmPerS: vec3(0, Number.NaN, 0) };
      },
      field: 'initialState.velocityKmPerS',
    },
    {
      name: 'non-finite gravitational parameter',
      mutate: (c) => {
        c.centralBody = { ...c.centralBody, gravitationalParameterKm3PerS2: Number.NaN };
      },
      field: 'centralBody.gravitationalParameterKm3PerS2',
    },
    {
      name: 'zero gravitational parameter',
      mutate: (c) => {
        c.centralBody = { ...c.centralBody, gravitationalParameterKm3PerS2: 0 };
      },
      field: 'centralBody.gravitationalParameterKm3PerS2',
    },
    {
      name: 'negative gravitational parameter',
      mutate: (c) => {
        c.centralBody = { ...c.centralBody, gravitationalParameterKm3PerS2: -398_600 };
      },
      field: 'centralBody.gravitationalParameterKm3PerS2',
    },
    {
      name: 'zero separation from the force center',
      mutate: (c) => {
        c.initialState = { ...c.initialState, positionKm: vec3(0, 0, 0) };
      },
      field: 'initialState.positionKm',
    },
    {
      name: 'separation below the supported numeric floor',
      mutate: (c) => {
        c.initialState = {
          ...c.initialState,
          positionKm: vec3(MIN_SUPPORTED_RADIUS_KM / 1000, 0, 0),
        };
      },
      field: 'initialState.positionKm',
    },
    {
      name: 'separation above the supported numeric range',
      mutate: (c) => {
        c.initialState = {
          ...c.initialState,
          positionKm: vec3(MAX_SUPPORTED_RADIUS_KM * 10, 0, 0),
        };
      },
      field: 'initialState.positionKm',
    },
    {
      name: 'speed above the supported numeric range',
      mutate: (c) => {
        c.initialState = {
          ...c.initialState,
          velocityKmPerS: vec3(MAX_SUPPORTED_SPEED_KM_PER_S * 2, 0, 0),
        };
      },
      field: 'initialState.velocityKmPerS',
    },
    {
      name: 'zero timestep',
      mutate: (c) => {
        c.timestepSeconds = 0;
      },
      field: 'timestepSeconds',
    },
    {
      name: 'negative timestep',
      mutate: (c) => {
        c.timestepSeconds = -10;
      },
      field: 'timestepSeconds',
    },
    {
      name: 'non-finite timestep',
      mutate: (c) => {
        c.timestepSeconds = Number.POSITIVE_INFINITY;
      },
      field: 'timestepSeconds',
    },
    {
      name: 'zero duration',
      mutate: (c) => {
        c.durationSeconds = 0;
      },
      field: 'durationSeconds',
    },
    {
      name: 'negative duration',
      mutate: (c) => {
        c.durationSeconds = -1000;
      },
      field: 'durationSeconds',
    },
    {
      name: 'duration that is not an integer multiple of the timestep',
      mutate: (c) => {
        c.durationSeconds = 1005;
      },
      field: 'durationSeconds',
    },
    {
      name: 'sampling interval that is not an integer multiple of the timestep',
      mutate: (c) => {
        c.sampleIntervalSeconds = 25;
      },
      field: 'sampleIntervalSeconds',
    },
    {
      name: 'step count above the safety bound',
      mutate: (c) => {
        c.maxSteps = 50;
      },
      field: 'maxSteps',
    },
    {
      name: 'impact radius at or above the initial radius',
      mutate: (c) => {
        c.impactRadiusKm = RADIUS_KM;
      },
      field: 'initialState.positionKm',
    },
    {
      name: 'negative impact radius',
      mutate: (c) => {
        c.impactRadiusKm = -1;
      },
      field: 'impactRadiusKm',
    },
  ];

  for (const testCase of cases) {
    it(`rejects ${testCase.name}`, () => {
      const config = baseConfig();
      testCase.mutate(config);
      const issues = validateSimulationConfig(config);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.map((issue) => issue.field)).toContain(testCase.field);
      // Every issue must carry an explanation, never an empty string.
      for (const issue of issues) {
        expect(issue.message.length).toBeGreaterThan(10);
      }
    });
  }

  it('accepts a duration that is an integer multiple within floating-point tolerance', () => {
    const config = baseConfig();
    config.timestepSeconds = 0.1;
    config.durationSeconds = 1000.0000000001; // representation noise, not a real partial step
    expect(validateSimulationConfig(config)).toEqual([]);
  });

  it('accepts an exactly divisible run with explicit sampling', () => {
    const config = baseConfig();
    config.sampleIntervalSeconds = 50;
    config.durationSeconds = 5000;
    expect(validateSimulationConfig(config)).toEqual([]);
    expect(config.durationSeconds / VALID_MUTATION_OFFSET).toBe(5);
  });
});

describe('runSimulation input rejection', () => {
  it('throws SimulationInputError listing every issue, and produces no samples', () => {
    const config = baseConfig();
    config.timestepSeconds = 0;
    config.initialState = { ...config.initialState, positionKm: vec3(Number.NaN, 0, 0) };

    try {
      runSimulation(config);
      throw new Error('runSimulation should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SimulationInputError);
      const issues = (error as SimulationInputError).issues;
      expect(issues.map((issue) => issue.field)).toContain('timestepSeconds');
      expect(issues.map((issue) => issue.field)).toContain('initialState.positionKm');
    }
  });
});
