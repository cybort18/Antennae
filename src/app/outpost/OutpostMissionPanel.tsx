import { useCallback, useEffect, useState } from 'react';
import {
  AVAILABLE_OUTPOST_SCENARIOS,
  CANONICAL_OUTPOST_SCENARIO,
  outpostScenarioById,
} from '../../outpost/scenarios';
import { createInitialSample, simulateOutpostDay } from '../../outpost/outpostSimulation';
import { evaluateOutpostMission } from '../../outpost/outpostEvaluator';
import type {
  DailyEnvironment,
  DilemmaOption,
  IncidentDilemma,
  OutpostDailySample,
  OutpostEvaluation,
  OutpostScenario,
  SubsystemAllocation,
} from '../../outpost/types';
import {
  isAudioMuted,
  playAdvanceSolSound,
  playAlertSiren,
  playClickSound,
  playDilemmaAlert,
  playMissionFailureTone,
  playMissionVictoryFanfare,
  toggleAudioMute,
} from '../../audio/outpostAudio';
import { getMissionRecord, saveMissionRecord } from '../../outpost/persistence';
import { JuniorAstronautBriefingModal } from './JuniorAstronautBriefingModal';
import { MissionCertificateModal } from './MissionCertificateModal';

const DEFAULT_ALLOCATION: SubsystemAllocation = {
  lifeSupportKw: 16.0,
  radiationShieldKw: 12.0,
  foodProductionKw: 14.0,
  auxiliaryKw: 4.0,
};

const CONSERVATION_PRESET: SubsystemAllocation = {
  lifeSupportKw: 16.0,
  radiationShieldKw: 12.0,
  foodProductionKw: 4.0,
  auxiliaryKw: 2.0,
};

const EMERGENCY_PRESET: SubsystemAllocation = {
  lifeSupportKw: 16.0,
  radiationShieldKw: 12.0,
  foodProductionKw: 0.0,
  auxiliaryKw: 2.0,
};

export interface OutpostMissionPanelProps {
  onSolChange?: (
    sol: number,
    dustTau: number,
    setting?: 'mars' | 'moon',
    insolation?: number,
  ) => void;
}

export function OutpostMissionPanel({ onSolChange }: OutpostMissionPanelProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(CANONICAL_OUTPOST_SCENARIO.id);
  const scenario: OutpostScenario = outpostScenarioById(selectedScenarioId);

  const [allocation, setAllocation] = useState<SubsystemAllocation>(DEFAULT_ALLOCATION);
  const [samples, setSamples] = useState<OutpostDailySample[]>(() => [createInitialSample(scenario)]);
  const [currentSol, setCurrentSol] = useState(0);
  const [evaluation, setEvaluation] = useState<OutpostEvaluation | null>(null);

  // Modals & Interactive Overlays
  const [activeDilemma, setActiveDilemma] = useState<IncidentDilemma | null>(null);
  const [resolvedDilemmaIds, setResolvedDilemmaIds] = useState<Record<string, string>>({});
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [audioMuted, setAudioMutedState] = useState<boolean>(() => isAudioMuted());

  const latestSample = samples[samples.length - 1];
  const isMissionFinished = currentSol >= scenario.durationSols || latestSample.crewStatus === 'incapacitated';
  const bestRecord = getMissionRecord(scenario.id);

  // Notify parent viewport when sol, scenario, or environment changes
  useEffect(() => {
    const env: DailyEnvironment | undefined =
      scenario.environmentalSchedule[Math.min(Math.max(currentSol - 1, 0), scenario.durationSols - 1)];
    const dust = env ? env.dustOpacityTau : 0.2;
    const insolation = env?.solarInsolationFraction ?? 1.0;
    onSolChange?.(currentSol, dust, scenario.setting, insolation);
  }, [currentSol, onSolChange, scenario]);

  const handleScenarioChange = useCallback((scenarioId: string) => {
    playClickSound();
    const newScenario = outpostScenarioById(scenarioId);
    setSelectedScenarioId(scenarioId);
    setSamples([createInitialSample(newScenario)]);
    setCurrentSol(0);
    setEvaluation(null);
    setActiveDilemma(null);
    setResolvedDilemmaIds({});
    setShowCertificateModal(false);
  }, []);

  const handleAudioToggle = useCallback(() => {
    const nextMuted = toggleAudioMute();
    setAudioMutedState(nextMuted);
    if (!nextMuted) {
      playClickSound();
    }
  }, []);

  const handleStepSol = useCallback(() => {
    if (isMissionFinished || activeDilemma) return;

    const nextSolIndex = currentSol + 1;
    const environment = scenario.environmentalSchedule[nextSolIndex - 1];
    if (!environment) return;

    // Check if this Sol triggers an unresolved tactical dilemma
    const pendingDilemma = scenario.dilemmas?.find(
      (d) => d.sol === nextSolIndex && !resolvedDilemmaIds[d.id],
    );

    if (pendingDilemma) {
      playDilemmaAlert();
      setActiveDilemma(pendingDilemma);
      return;
    }

    playAdvanceSolSound();

    setSamples((prev) => {
      const prevSample = prev[prev.length - 1];
      const nextSample = simulateOutpostDay(prevSample, allocation, environment, scenario);
      const newSamples = [...prev, nextSample];

      // Audio alerts for hazard conditions
      if (
        nextSample.events.includes('HYPOXIA_WARNING') ||
        nextSample.events.includes('RADIATION_SPIKE_UNSHIELDED') ||
        nextSample.events.includes('BATTERY_DEPLETED')
      ) {
        playAlertSiren();
      }

      if (nextSolIndex >= scenario.durationSols || nextSample.crewStatus === 'incapacitated') {
        const evalResult = evaluateOutpostMission({
          scenario,
          allocations: [allocation],
          samples: newSamples,
          completed: nextSample.crewStatus !== 'incapacitated',
        });
        setEvaluation(evalResult);

        if (evalResult.outcome === 'PASS') {
          playMissionVictoryFanfare();
          saveMissionRecord(
            scenario.id,
            'PASS',
            evalResult.starsAwarded ?? 1,
            evalResult.commanderRank ?? 'Commander',
          );
        } else {
          playMissionFailureTone();
        }
      }

      return newSamples;
    });

    setCurrentSol(nextSolIndex);
  }, [activeDilemma, allocation, currentSol, isMissionFinished, resolvedDilemmaIds, scenario]);

  const handleResolveDilemma = useCallback(
    (option: DilemmaOption) => {
      playClickSound();
      if (!activeDilemma) return;

      const dilemmaId = activeDilemma.id;
      const nextSolIndex = activeDilemma.sol;
      const environment = scenario.environmentalSchedule[nextSolIndex - 1];

      setResolvedDilemmaIds((prev) => ({ ...prev, [dilemmaId]: option.id }));
      setActiveDilemma(null);

      if (!environment) return;

      playAdvanceSolSound();

      setSamples((prev) => {
        const prevSample = prev[prev.length - 1];
        // 1. Simulate day physics
        let nextSample = simulateOutpostDay(prevSample, allocation, environment, scenario);

        // 2. Apply chosen tactical trade-off effect
        const effect = option.applyEffect(nextSample, allocation);
        nextSample = {
          ...nextSample,
          ...effect.samplePatch,
          events: [...nextSample.events, effect.eventLog],
        };

        const newSamples = [...prev, nextSample];

        if (nextSolIndex >= scenario.durationSols || nextSample.crewStatus === 'incapacitated') {
          const evalResult = evaluateOutpostMission({
            scenario,
            allocations: [allocation],
            samples: newSamples,
            completed: nextSample.crewStatus !== 'incapacitated',
          });
          setEvaluation(evalResult);

          if (evalResult.outcome === 'PASS') {
            playMissionVictoryFanfare();
            saveMissionRecord(
              scenario.id,
              'PASS',
              evalResult.starsAwarded ?? 1,
              evalResult.commanderRank ?? 'Commander',
            );
          } else {
            playMissionFailureTone();
          }
        }

        return newSamples;
      });

      setCurrentSol(nextSolIndex);
    },
    [activeDilemma, allocation, scenario],
  );

  const handleRunAll = useCallback(() => {
    if (isMissionFinished || activeDilemma) return;

    let localSamples = [...samples];
    let sol = currentSol;

    while (sol < scenario.durationSols) {
      sol += 1;
      const environment = scenario.environmentalSchedule[sol - 1];
      const prevSample = localSamples[localSamples.length - 1];

      // Stop loop if an unresolved dilemma is encountered
      const pendingDilemma = scenario.dilemmas?.find(
        (d) => d.sol === sol && !resolvedDilemmaIds[d.id],
      );
      if (pendingDilemma) {
        setSamples(localSamples);
        setCurrentSol(sol - 1);
        playDilemmaAlert();
        setActiveDilemma(pendingDilemma);
        return;
      }

      const nextSample = simulateOutpostDay(prevSample, allocation, environment, scenario);
      localSamples.push(nextSample);

      if (nextSample.crewStatus === 'incapacitated') {
        break;
      }
    }

    setSamples(localSamples);
    setCurrentSol(sol);

    const finalSample = localSamples[localSamples.length - 1];
    const evalResult = evaluateOutpostMission({
      scenario,
      allocations: [allocation],
      samples: localSamples,
      completed: finalSample.crewStatus !== 'incapacitated' && sol >= scenario.durationSols,
    });
    setEvaluation(evalResult);

    if (evalResult.outcome === 'PASS') {
      playMissionVictoryFanfare();
      saveMissionRecord(
        scenario.id,
        'PASS',
        evalResult.starsAwarded ?? 1,
        evalResult.commanderRank ?? 'Commander',
      );
    } else {
      playMissionFailureTone();
    }
  }, [activeDilemma, allocation, currentSol, isMissionFinished, resolvedDilemmaIds, samples, scenario]);

  const handleReset = useCallback(() => {
    playClickSound();
    const initial = createInitialSample(scenario);
    setSamples([initial]);
    setCurrentSol(0);
    setEvaluation(null);
    setActiveDilemma(null);
    setResolvedDilemmaIds({});
    setShowCertificateModal(false);
  }, [scenario]);

  const totalDemandKw =
    allocation.lifeSupportKw +
    allocation.radiationShieldKw +
    allocation.foodProductionKw +
    allocation.auxiliaryKw;

  const currentEnv =
    currentSol > 0
      ? scenario.environmentalSchedule[currentSol - 1]
      : scenario.environmentalSchedule[0];

  return (
    <div className="outpost-panel" role="region" aria-label="Outpost Mission Trainer Console">
      {/* Onboarding & Certificate Modals */}
      <JuniorAstronautBriefingModal
        isOpen={showBriefingModal}
        onClose={() => setShowBriefingModal(false)}
      />
      <MissionCertificateModal
        isOpen={showCertificateModal}
        evaluation={evaluation}
        scenario={scenario}
        onClose={() => setShowCertificateModal(false)}
      />

      {/* Header & Scenario Briefing */}
      <div className="outpost-header">
        <div className="outpost-header__top-row">
          <div className="outpost-header__badge">NASA JUNIOR ASTRONAUT ACADEMY</div>
          <div className="outpost-header__actions">
            <button
              type="button"
              className="outpost-btn-pill"
              onClick={() => {
                playClickSound();
                setShowBriefingModal(true);
              }}
              title="Open Junior Astronaut mission training briefing"
              aria-label="Open Junior Astronaut Mission Guide"
            >
              📖 Mission Guide
            </button>
            <button
              type="button"
              className="outpost-btn-pill"
              onClick={handleAudioToggle}
              title={audioMuted ? 'Unmute procedural audio' : 'Mute audio'}
              aria-label={audioMuted ? 'Unmute sound effects' : 'Mute sound effects'}
            >
              {audioMuted ? '🔇 Audio Off' : '🔊 Audio On'}
            </button>
          </div>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="outpost-scenario-selector" role="tablist" aria-label="Select planetary outpost scenario">
          {AVAILABLE_OUTPOST_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              role="tab"
              aria-selected={sc.id === scenario.id}
              className={
                sc.id === scenario.id
                  ? 'outpost-scenario-tab is-active'
                  : 'outpost-scenario-tab'
              }
              onClick={() => handleScenarioChange(sc.id)}
            >
              <span className="outpost-scenario-tab__icon">
                {sc.setting === 'mars' ? '🔴' : '⚪'}
              </span>
              <span className="outpost-scenario-tab__name">
                {sc.setting === 'mars' ? 'Mars Jezero Crisis' : 'Moon Artemis Endurance'}
              </span>
            </button>
          ))}
        </div>

        <h2 className="outpost-header__title">{scenario.title}</h2>
        <p className="outpost-header__desc">{scenario.description}</p>

        {bestRecord && bestRecord.outcome === 'PASS' ? (
          <div className="outpost-best-score">
            <span>🏆 Best Record: {'★'.repeat(bestRecord.starsAwarded)} {bestRecord.commanderRank}</span>
          </div>
        ) : null}
      </div>

      {/* Environmental Alert Banner */}
      <div className="outpost-env-banner">
        <div className="outpost-env-banner__col">
          <span className="outpost-env-label">
            {scenario.setting === 'mars' ? 'MISSION TIMELINE' : 'LUNAR CYCLE'}
          </span>
          <span className="outpost-env-value">
            {currentSol === 0
              ? 'PRE-FLIGHT (SOL 0)'
              : `${scenario.setting === 'mars' ? 'SOL' : 'DAY'} ${currentSol} / ${scenario.durationSols}`}
          </span>
        </div>
        <div className="outpost-env-banner__col">
          <span className="outpost-env-label">
            {scenario.setting === 'mars' ? 'DUST OPACITY (τ)' : 'SURFACE INSOLATION'}
          </span>
          <span className="outpost-env-value">
            {scenario.setting === 'mars'
              ? `${currentEnv.dustOpacityTau.toFixed(2)} ${currentEnv.dustOpacityTau >= 0.7 ? '· DUST STORM' : '· CLEAR'}`
              : `${((currentEnv.solarInsolationFraction ?? 1.0) * 100).toFixed(0)}% ${
                  (currentEnv.solarInsolationFraction ?? 1.0) <= 0.05 ? '· NIGHT SHADOW' : '· SUNLIT'
                }`}
          </span>
        </div>
        <div className="outpost-env-banner__col">
          <span className="outpost-env-label">SPACE WEATHER</span>
          <span
            className={
              currentEnv.solarParticleEventActive
                ? 'outpost-env-value is-warning'
                : 'outpost-env-value is-nominal'
            }
          >
            {currentEnv.solarParticleEventActive ? '⚠️ SPE FLARE ACTIVE' : 'NOMINAL (GCR)'}
          </span>
        </div>
      </div>

      {/* Incident Tactical Dilemma Alert Card (When active) */}
      {activeDilemma ? (
        <div className="outpost-dilemma-card" role="alert" aria-live="assertive">
          <div className="outpost-dilemma-card__header">
            <span className="outpost-dilemma-badge">⚠️ COMMAND DILEMMA · SOL {activeDilemma.sol}</span>
            <h3 className="outpost-dilemma-title">{activeDilemma.title}</h3>
            <p className="outpost-dilemma-briefing">{activeDilemma.briefing}</p>
          </div>
          <div className="outpost-dilemma-options">
            {activeDilemma.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="outpost-dilemma-btn"
                onClick={() => handleResolveDilemma(option)}
              >
                <span className="outpost-dilemma-btn__label">{option.label}</span>
                <span className="outpost-dilemma-btn__desc">{option.description}</span>
                <span className="outpost-dilemma-btn__cost">Impact: {option.costDescription}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Simulation Execution Controls */}
      <div className="outpost-controls-bar">
        <button
          type="button"
          className="outpost-btn outpost-btn--primary"
          onClick={handleStepSol}
          disabled={isMissionFinished || Boolean(activeDilemma)}
        >
          ▶ Advance 1 Sol
        </button>
        <button
          type="button"
          className="outpost-btn outpost-btn--secondary"
          onClick={handleRunAll}
          disabled={isMissionFinished || Boolean(activeDilemma)}
        >
          ▶▶ Run Scenario
        </button>
        <button
          type="button"
          className="outpost-btn outpost-btn--ghost"
          onClick={handleReset}
        >
          ↺ Reset Sol 0
        </button>
        {evaluation && evaluation.outcome === 'PASS' ? (
          <button
            type="button"
            className="outpost-btn outpost-btn--gold"
            onClick={() => {
              playClickSound();
              setShowCertificateModal(true);
            }}
          >
            🎖️ View Certificate
          </button>
        ) : null}
      </div>

      {/* Real-Time Primary Subsystem Telemetry */}
      <div className="outpost-telemetry-grid">
        {/* Oxygen Tile */}
        <div className="outpost-tile">
          <div className="outpost-tile__header">
            <span className="outpost-tile__label">CABIN O2</span>
            <span
              className={
                latestSample.oxygenLevelPercent < 19.5
                  ? 'outpost-tile__status is-danger'
                  : 'outpost-tile__status is-ok'
              }
            >
              {latestSample.oxygenLevelPercent < 19.5 ? 'HYPOXIA RISK' : 'SAFE'}
            </span>
          </div>
          <div className="outpost-tile__value">
            {latestSample.oxygenLevelPercent.toFixed(1)}%
          </div>
          <div className="outpost-tile__sub">Nominal 20.9% · Min 19.5%</div>
        </div>

        {/* Radiation Tile */}
        <div className="outpost-tile">
          <div className="outpost-tile__header">
            <span className="outpost-tile__label">RADIATION</span>
            <span
              className={
                latestSample.cumulativeRadiationDoseMsv >= 40.0
                  ? 'outpost-tile__status is-danger'
                  : 'outpost-tile__status is-ok'
              }
            >
              {latestSample.cumulativeRadiationDoseMsv >= 40.0 ? 'EXCEEDED' : 'NOMINAL'}
            </span>
          </div>
          <div className="outpost-tile__value">
            {latestSample.cumulativeRadiationDoseMsv.toFixed(1)} mSv
          </div>
          <div className="outpost-tile__sub">
            Today: +{latestSample.dailyRadiationDoseMsv.toFixed(1)} mSv · Limit 40 mSv
          </div>
        </div>

        {/* Food Production Tile */}
        <div className="outpost-tile">
          <div className="outpost-tile__header">
            <span className="outpost-tile__label">CROP HEALTH</span>
            <span
              className={
                latestSample.cropHealthPercent < 40.0
                  ? 'outpost-tile__status is-danger'
                  : 'outpost-tile__status is-ok'
              }
            >
              {latestSample.cropHealthPercent < 40.0 ? 'BLIGHT RISK' : 'GROWING'}
            </span>
          </div>
          <div className="outpost-tile__value">
            {latestSample.cropHealthPercent.toFixed(0)}%
          </div>
          <div className="outpost-tile__sub">Hydroponic biomass vitality</div>
        </div>

        {/* Power Grid Tile */}
        <div className="outpost-tile">
          <div className="outpost-tile__header">
            <span className="outpost-tile__label">BATTERY STORAGE</span>
            <span
              className={
                latestSample.batteryPercent <= 15.0
                  ? 'outpost-tile__status is-danger'
                  : 'outpost-tile__status is-ok'
              }
            >
              {latestSample.batteryPercent <= 15.0 ? 'BROWNOUT' : 'STORED'}
            </span>
          </div>
          <div className="outpost-tile__value">
            {latestSample.batteryPercent.toFixed(1)}%
          </div>
          <div className="outpost-tile__sub">
            {latestSample.batteryStorageKwh.toFixed(0)} / {latestSample.batteryCapacityKwh.toFixed(0)} kWh
          </div>
        </div>
      </div>

      {/* Subsystem Power Allocation Console */}
      <div className="outpost-allocation-card">
        <div className="outpost-allocation-card__header">
          <h3>Subsystem Power Allocations (kW)</h3>
          <div className="outpost-allocation-card__budget">
            <span>Generated: {latestSample.powerGeneratedKw.toFixed(1)} kW</span>
            <span>Demanded: {totalDemandKw.toFixed(1)} kW</span>
            <span
              className={
                latestSample.powerGeneratedKw >= totalDemandKw
                  ? 'budget-badge is-surplus'
                  : 'budget-badge is-deficit'
              }
            >
              {latestSample.powerGeneratedKw >= totalDemandKw
                ? `+${(latestSample.powerGeneratedKw - totalDemandKw).toFixed(1)} kW (Charging)`
                : `${(latestSample.powerGeneratedKw - totalDemandKw).toFixed(1)} kW (Discharging)`}
            </span>
          </div>
        </div>

        {/* Strategy Presets */}
        <div className="outpost-presets">
          <span className="outpost-presets__label">Quick Strategies:</span>
          <button
            type="button"
            className="outpost-btn-sm"
            onClick={() => {
              playClickSound();
              setAllocation(DEFAULT_ALLOCATION);
            }}
          >
            Nominal (46 kW)
          </button>
          <button
            type="button"
            className="outpost-btn-sm"
            onClick={() => {
              playClickSound();
              setAllocation(CONSERVATION_PRESET);
            }}
          >
            Dust Storm Conservation (34 kW)
          </button>
          <button
            type="button"
            className="outpost-btn-sm"
            onClick={() => {
              playClickSound();
              setAllocation(EMERGENCY_PRESET);
            }}
          >
            Emergency Life-Support Only (30 kW)
          </button>
        </div>

        {/* Sliders */}
        <div className="outpost-sliders">
          {/* Life Support */}
          <div className="outpost-slider-row">
            <div className="outpost-slider-label">
              <span>Life Support (ECLSS)</span>
              <span className="slider-val">{allocation.lifeSupportKw.toFixed(1)} kW</span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              step={0.5}
              value={allocation.lifeSupportKw}
              onChange={(e) =>
                setAllocation((prev) => ({
                  ...prev,
                  lifeSupportKw: parseFloat(e.target.value),
                }))
              }
              aria-label="ECLSS Life Support power in kW"
            />
            <span className="outpost-slider-hint">
              Minimum 16.0 kW required for nominal O2 &amp; thermal equilibrium
            </span>
          </div>

          {/* Radiation Shield */}
          <div className="outpost-slider-row">
            <div className="outpost-slider-label">
              <span>Radiation Shielding</span>
              <span className="slider-val">{allocation.radiationShieldKw.toFixed(1)} kW</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={allocation.radiationShieldKw}
              onChange={(e) =>
                setAllocation((prev) => ({
                  ...prev,
                  radiationShieldKw: parseFloat(e.target.value),
                }))
              }
              aria-label="Radiation Shielding power in kW"
            />
            <span className="outpost-slider-hint">
              Active magnetic storm shelter deflection (essential during SPE flare)
            </span>
          </div>

          {/* Food Production */}
          <div className="outpost-slider-row">
            <div className="outpost-slider-label">
              <span>Food Production (Greenhouse)</span>
              <span className="slider-val">{allocation.foodProductionKw.toFixed(1)} kW</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={allocation.foodProductionKw}
              onChange={(e) =>
                setAllocation((prev) => ({
                  ...prev,
                  foodProductionKw: parseFloat(e.target.value),
                }))
              }
              aria-label="Greenhouse food production power in kW"
            />
            <span className="outpost-slider-hint">
              Hydroponic LED grow lights; requires &ge;14 kW for health recovery
            </span>
          </div>

          {/* Auxiliary */}
          <div className="outpost-slider-row">
            <div className="outpost-slider-label">
              <span>Auxiliary Systems &amp; Avionics</span>
              <span className="slider-val">{allocation.auxiliaryKw.toFixed(1)} kW</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={allocation.auxiliaryKw}
              onChange={(e) =>
                setAllocation((prev) => ({
                  ...prev,
                  auxiliaryKw: parseFloat(e.target.value),
                }))
              }
              aria-label="Auxiliary base systems power in kW"
            />
            <span className="outpost-slider-hint">
              Base comms, telemetry, sensor network, and computational bus
            </span>
          </div>
        </div>
      </div>

      {/* Outcome & Evaluation Card */}
      {evaluation ? (
        <div
          role="status"
          aria-label="Mission Evaluation Outcome"
          className={
            evaluation.outcome === 'PASS'
              ? 'outpost-eval-card is-pass'
              : 'outpost-eval-card is-fail'
          }
        >
          <div className="outpost-eval-card__header">
            <div className="eval-status-badge">
              {evaluation.outcome === 'PASS'
                ? `MISSION CERTIFIED · ${'★'.repeat(evaluation.starsAwarded ?? 1)}`
                : 'MISSION COMPROMISED'}
            </div>
            <h3>{evaluation.summary}</h3>
            {evaluation.outcome === 'PASS' ? (
              <div className="eval-rank-banner">
                <span>Rank: <strong>{evaluation.commanderRank}</strong></span>
              </div>
            ) : null}
          </div>

          <div className="outpost-eval-criteria">
            {evaluation.criteria.map((c) => (
              <div key={c.id} className="eval-criterion-row">
                <span className={c.passed ? 'criterion-icon is-pass' : 'criterion-icon is-fail'}>
                  {c.passed ? '✓' : '✗'}
                </span>
                <div className="criterion-info">
                  <span className="criterion-label">{c.label}</span>
                  <span className="criterion-details">{c.details}</span>
                </div>
                <div className="criterion-values">
                  <span className="criterion-observed">{c.observedValue}</span>
                  <span className="criterion-threshold">req {c.thresholdValue}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="outpost-eval-debrief">
            <h4>NASA Flight Director Debrief:</h4>
            <ul>
              {evaluation.debriefNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
