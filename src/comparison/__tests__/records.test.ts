/**
 * Comparison-state tests.
 *
 * These encode the milestone's integrity rules as executable checks: editing a
 * candidate must not touch the baseline or the candidate record, an invalid run
 * attempt must not become a result, restoring must reproduce the baseline
 * configuration, and promoting a candidate must be explicit.
 */
import { describe, expect, it } from 'vitest';

import { EARTH_MEAN_RADIUS_KM, magnitude } from '../../simulation';
import { loadReferencePresets } from '../../data/referencePresets';
import {
  DEFAULT_SCENARIO_INPUTS,
  buildScenarioConfig,
  inputsFromReferencePreset,
} from '../../scenarios/scenarioInputs';
import {
  candidateRunState,
  editDraft,
  initialComparisonState,
  promoteCandidateToBaseline,
  replaceDraft,
  restoreDraftFromBaseline,
  runCandidate,
  sameConfiguration,
  sameInputs,
  type ComparisonState,
} from '../records';

function referenceInputs() {
  const loaded = loadReferencePresets();
  if (loaded.error || !loaded.presets[0]) {
    throw new Error(`Reference fixture must load: ${loaded.error ?? 'missing preset'}`);
  }
  const preset = loaded.presets[0];
  return {
    preset,
    inputs: inputsFromReferencePreset(preset, {
      orbitCount: 1,
      timestepSeconds: 10,
    }),
  };
}

function initialState(): ComparisonState {
  const state = initialComparisonState();
  if (!state) {
    throw new Error('The documented default scenario must produce a valid baseline.');
  }
  return state;
}

describe('initialComparisonState', () => {
  it('builds the baseline from the default scenario and leaves the candidate unrun', () => {
    const state = initialState();

    expect(state.baseline.role).toBe('baseline');
    expect(state.baseline.inputs).toEqual(DEFAULT_SCENARIO_INPUTS);
    expect(state.baseline.config).toEqual(buildScenarioConfig(DEFAULT_SCENARIO_INPUTS));
    expect(state.baseline.result.samples.length).toBeGreaterThan(1);
    expect(state.candidate).toBeNull();
    expect(state.lastRunIssues).toBeNull();
    expect(candidateRunState(state)).toBe('not-run');
  });

  it('refuses to build a baseline from invalid parameters', () => {
    expect(initialComparisonState({ ...DEFAULT_SCENARIO_INPUTS, altitudeKm: 50 })).toBeNull();
    expect(initialComparisonState({ ...DEFAULT_SCENARIO_INPUTS, speedKmPerS: Number.NaN })).toBeNull();
  });
});

describe('candidate edits', () => {
  it('change only the draft and never touch the baseline or a candidate record', () => {
    const state = initialState();
    const baselineRecord = state.baseline;
    const baselineResult = state.baseline.result;
    const baselineInputs = { ...state.baseline.inputs };

    const edited = editDraft(state, { altitudeKm: 900, speedKmPerS: 6 });

    expect(edited.draft.altitudeKm).toBe(900);
    expect(edited.draft.speedKmPerS).toBe(6);
    // Same objects: nothing was copied, mutated, or re-run.
    expect(edited.baseline).toBe(baselineRecord);
    expect(edited.baseline.result).toBe(baselineResult);
    expect(edited.baseline.inputs).toEqual(baselineInputs);
    expect(edited.candidate).toBeNull();
    // An edit is not a result; it is flagged as unrun relative to the baseline.
    expect(candidateRunState(edited)).toBe('unrun-changes');
    expect(candidateRunState(state)).toBe('not-run');
    expect(
      candidateRunState(editDraft(edited, { altitudeKm: baselineInputs.altitudeKm, speedKmPerS: baselineInputs.speedKmPerS })),
    ).toBe('not-run');
  });

  it('report unrun changes once a candidate record exists', () => {
    const state = initialState();
    const ran = runCandidate(editDraft(state, { altitudeKm: 900 }));

    expect(candidateRunState(ran)).toBe('in-sync');
    expect(candidateRunState(editDraft(ran, { altitudeKm: 901 }))).toBe('unrun-changes');
    // Re-editing back to the recorded values returns to in-sync (no float drift).
    expect(
      candidateRunState(editDraft(editDraft(ran, { altitudeKm: 901 }), { altitudeKm: 900 })),
    ).toBe('in-sync');
  });
});

describe('running the candidate', () => {
  it('binds the result to the parameters that produced it', () => {
    const state = initialState();
    const edited = editDraft(state, { altitudeKm: 900 });
    const ran = runCandidate(edited);

    expect(ran.candidate).not.toBeNull();
    expect(ran.candidate?.role).toBe('candidate');
    expect(ran.candidate?.inputs.altitudeKm).toBe(900);
    expect(ran.candidate?.config).toEqual(buildScenarioConfig(ran.candidate?.inputs ?? DEFAULT_SCENARIO_INPUTS));
    expect(ran.candidate?.result.samples[0].state.positionKm.x).toBeCloseTo(
      EARTH_MEAN_RADIUS_KM + 900,
      9,
    );
    expect(ran.lastRunIssues).toEqual([]);
    expect(ran.baseline).toBe(edited.baseline);
    expect(candidateRunState(ran)).toBe('in-sync');
  });

  it('replaces the previous candidate without mutating it', () => {
    const first = runCandidate(editDraft(initialState(), { altitudeKm: 900 }));
    const firstCandidate = first.candidate;
    const second = runCandidate(editDraft(first, { altitudeKm: 1200 }));

    expect(second.candidate).not.toBe(firstCandidate);
    expect(second.candidate?.inputs.altitudeKm).toBe(1200);
    // The previous record is untouched, so it can never be mixed with the new one.
    expect(firstCandidate?.inputs.altitudeKm).toBe(900);
    expect(firstCandidate?.result.samples[0].state.positionKm.x).toBeCloseTo(
      EARTH_MEAN_RADIUS_KM + 900,
      9,
    );
  });

  it('reports invalid parameters without integrating or replacing anything', () => {
    const valid = runCandidate(editDraft(initialState(), { altitudeKm: 900 }));
    const rejected = runCandidate(editDraft(valid, { altitudeKm: 50 }));

    expect(rejected.lastRunIssues?.length).toBeGreaterThan(0);
    for (const issue of rejected.lastRunIssues ?? []) {
      expect(issue.message.length).toBeGreaterThan(10);
    }
    // Records are identical, and the rejected values stay in the draft to fix.
    expect(rejected.candidate).toBe(valid.candidate);
    expect(rejected.baseline).toBe(valid.baseline);
    expect(rejected.draft.altitudeKm).toBe(50);
    expect(rejected.candidate?.inputs.altitudeKm).toBe(900);
  });

  it('keeps the baseline when the very first candidate attempt is invalid', () => {
    const state = initialState();
    const rejected = runCandidate(editDraft(state, { speedKmPerS: 0.1 }));

    expect(rejected.candidate).toBeNull();
    expect(rejected.baseline).toBe(state.baseline);
    expect(rejected.lastRunIssues?.length).toBeGreaterThan(0);
  });
});

describe('restoring baseline parameters', () => {
  it('reproduces the baseline configuration and its computed samples', () => {
    const modified = runCandidate(
      editDraft(initialState(), { altitudeKm: 900, speedKmPerS: 6, orbitCount: 1 }),
    );
    const restored = restoreDraftFromBaseline(modified);

    expect(restored.draft).toEqual(modified.baseline.inputs);
    expect(restored.candidate?.config).toEqual(modified.baseline.config);
    expect(sameConfiguration(restored.candidate!, modified.baseline)).toBe(true);
    expect(sameInputs(restored.draft, modified.baseline.inputs)).toBe(true);

    // Deterministic engine: the restored candidate reproduces the baseline run.
    expect(restored.candidate?.result.status).toBe(modified.baseline.result.status);
    expect(restored.candidate?.result.durationSeconds).toBe(modified.baseline.result.durationSeconds);
    expect(restored.candidate?.result.samples.length).toBe(
      modified.baseline.result.samples.length,
    );
    const index = Math.floor(modified.baseline.result.samples.length / 3);
    expect(restored.candidate?.result.samples[index].state.positionKm).toEqual(
      modified.baseline.result.samples[index].state.positionKm,
    );

    // The reference itself is the same object, untouched by the restore.
    expect(restored.baseline).toBe(modified.baseline);
    expect(candidateRunState(restored)).toBe('in-sync');
  });
});

describe('promoting the candidate to baseline', () => {
  it('replaces the baseline with the candidate record and clears the candidate', () => {
    const ran = runCandidate(editDraft(initialState(), { altitudeKm: 900 }));
    const promoted = promoteCandidateToBaseline(ran);

    expect(promoted.baseline.role).toBe('baseline');
    expect(promoted.baseline.inputs.altitudeKm).toBe(900);
    expect(promoted.baseline.result).toBe(ran.candidate?.result);
    expect(promoted.candidate).toBeNull();
    expect(promoted.draft).toEqual(promoted.baseline.inputs);
    expect(candidateRunState(promoted)).toBe('not-run');
  });

  it('is a no-op when no candidate exists', () => {
    const state = initialState();
    expect(promoteCandidateToBaseline(state)).toBe(state);
  });

  it('keeps the new reference when the candidate parameters are edited afterwards', () => {
    const promoted = promoteCandidateToBaseline(
      runCandidate(editDraft(initialState(), { altitudeKm: 900 })),
    );
    const edited = editDraft(promoted, { altitudeKm: 300 });

    expect(edited.baseline).toBe(promoted.baseline);
    expect(edited.baseline.inputs.altitudeKm).toBe(900);
    expect(edited.draft.altitudeKm).toBe(300);
    // Restoring now returns to the promoted reference, not the original default.
    expect(restoreDraftFromBaseline(edited).draft.altitudeKm).toBe(900);
  });
});

describe('cached reference states', () => {
  it('loads the exact state into the draft without changing either record or running it', () => {
    const state = initialState();
    const { preset, inputs } = referenceInputs();
    const loaded = replaceDraft(state, inputs);

    expect(loaded.draft.reference?.id).toBe(preset.id);
    expect(loaded.draft.reference?.state).toEqual(preset.state);
    expect(loaded.draft.reference?.state.positionKm).not.toBe(preset.state.positionKm);
    expect(loaded.baseline).toBe(state.baseline);
    expect(loaded.candidate).toBeNull();
    expect(candidateRunState(loaded)).toBe('unrun-changes');
  });

  it('runs the exact provider vector and binds the candidate record to its provenance', () => {
    const state = initialState();
    const { preset, inputs } = referenceInputs();
    const ran = runCandidate(replaceDraft(state, inputs));

    expect(ran.lastRunIssues).toEqual([]);
    expect(ran.candidate?.inputs.reference?.id).toBe(preset.id);
    expect(ran.candidate?.config.initialState).toEqual(preset.state);
    expect(ran.candidate?.result.samples[0].state).toEqual(preset.state);
    expect(ran.candidate?.result.label).toContain('hypothetical');
    expect(ran.baseline).toBe(state.baseline);
    expect(candidateRunState(ran)).toBe('in-sync');
  });

  it('treats a reference state and a circular state with the same numbers as different inputs', () => {
    const state = initialState();
    const { preset, inputs } = referenceInputs();
    const loaded = replaceDraft(state, inputs);
    const circular = editDraft(loaded, {
      altitudeKm: loaded.draft.altitudeKm,
      speedKmPerS: loaded.draft.speedKmPerS,
    });

    expect(circular.draft.reference).toBeUndefined();
    expect(circular.draft.derivedFrom?.id).toBe(preset.id);
    expect(circular.draft.derivedFrom?.state).toEqual(preset.state);
    expect(circular.draft.derivedFrom?.state.positionKm).not.toBe(preset.state.positionKm);
    expect(sameInputs(loaded.draft, circular.draft)).toBe(false);
    expect(candidateRunState(circular)).toBe('unrun-changes');
    expect(sameInputs(loaded.draft, replaceDraft(state, inputs).draft)).toBe(true);
    expect(buildScenarioConfig(circular.draft).label).toContain('circular approximation');
  });

  it('keeps the reference-derived provenance when a converted candidate is run and promoted', () => {
    const state = initialState();
    const { preset, inputs } = referenceInputs();
    const converted = editDraft(replaceDraft(state, inputs), {
      altitudeKm: inputs.altitudeKm,
      speedKmPerS: inputs.speedKmPerS,
    });
    const ran = runCandidate(converted);
    const promoted = promoteCandidateToBaseline(ran);

    expect(ran.candidate?.inputs.reference).toBeUndefined();
    expect(ran.candidate?.inputs.derivedFrom?.id).toBe(preset.id);
    expect(ran.candidate?.config.label).toContain('circular approximation');
    expect(ran.candidate?.config.initialState.positionKm.x).toBeCloseTo(
      EARTH_MEAN_RADIUS_KM + converted.draft.altitudeKm,
      9,
    );
    expect(ran.candidate?.config.initialState.positionKm.y).toBe(0);
    expect(ran.candidate?.config.initialState.positionKm.z).toBe(0);
    expect(ran.candidate?.config.initialState.velocityKmPerS.x).toBe(0);
    expect(ran.candidate?.config.initialState.velocityKmPerS.y).toBeCloseTo(
      converted.draft.speedKmPerS,
      12,
    );
    expect(ran.candidate?.result.samples[0].state).toEqual(
      ran.candidate?.config.initialState,
    );
    expect(ran.candidate?.result.samples[0].state).not.toEqual(preset.state);
    expect(promoted.baseline.inputs.derivedFrom?.id).toBe(preset.id);
    expect(promoted.draft.derivedFrom?.id).toBe(preset.id);
  });

  it('preserves the reference through promotion and reproduces it when restoring', () => {
    const state = initialState();
    const { preset, inputs } = referenceInputs();
    const ran = runCandidate(replaceDraft(state, inputs));
    const promoted = promoteCandidateToBaseline(ran);

    expect(promoted.baseline.inputs.reference?.id).toBe(preset.id);
    expect(promoted.draft.reference?.id).toBe(preset.id);
    expect(promoted.candidate).toBeNull();

    const restored = restoreDraftFromBaseline(editDraft(promoted, { altitudeKm: 500 }));
    expect(restored.candidate?.config.initialState).toEqual(preset.state);
    expect(restored.candidate?.result.samples[0].state).toEqual(preset.state);
  });
});

describe('record invariants', () => {
  it('altitude and radius in a record match the engine position magnitude', () => {
    const state = initialState();
    const firstSample = state.baseline.result.samples[0];
    const radiusKm = magnitude(firstSample.state.positionKm);

    expect(radiusKm).toBeCloseTo(EARTH_MEAN_RADIUS_KM + state.baseline.inputs.altitudeKm, 6);
  });
});
