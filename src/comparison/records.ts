/**
 * Baseline and candidate run records.
 *
 * A record bundles the parameters, the engine configuration, and the engine
 * result of exactly one run. Every panel reads records instead of loose values,
 * so a comparison can never silently mix numbers from different configurations.
 *
 * Records are treated as immutable: the pure helpers below always return new
 * state objects and never mutate an existing record, which is what makes
 * "editing the candidate cannot change the baseline" a structural property
 * rather than a convention.
 */

import type { SimulationConfig, SimulationResult, ValidationIssue } from '../simulation';
import { evaluateScenario, type ScenarioEvaluation } from '../scenarios/evaluateScenario';
import {
  DEFAULT_SCENARIO_INPUTS,
  type ScenarioInputs,
} from '../scenarios/scenarioInputs';

export type RecordRole = 'baseline' | 'candidate';

export type ScenarioRecord = {
  role: RecordRole;
  /** Parameters that produced this record. Copied on record creation. */
  inputs: ScenarioInputs;
  /** Configuration built from those parameters and passed to the engine. */
  config: SimulationConfig;
  /** Engine result for that configuration. */
  result: SimulationResult;
};

export type ComparisonState = {
  baseline: ScenarioRecord;
  /** Null until the user runs a candidate. */
  candidate: ScenarioRecord | null;
  /**
   * Candidate parameters being edited. They are parameters, not a result: no
   * panel may display them as computed output before an explicit run.
   */
  draft: ScenarioInputs;
  /**
   * Validation issues from the most recent explicit run attempt. An empty array
   * means the last attempt ran successfully; null means no attempt yet.
   */
  lastRunIssues: ValidationIssue[] | null;
  lastRunEngineError: string | null;
};

/** Relation between the editable parameters and the candidate record. */
export type CandidateRunState = 'not-run' | 'in-sync' | 'unrun-changes';

export function createRecord(
  role: RecordRole,
  inputs: ScenarioInputs,
  evaluation: ScenarioEvaluation,
): ScenarioRecord | null {
  if (!evaluation.result) {
    return null;
  }
  return {
    role,
    inputs: { ...inputs },
    config: evaluation.config,
    result: evaluation.result,
  };
}

/**
 * Builds the initial comparison state from a valid scenario. Returns null when
 * the supplied parameters are invalid, so the caller can report a workspace
 * problem instead of showing a partial comparison.
 */
export function initialComparisonState(
  inputs: ScenarioInputs = DEFAULT_SCENARIO_INPUTS,
): ComparisonState | null {
  const evaluation = evaluateScenario(inputs);
  const baseline = createRecord('baseline', inputs, evaluation);

  if (!baseline) {
    return null;
  }

  return {
    baseline,
    candidate: null,
    draft: { ...inputs },
    lastRunIssues: null,
    lastRunEngineError: null,
  };
}

/**
 * Edits the candidate parameters only. Nothing is integrated here, and the
 * baseline, the candidate record, and every result object are left untouched.
 */
export function editDraft(state: ComparisonState, patch: Partial<ScenarioInputs>): ComparisonState {
  return { ...state, draft: { ...state.draft, ...patch } };
}

/**
 * Runs the current candidate parameters through the engine.
 *
 * On success the candidate record is replaced by a new record bound to the
 * parameters that produced it. On invalid input the previous records are kept
 * exactly as they were and the issues are reported instead — an invalid attempt
 * never becomes a result.
 */
export function runCandidate(state: ComparisonState): ComparisonState {
  const evaluation = evaluateScenario(state.draft);

  if (!evaluation.result) {
    return {
      ...state,
      lastRunIssues: evaluation.issues,
      lastRunEngineError: evaluation.engineError,
    };
  }

  const record = createRecord('candidate', state.draft, evaluation);

  if (!record) {
    return {
      ...state,
      lastRunIssues: evaluation.issues,
      lastRunEngineError: evaluation.engineError ?? 'The engine returned no result for these parameters.',
    };
  }

  return { ...state, candidate: record, lastRunIssues: [], lastRunEngineError: null };
}

/**
 * Copies the baseline parameters back into the candidate and runs them, so the
 * restored candidate is bound to the baseline configuration rather than to a
 * stale result. Deterministic engine output means the restored candidate
 * reproduces the baseline numbers exactly.
 */
export function restoreDraftFromBaseline(state: ComparisonState): ComparisonState {
  return runCandidate({ ...state, draft: { ...state.baseline.inputs } });
}

/**
 * Promotes the candidate record to be the new comparison reference.
 *
 * The candidate record is cleared because it now equals the baseline; keeping it
 * would present the same run twice under two labels. The draft is reset to the
 * new baseline parameters so the next edit starts from the new reference.
 */
export function promoteCandidateToBaseline(state: ComparisonState): ComparisonState {
  const candidate = state.candidate;

  if (!candidate) {
    return state;
  }

  return {
    ...state,
    baseline: { ...candidate, role: 'baseline' },
    candidate: null,
    draft: { ...candidate.inputs },
    lastRunIssues: null,
    lastRunEngineError: null,
  };
}

/**
 * Relation between the editable parameters and the last run that exists.
 *
 * Before any candidate run, the comparison reference is the baseline, so editing
 * away from the baseline parameters is reported as unrun changes; once a
 * candidate record exists, the candidate is the comparison point.
 */
export function candidateRunState(state: ComparisonState): CandidateRunState {
  if (!state.candidate) {
    return sameInputs(state.draft, state.baseline.inputs) ? 'not-run' : 'unrun-changes';
  }
  return sameInputs(state.draft, state.candidate.inputs) ? 'in-sync' : 'unrun-changes';
}

/** Exact parameter comparison; scenario parameters are plain finite numbers. */
export function sameInputs(a: ScenarioInputs, b: ScenarioInputs): boolean {
  return (
    a.altitudeKm === b.altitudeKm &&
    a.speedKmPerS === b.speedKmPerS &&
    a.orbitCount === b.orbitCount &&
    a.timestepSeconds === b.timestepSeconds
  );
}

/**
 * Configuration comparison (parameters, timestep, duration, sampling). Used to
 * state whether two records were produced by the same physical setup.
 */
export function sameConfiguration(a: ScenarioRecord, b: ScenarioRecord): boolean {
  return JSON.stringify(a.config) === JSON.stringify(b.config);
}
