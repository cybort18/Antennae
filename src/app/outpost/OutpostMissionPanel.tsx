/**
 * Interactive Outpost Mission Trainer UI component.
 *
 * Provides the decision console for the cadet:
 * - Subsystem power allocation sliders (ECLSS, Radiation Shield, Food, Aux)
 * - Step-by-step and full-mission Sol progression
 * - Real-time telemetry: power grid balance, O2, cabin temp, radiation, crops
 * - Deterministic mission evaluation with NASA educational debrief notes
 */

import { useCallback, useEffect, useState } from 'react';

import {
  CANONICAL_OUTPOST_SCENARIO,
  createInitialSample,
  evaluateOutpostMission,
  simulateOutpostDay,
  type OutpostDailySample,
  type OutpostEvaluation,
  type SubsystemAllocation,
} from '../../outpost';

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
  onSolChange?: (sol: number, dustTau: number) => void;
}

export function OutpostMissionPanel({ onSolChange }: OutpostMissionPanelProps) {
  const scenario = CANONICAL_OUTPOST_SCENARIO;
  const [allocation, setAllocation] = useState<SubsystemAllocation>(DEFAULT_ALLOCATION);
  const [samples, setSamples] = useState<OutpostDailySample[]>(() => [createInitialSample(scenario)]);
  const [currentSol, setCurrentSol] = useState(0);
  const [evaluation, setEvaluation] = useState<OutpostEvaluation | null>(null);

  const latestSample = samples[samples.length - 1];
  const isMissionFinished = currentSol >= scenario.durationSols || latestSample.crewStatus === 'incapacitated';

  // Notify parent viewport when sol changes so 3D scene can update dust opacity
  useEffect(() => {
    const env = scenario.environmentalSchedule[Math.min(Math.max(currentSol - 1, 0), scenario.durationSols - 1)];
    onSolChange?.(currentSol, env ? env.dustOpacityTau : 0.2);
  }, [currentSol, onSolChange, scenario]);

  const handleStepSol = useCallback(() => {
    if (isMissionFinished) return;

    const nextSolIndex = currentSol + 1;
    const environment = scenario.environmentalSchedule[nextSolIndex - 1];
    if (!environment) return;

    setSamples((prev) => {
      const prevSample = prev[prev.length - 1];
      const nextSample = simulateOutpostDay(prevSample, allocation, environment, scenario);
      const newSamples = [...prev, nextSample];

      if (nextSolIndex >= scenario.durationSols || nextSample.crewStatus === 'incapacitated') {
        const evalResult = evaluateOutpostMission({
          scenario,
          allocations: [allocation],
          samples: newSamples,
          completed: nextSample.crewStatus !== 'incapacitated',
        });
        setEvaluation(evalResult);
      }

      return newSamples;
    });

    setCurrentSol(nextSolIndex);
  }, [allocation, currentSol, isMissionFinished, scenario]);

  const handleRunAll = useCallback(() => {
    if (isMissionFinished) return;

    let localSamples = [...samples];
    let sol = currentSol;

    while (sol < scenario.durationSols) {
      sol += 1;
      const environment = scenario.environmentalSchedule[sol - 1];
      const prevSample = localSamples[localSamples.length - 1];
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
  }, [allocation, currentSol, isMissionFinished, samples, scenario]);

  const handleReset = useCallback(() => {
    const initial = createInitialSample(scenario);
    setSamples([initial]);
    setCurrentSol(0);
    setEvaluation(null);
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
      {/* Header & Scenario Briefing */}
      <div className="outpost-header">
        <div className="outpost-header__badge">NASA JUNIOR ASTRONAUT ACADEMY</div>
        <h2 className="outpost-header__title">{scenario.title}</h2>
        <p className="outpost-header__desc">{scenario.description}</p>
      </div>

      {/* Environmental Alert Banner */}
      <div className="outpost-env-banner">
        <div className="outpost-env-banner__col">
          <span className="outpost-env-label">MISSION TIMELINE</span>
          <span className="outpost-env-value">
            {currentSol === 0 ? 'PRE-FLIGHT (SOL 0)' : `SOL ${currentSol} / ${scenario.durationSols}`}
          </span>
        </div>
        <div className="outpost-env-banner__col">
          <span className="outpost-env-label">DUST OPACITY (τ)</span>
          <span className="outpost-env-value">
            {currentEnv.dustOpacityTau.toFixed(2)}{' '}
            {currentEnv.dustOpacityTau >= 0.7 ? '· DUST STORM' : '· CLEAR'}
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

      {/* Simulation Execution Controls */}
      <div className="outpost-controls-bar">
        <button
          type="button"
          className="outpost-btn outpost-btn--primary"
          onClick={handleStepSol}
          disabled={isMissionFinished}
        >
          ▶ Advance 1 Sol
        </button>
        <button
          type="button"
          className="outpost-btn outpost-btn--secondary"
          onClick={handleRunAll}
          disabled={isMissionFinished}
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
            {latestSample.oxygenLevelPercent.toFixed(1)}
            <span className="outpost-tile__unit">%</span>
          </div>
          <div className="outpost-tile__meta">Safe min: 19.5% · Baseline: 20.9%</div>
        </div>

        {/* Cabin Temp Tile */}
        <div className="outpost-tile">
          <div className="outpost-tile__header">
            <span className="outpost-tile__label">CABIN TEMP</span>
            <span
              className={
                latestSample.cabinTemperatureC < 16.0
                  ? 'outpost-tile__status is-danger'
                  : 'outpost-tile__status is-ok'
              }
            >
              {latestSample.cabinTemperatureC < 16.0 ? 'COLD' : 'WARM'}
            </span>
          </div>
          <div className="outpost-tile__value">
            {latestSample.cabinTemperatureC.toFixed(1)}
            <span className="outpost-tile__unit">°C</span>
          </div>
          <div className="outpost-tile__meta">Safe min: 16.0°C · Ambient: {currentEnv.ambientTemperatureC}°C</div>
        </div>

        {/* Radiation Tile */}
        <div className="outpost-tile">
          <div className="outpost-tile__header">
            <span className="outpost-tile__label">CUMULATIVE DOSE</span>
            <span
              className={
                latestSample.cumulativeRadiationDoseMsv > 40.0
                  ? 'outpost-tile__status is-danger'
                  : 'outpost-tile__status is-ok'
              }
            >
              {latestSample.cumulativeRadiationDoseMsv > 40.0 ? 'LIMIT BREACHED' : 'PASS MARGIN'}
            </span>
          </div>
          <div className="outpost-tile__value">
            {latestSample.cumulativeRadiationDoseMsv.toFixed(1)}
            <span className="outpost-tile__unit">mSv</span>
          </div>
          <div className="outpost-tile__meta">Max safe limit: 40.0 mSv</div>
        </div>

        {/* Crops Tile */}
        <div className="outpost-tile">
          <div className="outpost-tile__header">
            <span className="outpost-tile__label">CROP BIOMASS</span>
            <span
              className={
                latestSample.cropHealthPercent < 40.0
                  ? 'outpost-tile__status is-danger'
                  : 'outpost-tile__status is-ok'
              }
            >
              {latestSample.cropHealthPercent === 0 ? 'BLIGHTED' : latestSample.cropHealthPercent < 40 ? 'LOW' : 'VIABLE'}
            </span>
          </div>
          <div className="outpost-tile__value">
            {latestSample.cropHealthPercent.toFixed(0)}
            <span className="outpost-tile__unit">%</span>
          </div>
          <div className="outpost-tile__meta">Safe reserve: ≥ 40%</div>
        </div>
      </div>

      {/* Power Grid & Battery Monitor */}
      <div className="outpost-power-monitor">
        <div className="outpost-power-monitor__header">
          <span className="outpost-section-title">ELECTRICAL GRID & BATTERY STORAGE</span>
          <span className="outpost-power-balance">
            Generation: {latestSample.powerGeneratedKw.toFixed(1)} kW | Demand: {totalDemandKw.toFixed(1)} kW
          </span>
        </div>

        <div className="outpost-battery-bar">
          <div
            className={
              latestSample.batteryPercent < 15
                ? 'outpost-battery-fill is-danger'
                : latestSample.batteryPercent < 35
                ? 'outpost-battery-fill is-warning'
                : 'outpost-battery-fill'
            }
            style={{ width: `${Math.max(0, Math.min(100, latestSample.batteryPercent))}%` }}
          />
        </div>
        <div className="outpost-battery-labels">
          <span>Battery Storage: {latestSample.batteryStorageKwh.toFixed(1)} / {scenario.batteryCapacityKwh} kWh ({latestSample.batteryPercent.toFixed(1)}%)</span>
          <span className={latestSample.netPowerKw >= 0 ? 'text-ok' : 'text-danger'}>
            {latestSample.netPowerKw >= 0 ? `+${latestSample.netPowerKw.toFixed(1)} kW Net Charging` : `${latestSample.netPowerKw.toFixed(1)} kW Net Draining`}
          </span>
        </div>
      </div>

      {/* Subsystem Allocation Console (Cadet Controls) */}
      <div className="outpost-allocations">
        <div className="outpost-allocations__top">
          <span className="outpost-section-title">SUBSYSTEM POWER ALLOCATION (kW)</span>
          <div className="outpost-presets">
            <button
              type="button"
              className="outpost-preset-btn"
              onClick={() => setAllocation(DEFAULT_ALLOCATION)}
              title="Balanced full operation (46 kW total)"
            >
              Nominal (46 kW)
            </button>
            <button
              type="button"
              className="outpost-preset-btn"
              onClick={() => setAllocation(CONSERVATION_PRESET)}
              title="Dust storm conservation (34 kW total)"
            >
              Conservation (34 kW)
            </button>
            <button
              type="button"
              className="outpost-preset-btn"
              onClick={() => setAllocation(EMERGENCY_PRESET)}
              title="Emergency life-support priority (30 kW total)"
            >
              Life Support First (30 kW)
            </button>
          </div>
        </div>

        {/* Life Support Slider */}
        <div className="outpost-slider-row">
          <div className="outpost-slider-header">
            <label htmlFor="alloc-eclss" className="outpost-slider-label">Life Support (ECLSS)</label>
            <span className="outpost-slider-value">{allocation.lifeSupportKw.toFixed(1)} kW (Nominal 16 kW)</span>
          </div>
          <input
            id="alloc-eclss"
            type="range"
            min={0}
            max={24}
            step={1}
            value={allocation.lifeSupportKw}
            onChange={(e) => setAllocation((prev) => ({ ...prev, lifeSupportKw: Number(e.target.value) }))}
            className="outpost-range"
          />
        </div>

        {/* Radiation Shield Slider */}
        <div className="outpost-slider-row">
          <div className="outpost-slider-header">
            <label htmlFor="alloc-shield" className="outpost-slider-label">Radiation Shielding & Deflector</label>
            <span className="outpost-slider-value">{allocation.radiationShieldKw.toFixed(1)} kW (Nominal 12 kW)</span>
          </div>
          <input
            id="alloc-shield"
            type="range"
            min={0}
            max={20}
            step={1}
            value={allocation.radiationShieldKw}
            onChange={(e) => setAllocation((prev) => ({ ...prev, radiationShieldKw: Number(e.target.value) }))}
            className="outpost-range"
          />
        </div>

        {/* Food Production Slider */}
        <div className="outpost-slider-row">
          <div className="outpost-slider-header">
            <label htmlFor="alloc-food" className="outpost-slider-label">Hydroponic Food Production</label>
            <span className="outpost-slider-value">{allocation.foodProductionKw.toFixed(1)} kW (Nominal 14 kW)</span>
          </div>
          <input
            id="alloc-food"
            type="range"
            min={0}
            max={20}
            step={1}
            value={allocation.foodProductionKw}
            onChange={(e) => setAllocation((prev) => ({ ...prev, foodProductionKw: Number(e.target.value) }))}
            className="outpost-range"
          />
        </div>

        {/* Auxiliary Systems Slider */}
        <div className="outpost-slider-row">
          <div className="outpost-slider-header">
            <label htmlFor="alloc-aux" className="outpost-slider-label">Auxiliary Avionics & Comms</label>
            <span className="outpost-slider-value">{allocation.auxiliaryKw.toFixed(1)} kW (Nominal 4 kW)</span>
          </div>
          <input
            id="alloc-aux"
            type="range"
            min={1}
            max={8}
            step={1}
            value={allocation.auxiliaryKw}
            onChange={(e) => setAllocation((prev) => ({ ...prev, auxiliaryKw: Number(e.target.value) }))}
            className="outpost-range"
          />
        </div>
      </div>

      {/* Mission Evaluation & Debrief Section */}
      {evaluation && (
        <div
          className={
            evaluation.outcome === 'PASS'
              ? 'outpost-debrief is-pass'
              : 'outpost-debrief is-fail'
          }
          role="status"
          aria-label="Mission Evaluation Outcome"
        >
          <div className="outpost-debrief__badge">
            {evaluation.outcome === 'PASS' ? '✓ MISSION CERTIFIED — PASS' : '✕ MISSION FAILED'}
          </div>
          <p className="outpost-debrief__summary">{evaluation.summary}</p>

          <div className="outpost-criteria-list">
            {evaluation.criteria.map((c) => (
              <div key={c.id} className="outpost-criterion">
                <span className={c.passed ? 'outpost-criterion__icon is-pass' : 'outpost-criterion__icon is-fail'}>
                  {c.passed ? '✓' : '✕'}
                </span>
                <div className="outpost-criterion__body">
                  <div className="outpost-criterion__title">
                    {c.label}: <span className="mono">{c.observedValue}</span> (Req: {c.thresholdValue})
                  </div>
                  <div className="outpost-criterion__desc">{c.details}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="outpost-debrief-notes">
            <div className="outpost-debrief-notes__title">NASA Flight Director Debrief:</div>
            <ul>
              {evaluation.debriefNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
