/**
 * Runs the editable scenario inputs through the existing physics engine.
 *
 * Nothing here computes physics: it validates, calls `runSimulation`, and
 * reports what happened. Invalid inputs never reach the engine and never
 * produce a partial result.
 */

import { runSimulation, type SimulationConfig, type SimulationResult, type ValidationIssue } from '../simulation';
import {
  buildScenarioConfig,
  validateScenarioInputs,
  type ScenarioInputs,
} from './scenarioInputs';

export type ScenarioEvaluation = {
  config: SimulationConfig;
  issues: ValidationIssue[];
  /** Null when the inputs are invalid; nothing was integrated in that case. */
  result: SimulationResult | null;
  /** Present only if the engine itself rejected an input it considers invalid. */
  engineError: string | null;
};

export function evaluateScenario(inputs: ScenarioInputs): ScenarioEvaluation {
  const config = buildScenarioConfig(inputs);
  const issues = validateScenarioInputs(inputs);

  if (issues.length > 0) {
    return { config, issues, result: null, engineError: null };
  }

  try {
    return { config, issues, result: runSimulation(config), engineError: null };
  } catch (error) {
    // Defensive: validation and the engine agree on the rules today, so this
    // path should be unreachable. If it is ever hit, report it rather than
    // showing an empty or stale run as if it were current.
    return {
      config,
      issues,
      result: null,
      engineError: error instanceof Error ? error.message : String(error),
    };
  }
}
