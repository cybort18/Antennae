/**
 * Workspace composition root.
 *
 * This component owns UI state only: the baseline/candidate comparison state
 * (which bundles parameters, configuration, and engine result per run), the
 * selected object, the displayed record, and the playback cursor. All numerical
 * output comes from the untouched physics engine, and the viewport draws exactly
 * the samples of the displayed record.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import './app/workspace.css';
import './app/solarSystem.css';

import { ObjectBrowser, type Selection } from './app/ObjectBrowser';
import { ComparisonPanel } from './app/ComparisonPanel';
import { ComparisonSummary } from './app/ComparisonSummary';
import { InspectorPanel } from './app/InspectorPanel';
import { MissionDesignerPanel } from './app/MissionDesignerPanel';
import { ModelNotice } from './app/ModelNotice';
import { PlaybackTimeline } from './app/PlaybackTimeline';
import { ReferencePresetPanel } from './app/ReferencePresetPanel';
import { ResultsPanel } from './app/ResultsPanel';
import { SolarSystemOverview } from './app/SolarSystemOverview';
import { StatusBanner } from './app/StatusBanner';
import { TopBar } from './app/TopBar';
import { usePlayback } from './app/playback';
import type { WorkspaceMode } from './app/ModeTabs';
import {
  MISSION_RUN_ORBIT_COUNT,
  MISSION_TARGET_ALTITUDE_DEFAULT_KM,
  evaluateCircularOrbitMission,
  idealCircularStartForMission,
} from './missions';
import {
  altitudeSeries,
  type AltitudeSeries,
} from './comparison/compareRuns';
import {
  candidateRunState,
  editDraft,
  initialComparisonState,
  promoteCandidateToBaseline,
  replaceDraft,
  restoreDraftFromBaseline,
  runCandidate,
  type ComparisonState,
  type RecordRole,
} from './comparison/records';
import { loadReferencePresets } from './data';
import type { ReferencePreset } from './data/types';
import { lastSampleTimeSeconds, runAggregates, sampleMetrics } from './results/runSummary';
import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MU_KM3_S2,
  circularOrbitalPeriodSeconds,
} from './simulation';
import { SimulationViewport } from './scene/SimulationViewport';
import { spacecraftModelForInputs } from './scene/spacecraftModels';
import {
  DEFAULT_SCHEMATIC_RATE,
  type SchematicPlaybackRate,
} from './solarSystem/schematicMotion';
import type { SolarSystemBodyId } from './solarSystem/bodies';
import {
  DEFAULT_SCENARIO_INPUTS,
  INPUT_LIMITS,
  inputsFromReferencePreset,
  scenarioReference,
  validateScenarioInputs,
  type ScenarioInputs,
} from './scenarios/scenarioInputs';

const RECORD_LABEL: Record<RecordRole, string> = {
  baseline: 'Baseline (reference)',
  candidate: 'Candidate',
};

export default function App() {
  const [mode, setMode] = useState<WorkspaceMode>('overview');
  const [comparison, setComparison] = useState<ComparisonState | null>(null);
  const [missionTargetAltitudeKm, setMissionTargetAltitudeKm] = useState(
    MISSION_TARGET_ALTITUDE_DEFAULT_KM,
  );
  const [overviewSelection, setOverviewSelection] = useState<SolarSystemBodyId>('sun');
  const [overviewElapsedDays, setOverviewElapsedDays] = useState(0);
  const [overviewRateDaysPerSec, setOverviewRateDaysPerSec] =
    useState<SchematicPlaybackRate>(DEFAULT_SCHEMATIC_RATE);
  const [selection, setSelection] = useState<Selection>('particle');
  const [view, setView] = useState<RecordRole>('baseline');
  const [sidebarLeftOpen, setSidebarLeftOpen] = useState(false);
  const referenceData = useMemo(() => loadReferencePresets(), []);

  useEffect(() => {
    if (!sidebarLeftOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarLeftOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarLeftOpen]);

  const handleModeChange = useCallback((next: WorkspaceMode) => {
    if (next === 'lab' || next === 'mission') {
      // The baseline is created only when a simulation workspace is first
      // opened. Landing on the reference overview does not execute the engine.
      // Lab and Mission Designer share the same immutable records so switching
      // modes can never silently create a second engine or discard a run.
      setComparison((previous) => previous ?? initialComparisonState());
    }
    setMode(next);
  }, []);

  const draft = comparison?.draft;
  const draftReference = useMemo(
    () => scenarioReference(draft ?? DEFAULT_SCENARIO_INPUTS),
    [draft],
  );
  const draftIssues = useMemo(
    () => validateScenarioInputs(draft ?? DEFAULT_SCENARIO_INPUTS),
    [draft],
  );

  const baseline = comparison?.baseline ?? null;
  const candidate = comparison?.candidate ?? null;
  const displayed = view === 'candidate' && candidate ? candidate : baseline;
  const displayedSpacecraftModel = displayed
    ? spacecraftModelForInputs(displayed.inputs)
    : null;

  // The mission evaluates the last explicit candidate run when one exists;
  // otherwise the baseline is shown as an evaluated reference. This never reads
  // editable parameters as if they were a result.
  const missionEvaluatedRecord = candidate ?? baseline;
  const missionEvaluation = useMemo(
    () =>
      evaluateCircularOrbitMission({
        targetAltitudeKm: missionTargetAltitudeKm,
        result: missionEvaluatedRecord?.result ?? null,
      }),
    [missionEvaluatedRecord, missionTargetAltitudeKm],
  );

  const series: AltitudeSeries[] = useMemo(() => {
    const list: AltitudeSeries[] = [];
    if (baseline) {
      list.push(altitudeSeries(baseline, EARTH_MEAN_RADIUS_KM));
    }
    if (candidate) {
      list.push(altitudeSeries(candidate, EARTH_MEAN_RADIUS_KM));
    }
    return list;
  }, [baseline, candidate]);

  const aggregates = useMemo(
    () => (displayed ? runAggregates(displayed.result, EARTH_MEAN_RADIUS_KM) : null),
    [displayed],
  );
  const maxTimeSeconds = useMemo(
    () => (displayed ? lastSampleTimeSeconds(displayed.result) : 0),
    [displayed],
  );

  const playback = usePlayback({
    runKey: displayed?.result ?? null,
    sampleIntervalSeconds: displayed?.result.sampleIntervalSeconds ?? 1,
    sampleCount: displayed?.result.samples.length ?? 0,
    maxTimeSeconds,
  });

  // Any mode switch pauses the cursor instead of advancing it invisibly on a
  // surface that is no longer the active workspace. The cursor position and all
  // records remain intact.
  const pausePlayback = playback.pause;
  useEffect(() => {
    pausePlayback();
  }, [mode, pausePlayback]);

  // The mode tab that was clicked is unmounted by the switch, so move focus to
  // the destination's main heading/region for keyboard and screen-reader users.
  const previousMode = useRef(mode);
  useEffect(() => {
    if (previousMode.current === mode) {
      return;
    }
    previousMode.current = mode;
    const target = document.getElementById(
      mode === 'overview'
        ? 'overview-title'
        : mode === 'mission'
          ? 'mission-designer-title'
          : 'lab-workspace',
    );
    target?.focus();
  }, [mode]);

  const sampleIndex = displayed
    ? Math.min(playback.sampleIndex, Math.max(displayed.result.samples.length - 1, 0))
    : 0;
  const metrics = useMemo(
    () =>
      displayed
        ? sampleMetrics(
            displayed.result.samples[sampleIndex],
            displayed.result.centralBody.gravitationalParameterKm3PerS2,
            EARTH_MEAN_RADIUS_KM,
          )
        : null,
    [displayed, sampleIndex],
  );

  const handleDraftChange = useCallback((patch: Partial<ScenarioInputs>) => {
    setComparison((previous) => (previous ? editDraft(previous, patch) : previous));
  }, []);

  const handleSetMissionIdealStart = useCallback(() => {
    const ideal = idealCircularStartForMission(missionTargetAltitudeKm);
    if (!ideal) {
      return;
    }
    setComparison((previous) =>
      previous
        ? editDraft(previous, {
            altitudeKm: ideal.altitudeKm,
            speedKmPerS: ideal.speedKmPerS,
            orbitCount: MISSION_RUN_ORBIT_COUNT,
          })
        : previous,
    );
  }, [missionTargetAltitudeKm]);

  const handleLoadReferencePreset = useCallback((preset: ReferencePreset) => {
    setComparison((previous) =>
      previous
        ? replaceDraft(
            previous,
            inputsFromReferencePreset(preset, {
              orbitCount: previous.draft.orbitCount,
              timestepSeconds: previous.draft.timestepSeconds,
            }),
          )
        : previous,
    );
    setSelection('particle');
  }, []);

  const handleRunCandidate = useCallback(() => {
    if (!comparison) {
      return;
    }
    const next = runCandidate(comparison);
    setComparison(next);

    // Only a successful run switches the viewport to the candidate; a rejected
    // run leaves the displayed record untouched.
    if (next.candidate && next.candidate !== comparison.candidate) {
      setView('candidate');
    }
  }, [comparison]);

  const handleRunMission = useCallback(() => {
    if (!comparison) {
      return;
    }

    // The mission test window is not a design variable: extend the existing
    // draft to at least two initial reference periods (and enough periods to
    // cover the target period) before running the same engine. The two-period
    // floor is sufficient for the documented target range even at the minimum
    // supported initial altitude.
    const targetPeriodSeconds = circularOrbitalPeriodSeconds(
      EARTH_MEAN_RADIUS_KM + missionTargetAltitudeKm,
      EARTH_MU_KM3_S2,
    );
    const initialReference = scenarioReference(comparison.draft);
    const requiredOrbitCount =
      Number.isFinite(targetPeriodSeconds) && initialReference.periodSeconds > 0
        ? Math.min(
            INPUT_LIMITS.orbitCount.max,
            Math.max(
              MISSION_RUN_ORBIT_COUNT,
              Math.ceil(targetPeriodSeconds / initialReference.periodSeconds),
            ),
          )
        : comparison.draft.orbitCount;

    const next = runCandidate(editDraft(comparison, { orbitCount: requiredOrbitCount }));
    setComparison(next);

    if (next.candidate && next.candidate !== comparison.candidate) {
      setView('candidate');
    }
  }, [comparison, missionTargetAltitudeKm]);

  const handleRestoreBaseline = useCallback(() => {
    setComparison((previous) => (previous ? restoreDraftFromBaseline(previous) : previous));
    setView('candidate');
  }, []);

  const handlePromoteCandidate = useCallback(() => {
    setComparison((previous) => (previous ? promoteCandidateToBaseline(previous) : previous));
    setView('baseline');
  }, []);

  if (mode === 'overview') {
    return (
      <SolarSystemOverview
        selectedId={overviewSelection}
        onSelect={setOverviewSelection}
        elapsedDays={overviewElapsedDays}
        onChangeElapsedDays={setOverviewElapsedDays}
        rateDaysPerSec={overviewRateDaysPerSec}
        onChangeRateDaysPerSec={setOverviewRateDaysPerSec}
        onChangeMode={handleModeChange}
      />
    );
  }

  if (!comparison || !baseline || !displayed || !aggregates || !metrics || !draft) {
    // Defensive: only reachable if the built-in defaults were somehow invalid.
    // Reported as a workspace problem rather than shown as a simulation result.
    return (
      <div className="app app--fallback">
        <div className="fallback">
          <h1>Workspace could not start</h1>
          <p>
            The default scenario did not produce a valid baseline simulation. This indicates a bug in
            the workspace defaults, not a physics result.
          </p>
          <ul className="banner__list">
            {validateScenarioInputs(DEFAULT_SCENARIO_INPUTS).map((issue) => (
              <li key={`${issue.field}:${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const atFinalSample = sampleIndex >= displayed.result.samples.length - 1;
  const draftState = candidateRunState(comparison);

  return (
    <div className="app" data-mode={mode}>
      <TopBar
        mode={mode}
        record={displayed}
        view={displayed.role}
        onChangeView={setView}
        candidateAvailable={candidate !== null}
        candidateRunState={draftState}
        onChangeMode={handleModeChange}
      />

      <div className="workspace-status" aria-live="polite">
        <StatusBanner
          result={displayed.result}
          recordLabel={RECORD_LABEL[displayed.role]}
          draftIssues={draftIssues}
          lastRunIssues={comparison.lastRunIssues}
          engineError={comparison.lastRunEngineError}
          lastSampleTimeSeconds={maxTimeSeconds}
          runActionLabel={mode === 'mission' ? 'Run Mission' : 'Run candidate'}
          draftLabel={mode === 'mission' ? 'Starting conditions' : 'Candidate parameters'}
        />
      </div>

      <div className="app__body" data-sidebar-left={sidebarLeftOpen ? 'expanded' : 'collapsed'}>
        {!sidebarLeftOpen ? (
          <button
            type="button"
            className="sidebar-expand-floating"
            onClick={() => setSidebarLeftOpen(true)}
            aria-expanded={false}
            aria-label="Objects & data"
            title="Open objects and reference panel"
          >
            <span aria-hidden="true">⊞ </span>Objects & data
          </button>
        ) : null}

        {sidebarLeftOpen ? (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarLeftOpen(false)}
            aria-hidden="true"
          />
        ) : null}

        <aside
          className="app__column app__column--left"
          aria-label="Scene objects and model notes"
          aria-hidden={!sidebarLeftOpen}
        >
          <div className="sidebar-rail__head">
            <span className="sidebar-rail__title">Objects & data</span>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={() => setSidebarLeftOpen(false)}
              aria-label="Close objects and reference panel"
              title="Close panel to expand 3D scene"
            >
              ✕ Close
            </button>
          </div>
          <ObjectBrowser
            result={displayed.result}
            selection={selection}
            onSelect={setSelection}
            metrics={metrics}
            spacecraftModel={displayedSpacecraftModel}
          />
          <ReferencePresetPanel
            preset={referenceData.presets[0] ?? null}
            error={referenceData.error}
            loadedPresetId={draft.reference?.id ?? null}
            onLoad={handleLoadReferencePreset}
          />
          <ModelNotice
            result={displayed.result}
            bodyRadiusKm={EARTH_MEAN_RADIUS_KM}
            reference={displayed.inputs.reference ?? null}
            derivedFrom={displayed.inputs.derivedFrom ?? null}
          />
        </aside>

        <main
          id={mode === 'mission' ? 'mission-workspace' : 'lab-workspace'}
          className="app__viewport"
          aria-label={mode === 'mission' ? 'Mission Designer 3D viewport' : '3D viewport'}
          tabIndex={-1}
        >
          <SimulationViewport
            result={displayed.result}
            sampleIndex={sampleIndex}
            bodyRadiusKm={EARTH_MEAN_RADIUS_KM}
            sceneExtentKm={aggregates.maxRadiusKm}
            spacecraftModel={displayedSpacecraftModel}
          />
        </main>

        <ComparisonPanel
          series={series}
          baseline={baseline}
          candidate={candidate}
          candidateRunState={draftState}
          bodyRadiusKm={EARTH_MEAN_RADIUS_KM}
        />

        <aside className="app__column app__column--right" aria-label="Mission or inspector and results">
          {mode === 'mission' ? (
            <>
              <MissionDesignerPanel
                targetAltitudeKm={missionTargetAltitudeKm}
                onTargetAltitudeChange={setMissionTargetAltitudeKm}
                draft={draft}
                draftReference={draftReference}
                draftIssues={draftIssues}
                onChange={handleDraftChange}
                onRunMission={handleRunMission}
                onSetIdealStart={handleSetMissionIdealStart}
                evaluation={missionEvaluation}
                evaluatedRecord={missionEvaluatedRecord}
                candidate={candidate}
                candidateRunState={draftState}
              />
              <details className="mission-run-details">
                <summary>Run comparison & sampled results</summary>
                <div className="mission-run-details__body">
                  <ComparisonSummary
                    baseline={baseline}
                    candidate={candidate}
                    bodyRadiusKm={EARTH_MEAN_RADIUS_KM}
                  />
                  <ResultsPanel
                    result={displayed.result}
                    metrics={metrics}
                    aggregates={aggregates}
                    sampleIndex={sampleIndex}
                    atFinalSample={atFinalSample}
                    recordLabel={RECORD_LABEL[displayed.role]}
                  />
                </div>
              </details>
            </>
          ) : (
            <>
              <InspectorPanel
                selection={selection}
                draft={draft}
                draftReference={draftReference}
                draftIssues={draftIssues}
                onChange={handleDraftChange}
                onRunCandidate={handleRunCandidate}
                onRestoreBaseline={handleRestoreBaseline}
                onPromoteCandidate={handlePromoteCandidate}
                baseline={baseline}
                candidate={candidate}
                candidateRunState={draftState}
                lastRunIssues={comparison.lastRunIssues}
                lastRunEngineError={comparison.lastRunEngineError}
                bodyRadiusKm={EARTH_MEAN_RADIUS_KM}
                displayedResult={displayed.result}
              />
              <ComparisonSummary
                baseline={baseline}
                candidate={candidate}
                bodyRadiusKm={EARTH_MEAN_RADIUS_KM}
              />
              <ResultsPanel
                result={displayed.result}
                metrics={metrics}
                aggregates={aggregates}
                sampleIndex={sampleIndex}
                atFinalSample={atFinalSample}
                recordLabel={RECORD_LABEL[displayed.role]}
              />
            </>
          )}
        </aside>
      </div>

      <PlaybackTimeline
        playback={playback}
        sampleCount={displayed.result.samples.length}
        maxTimeSeconds={maxTimeSeconds}
        sampleIntervalSeconds={displayed.result.sampleIntervalSeconds}
        recordLabel={RECORD_LABEL[displayed.role]}
      />
    </div>
  );
}
