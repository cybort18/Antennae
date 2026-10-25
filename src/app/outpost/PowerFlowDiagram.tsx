/**
 * Interactive Power Grid & Energy Flow Visualizer.
 *
 * Provides an intuitive, visual representation of energy generation (Nuclear + Solar),
 * distribution to the 4 critical life-support subsystems, and dynamic battery charging/discharging.
 *
 * Pure React + CSS animations: zero heavy visualization libraries, 100% accessible.
 */

import { memo } from 'react';
import type {
  DailyEnvironment,
  OutpostDailySample,
  OutpostScenario,
  SubsystemAllocation,
} from '../../outpost/types';
import { calculateSolarOutputKw } from '../../outpost/outpostSimulation';

export interface PowerFlowDiagramProps {
  scenario: OutpostScenario;
  environment: DailyEnvironment;
  sample: OutpostDailySample;
  allocation: SubsystemAllocation;
}

export const PowerFlowDiagram = memo(function PowerFlowDiagram({
  scenario,
  environment,
  sample,
  allocation,
}: PowerFlowDiagramProps) {
  const nuclearKw = scenario.baseNuclearKw;
  const solarKw = calculateSolarOutputKw(
    scenario.solarArrayNominalKw,
    environment.dustOpacityTau,
    environment.solarInsolationFraction ?? 1.0,
  );
  const totalGenKw = nuclearKw + solarKw;

  const totalDemandKw =
    allocation.lifeSupportKw +
    allocation.radiationShieldKw +
    allocation.foodProductionKw +
    allocation.auxiliaryKw;

  const netPowerKw = totalGenKw - totalDemandKw;
  const isSurplus = netPowerKw >= 0;
  const isBatteryEmpty = sample.batteryStorageKwh <= 0.1;
  const isBrownout = !isSurplus && isBatteryEmpty;

  return (
    <div className="power-flow-container" role="region" aria-label="Dynamic Power Grid Flow Diagram">
      <div className="power-flow-header">
        <h4 className="power-flow-title">Interactive Power Grid &amp; Energy Flow</h4>
        <span
          className={`power-flow-status-badge ${
            isBrownout ? 'is-danger' : isSurplus ? 'is-surplus' : 'is-deficit'
          }`}
        >
          {isBrownout
            ? 'BROWNOUT: DEFICIT POWERING'
            : isSurplus
              ? `CHARGING (+${netPowerKw.toFixed(1)} kW)`
              : `DRAINING BATTERY (${netPowerKw.toFixed(1)} kW)`}
        </span>
      </div>

      <div className="sr-only" aria-live="polite">
        {`Total generation is ${totalGenKw.toFixed(1)} kilowatts. Total demand is ${totalDemandKw.toFixed(1)} kilowatts. ${
          isSurplus
            ? `Surplus power of ${netPowerKw.toFixed(1)} kilowatts is charging the battery.`
            : `Deficit of ${Math.abs(netPowerKw).toFixed(1)} kilowatts is discharging from battery storage.`
        }`}
      </div>

      <div className="power-flow-grid">
        {/* Left Column: Power Sources */}
        <div className="flow-col flow-col--sources">
          <div className="flow-col-label">GENERATION SOURCES</div>

          {/* Nuclear Generator Box */}
          <div className="flow-card flow-card--nuclear">
            <span className="flow-card__tag">NUC</span>
            <div className="flow-card__info">
              <span className="flow-card__name">Kilopower Nuclear</span>
              <span className="flow-card__type">Continuous Baseloader</span>
            </div>
            <div className="flow-card__val">+{nuclearKw.toFixed(1)} kW</div>
          </div>

          {/* Solar Array Box */}
          <div className="flow-card flow-card--solar">
            <span className="flow-card__tag">PV</span>
            <div className="flow-card__info">
              <span className="flow-card__name">Photovoltaic Array</span>
              <span className="flow-card__type">
                {scenario.setting === 'mars'
                  ? `τ = ${environment.dustOpacityTau.toFixed(2)} opacity`
                  : environment.solarInsolationFraction === 0
                    ? '0% Crater Shadow'
                    : 'Sunlit polar ridge'}
              </span>
            </div>
            <div className="flow-card__val">+{solarKw.toFixed(1)} kW</div>
          </div>

          <div className="flow-sum-row">
            <span>Total Generation:</span>
            <strong>{totalGenKw.toFixed(1)} kW</strong>
          </div>
        </div>

        {/* Center Column: Central Grid Bus & Battery Node */}
        <div className="flow-col flow-col--bus">
          <div className="flow-col-label">POWER BUS &amp; STORAGE</div>

          <div className={`flow-bus-node ${isSurplus ? 'is-surplus' : 'is-deficit'}`}>
            <span className="flow-bus-label">CENTRAL DISTRIBUTION BUS</span>
            <div className="flow-bus-balance">
              <span className="bus-gen">{totalGenKw.toFixed(1)} kW in</span>
              <span className="bus-arrow">➔</span>
              <span className="bus-dem">{totalDemandKw.toFixed(1)} kW out</span>
            </div>
          </div>

          {/* Battery Storage Box */}
          <div className={`flow-card flow-card--battery ${isBatteryEmpty ? 'is-empty' : ''}`}>
            <div className="flow-card__header">
              <span className="flow-card__tag">BAT</span>
              <span className="flow-card__name">Main Battery Bank</span>
              <span className="flow-card__val">{sample.batteryPercent.toFixed(0)}%</span>
            </div>
            <div className="flow-battery-bar">
              <div
                className="flow-battery-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, sample.batteryPercent))}%`,
                  backgroundColor:
                    sample.batteryPercent > 40
                      ? '#00f0ff'
                      : sample.batteryPercent > 15
                        ? '#ffcc00'
                        : '#ff3366',
                }}
              />
            </div>
            <div className="flow-battery-stats">
              <span>{sample.batteryStorageKwh.toFixed(0)} / {scenario.batteryCapacityKwh} kWh</span>
              <span className={isSurplus ? 'text-emerald' : 'text-amber'}>
                {isSurplus
                  ? `+${netPowerKw.toFixed(1)} kW Net Flow`
                  : `${netPowerKw.toFixed(1)} kW Drain`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 4 Subsystem Consumers */}
        <div className="flow-col flow-col--loads">
          <div className="flow-col-label">SUBSYSTEM CONSUMERS</div>

          {/* ECLSS */}
          <div className="flow-card flow-card--load">
            <span className="flow-card__tag">ECLSS</span>
            <div className="flow-card__info">
              <span className="flow-card__name">Life Support</span>
              <span className="flow-card__status">Req ≥16.0 kW</span>
            </div>
            <div className={`flow-card__val ${allocation.lifeSupportKw < 16 ? 'text-amber' : ''}`}>
              {allocation.lifeSupportKw.toFixed(1)} kW
            </div>
          </div>

          {/* Radiation Shield */}
          <div className="flow-card flow-card--load">
            <span className="flow-card__tag">RAD</span>
            <div className="flow-card__info">
              <span className="flow-card__name">Active Rad Shield</span>
              <span className="flow-card__status">
                {environment.solarParticleEventActive ? 'SPE ACTIVE (Req 12 kW)' : 'Cosmic background'}
              </span>
            </div>
            <div className="flow-card__val">{allocation.radiationShieldKw.toFixed(1)} kW</div>
          </div>

          {/* Greenhouse */}
          <div className="flow-card flow-card--load">
            <span className="flow-card__tag">BIO</span>
            <div className="flow-card__info">
              <span className="flow-card__name">Hydroponics Food</span>
              <span className="flow-card__status">Opt 14 kW · Min 4 kW</span>
            </div>
            <div className="flow-card__val">{allocation.foodProductionKw.toFixed(1)} kW</div>
          </div>

          {/* Avionics */}
          <div className="flow-card flow-card--load">
            <span className="flow-card__tag">AUX</span>
            <div className="flow-card__info">
              <span className="flow-card__name">Aux Avionics &amp; Comms</span>
              <span className="flow-card__status">Telemetry &amp; Sensors</span>
            </div>
            <div className="flow-card__val">{allocation.auxiliaryKw.toFixed(1)} kW</div>
          </div>

          <div className="flow-sum-row">
            <span>Total Demand:</span>
            <strong>{totalDemandKw.toFixed(1)} kW</strong>
          </div>
        </div>
      </div>
    </div>
  );
});
