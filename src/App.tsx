/**
 * Workspace composition root.
 *
 * This component owns UI state only: the baseline/candidate comparison state
 * (which bundles parameters, configuration, and engine result per run), the
 * selected object, the displayed record, and the playback cursor. All numerical
 * output comes from the untouched physics engine, and the viewport draws exactly
 * the samples of the displayed record.
 */

import { useCallback, useMemo, useState } from 'react';

import './app/workspace.css';

import { ObjectBrowser, type Selection } from './app/ObjectBrowser';
import { ComparisonPanel } from './app/ComparisonPanel';
import { ComparisonSummary } from './app/ComparisonSummary';
import { InspectorPanel } from './app/InspectorPanel';
import { ModelNotice } from './app/ModelNotice';
import { PlaybackTimeline } from './app/PlaybackTimeline';
import { ResultsPanel } from './app/ResultsPanel';
import { StatusBanner } from './app/StatusBanner';
import { TopBar } from './app/TopBar';
import { usePlayback } from './app/playback';
import {
  altitudeSeries,
  type AltitudeSeries,
} from './comparison/compareRuns';
import {
  candidateRunState,
  editDraft,
  initialComparisonState,
  promoteCandidateToBaseline,
  restoreDraftFromBaseline,
  runCandidate,
  type RecordRole,
} from './comparison/records';
import { lastSampleTimeSeconds, runAggregates, sampleMetrics } from './results/runSummary';
import { EARTH_MEAN_RADIUS_KM } from './simulation';
import { SimulationViewport } from './scene/SimulationViewport';
import { scenarioReference, validateScenarioInputs, DEFAULT_SCENARIO_INPUTS, type ScenarioInputs } from './scenarios/scenarioInputs';

const RECORD_LABEL: Record<RecordRole, string> = {
  baseline: 'Baseline (reference)',
  candidate: 'Candidate',
};

export default function App() {
  const [comparison, setComparison] = useState(() => initialComparisonState());
  const [selection, setSelection] = useState<Selection>('particle');
  const [view, setView] = useState<RecordRole>('baseline');

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

  const handleRestoreBaseline = useCallback(() => {
    setComparison((previous) => (previous ? restoreDraftFromBaseline(previous) : previous));
    setView('candidate');
  }, []);

  const handlePromoteCandidate = useCallback(() => {
    setComparison((previous) => (previous ? promoteCandidateToBaseline(previous) : previous));
    setView('baseline');
  }, []);

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
    <div className="app">
      <TopBar
        record={displayed}
        sampleIndex={sampleIndex}
        playing={playback.playing}
        onTogglePlay={playback.toggle}
        onReset={playback.reset}
        view={displayed.role}
        onChangeView={setView}
        candidateAvailable={candidate !== null}
        candidateRunState={draftState}
      />

      <div className="app__body">
        <aside className="app__column app__column--left" aria-label="Scene objects and model notes">
          <ObjectBrowser
            result={displayed.result}
            selection={selection}
            onSelect={setSelection}
            metrics={metrics}
          />
          <ModelNotice result={displayed.result} bodyRadiusKm={EARTH_MEAN_RADIUS_KM} />
        </aside>

        <main className="app__viewport" aria-label="3D viewport and comparison chart">
          <SimulationViewport
            result={displayed.result}
            sampleIndex={sampleIndex}
            bodyRadiusKm={EARTH_MEAN_RADIUS_KM}
            sceneExtentKm={aggregates.maxRadiusKm}
          />
          <StatusBanner
            result={displayed.result}
            recordLabel={RECORD_LABEL[displayed.role]}
            draftIssues={draftIssues}
            lastRunIssues={comparison.lastRunIssues}
            engineError={comparison.lastRunEngineError}
            lastSampleTimeSeconds={maxTimeSeconds}
          />
          <ComparisonPanel
            series={series}
            baseline={baseline}
            candidate={candidate}
            candidateRunState={draftState}
            bodyRadiusKm={EARTH_MEAN_RADIUS_KM}
          />
        </main>

        <aside className="app__column app__column--right" aria-label="Inspector and results">
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
