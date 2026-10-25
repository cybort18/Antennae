/**
 * 14-Sol Multi-Metric Resource History SVG Chart.
 *
 * Visualizes the temporal evolution of Battery %, Cabin O₂, Radiation Dose,
 * and Crop Biomass across all elapsed Sols.
 *
 * Pure SVG, zero external chart dependencies, deterministic and lightweight.
 */

import { memo, useMemo, useState } from 'react';
import type { OutpostDailySample, OutpostScenario } from '../../outpost/types';
import {
  buildSvgPoints,
  createOutpostChartLayout,
  projectPercentY,
  projectRadiationY,
  projectSolX,
} from './outpostChartMath';

export interface OutpostHistoryChartProps {
  samples: OutpostDailySample[];
  scenario: OutpostScenario;
  currentSol: number;
}

export const OutpostHistoryChart = memo(function OutpostHistoryChart({
  samples,
  scenario,
  currentSol,
}: OutpostHistoryChartProps) {
  const [hoveredSol, setHoveredSol] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState({
    battery: true,
    crops: true,
    radiation: true,
    oxygen: true,
  });

  const layout = useMemo(() => createOutpostChartLayout(760, 220), []);
  const totalSols = scenario.durationSols;

  // Polyline point calculations
  const batteryPoints = useMemo(
    () => buildSvgPoints(samples, totalSols, layout, (s, l) => projectPercentY(s.batteryPercent, l)),
    [samples, totalSols, layout],
  );

  const cropPoints = useMemo(
    () => buildSvgPoints(samples, totalSols, layout, (s, l) => projectPercentY(s.cropHealthPercent, l)),
    [samples, totalSols, layout],
  );

  // Oxygen scaled: maps 17.5% - 21.0% onto 0% - 100% vertical scale
  const oxygenPoints = useMemo(
    () =>
      buildSvgPoints(samples, totalSols, layout, (s, l) => {
        const scaledPercent = Math.max(0, Math.min(100, ((s.oxygenLevelPercent - 17.5) / (21.0 - 17.5)) * 100));
        return projectPercentY(scaledPercent, l);
      }),
    [samples, totalSols, layout],
  );

  // Radiation points (0 to 60 mSv scale)
  const radiationPoints = useMemo(
    () =>
      buildSvgPoints(samples, totalSols, layout, (s, l) =>
        projectRadiationY(s.cumulativeRadiationDoseMsv, 60, l),
      ),
    [samples, totalSols, layout],
  );

  // Active inspected sample
  const inspectedSol = hoveredSol ?? currentSol;
  const inspectedSample = samples.find((s) => s.sol === inspectedSol) ?? samples[samples.length - 1];

  const solTicks = [0, 2, 4, 6, 8, 10, 12, 14];
  const percentTicks = [0, 25, 50, 75, 100];

  const cadetLimitY = projectRadiationY(40, 60, layout);
  const o2SafeMinY = projectPercentY(((19.5 - 17.5) / (21.0 - 17.5)) * 100, layout);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (samples.length <= 1) return;
    const maxSol = samples[samples.length - 1].sol;
    const current = hoveredSol ?? currentSol;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredSol(Math.min(maxSol, current + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoveredSol(Math.max(0, current - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHoveredSol(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHoveredSol(maxSol);
    }
  };

  return (
    <div
      className="outpost-history-chart"
      role="region"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="14-Sol Multi-Metric Timeline Chart. Use left and right arrow keys to inspect Sols."
    >
      {/* Chart Controls & Series Legend */}
      <div className="chart-legend-bar">
        <span className="chart-legend-title">Timeline History:</span>
        <div className="chart-legend-items">
          <button
            type="button"
            className={`legend-btn legend-btn--battery ${visibleSeries.battery ? 'is-active' : ''}`}
            onClick={() => setVisibleSeries((p) => ({ ...p, battery: !p.battery }))}
            aria-pressed={visibleSeries.battery}
            title="Toggle Battery Storage Curve (Solid line)"
          >
            <span className="legend-dot" style={{ backgroundColor: '#00f0ff' }} />
            Battery (%)
          </button>
          <button
            type="button"
            className={`legend-btn legend-btn--crops ${visibleSeries.crops ? 'is-active' : ''}`}
            onClick={() => setVisibleSeries((p) => ({ ...p, crops: !p.crops }))}
            aria-pressed={visibleSeries.crops}
            title="Toggle Hydroponic Crops Curve (Dashed line)"
          >
            <span className="legend-dot" style={{ backgroundColor: '#70e000', borderStyle: 'dashed' }} />
            Crops (%)
          </button>
          <button
            type="button"
            className={`legend-btn legend-btn--radiation ${visibleSeries.radiation ? 'is-active' : ''}`}
            onClick={() => setVisibleSeries((p) => ({ ...p, radiation: !p.radiation }))}
            aria-pressed={visibleSeries.radiation}
            title="Toggle Cumulative Radiation Curve (Dotted line)"
          >
            <span className="legend-dot" style={{ backgroundColor: '#ff3366', borderStyle: 'dotted' }} />
            Radiation (mSv)
          </button>
          <button
            type="button"
            className={`legend-btn legend-btn--oxygen ${visibleSeries.oxygen ? 'is-active' : ''}`}
            onClick={() => setVisibleSeries((p) => ({ ...p, oxygen: !p.oxygen }))}
            aria-pressed={visibleSeries.oxygen}
            title="Toggle Cabin O₂ Curve (Dash-dot line)"
          >
            <span className="legend-dot" style={{ backgroundColor: '#00e5a3' }} />
            Cabin O₂ (Scaled)
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="chart-svg-wrap">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="chart-svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Plot Area */}
          <rect
            x={layout.plot.left}
            y={layout.plot.top}
            width={layout.plot.width}
            height={layout.plot.height}
            fill="#050a12"
            stroke="#1a2638"
            strokeWidth="1"
          />

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {percentTicks.map((p) => {
            const y = projectPercentY(p, layout);
            return (
              <g key={`y-${p}`}>
                <line
                  x1={layout.plot.left}
                  y1={y}
                  x2={layout.plot.right}
                  y2={y}
                  stroke="#162032"
                  strokeDasharray={p === 0 || p === 100 ? undefined : '3,3'}
                />
                <text
                  x={layout.plot.left - 8}
                  y={y + 4}
                  fill="#6b7c96"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {p}%
                </text>
              </g>
            );
          })}

          {/* Right Y-Axis Labels for Radiation (0 to 60 mSv) */}
          {[0, 20, 40, 60].map((dose) => {
            const y = projectRadiationY(dose, 60, layout);
            return (
              <text
                key={`rad-${dose}`}
                x={layout.plot.right + 6}
                y={y + 3}
                fill="#ff4d6d"
                fontSize="9"
                textAnchor="start"
                fontFamily="monospace"
              >
                {dose}mSv
              </text>
            );
          })}

          {/* Threshold Lines */}
          {/* Cadet Max Radiation Limit (40 mSv) */}
          <line
            x1={layout.plot.left}
            y1={cadetLimitY}
            x2={layout.plot.right}
            y2={cadetLimitY}
            stroke="#ff3366"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            opacity="0.8"
          />
          <text
            x={layout.plot.left + 8}
            y={cadetLimitY - 4}
            fill="#ff3366"
            fontSize="9"
            fontWeight="bold"
          >
            Cadet Safety Limit (40 mSv)
          </text>

          {/* Safe Minimum O2 Threshold */}
          <line
            x1={layout.plot.left}
            y1={o2SafeMinY}
            x2={layout.plot.right}
            y2={o2SafeMinY}
            stroke="#ffcc00"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.7"
          />
          <text
            x={layout.plot.right - 100}
            y={o2SafeMinY - 4}
            fill="#ffcc00"
            fontSize="9"
          >
            Min Safe O₂ (19.5%)
          </text>

          {/* Vertical Gridlines & X-Axis Labels (Sols) */}
          {solTicks.map((sol) => {
            const x = projectSolX(sol, totalSols, layout);
            return (
              <g key={`x-${sol}`}>
                <line
                  x1={x}
                  y1={layout.plot.top}
                  x2={x}
                  y2={layout.plot.bottom}
                  stroke="#162032"
                  strokeDasharray="2,2"
                />
                <text
                  x={x}
                  y={layout.plot.bottom + 16}
                  fill="#788ba6"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {scenario.setting === 'mars' ? `Sol ${sol}` : `D${sol}`}
                </text>
              </g>
            );
          })}

          {/* Polylines */}
          {visibleSeries.battery && (
            <polyline
              points={batteryPoints}
              fill="none"
              stroke="#00f0ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {visibleSeries.crops && (
            <polyline
              points={cropPoints}
              fill="none"
              stroke="#70e000"
              strokeWidth="2"
              strokeDasharray="6,4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {visibleSeries.oxygen && (
            <polyline
              points={oxygenPoints}
              fill="none"
              stroke="#00e5a3"
              strokeWidth="2"
              strokeDasharray="8,3,2,3"
              strokeLinecap="round"
            />
          )}

          {visibleSeries.radiation && (
            <polyline
              points={radiationPoints}
              fill="none"
              stroke="#ff3366"
              strokeWidth="2"
              strokeDasharray="2,3"
              strokeLinecap="round"
            />
          )}

          {/* Interactive Sol Data Points */}
          {samples.map((s) => {
            const x = projectSolX(s.sol, totalSols, layout);
            const isCurrent = s.sol === currentSol;
            const isHovered = s.sol === hoveredSol;

            return (
              <g
                key={`dot-${s.sol}`}
                className="chart-dot-group"
                onMouseEnter={() => setHoveredSol(s.sol)}
                onMouseLeave={() => setHoveredSol(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Vertical hover indicator */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={layout.plot.top}
                    x2={x}
                    y2={layout.plot.bottom}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                    opacity="0.8"
                  />
                )}

                {/* Primary Anchor Dot */}
                <circle
                  cx={x}
                  cy={projectPercentY(s.batteryPercent, layout)}
                  r={isCurrent || isHovered ? 5 : 3.5}
                  fill={isCurrent ? '#ffffff' : '#00f0ff'}
                  stroke="#050a12"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Sol Telemetry Inspector Card */}
      {inspectedSample && (
        <div className="chart-telemetry-summary">
          <div className="summary-sol-badge">
            {scenario.setting === 'mars' ? `SOL ${inspectedSample.sol}` : `DAY ${inspectedSample.sol}`}
            {inspectedSample.sol === currentSol ? ' (CURRENT)' : ''}
          </div>
          <div className="summary-metrics">
            <span className="summary-metric">
              🔋 Battery: <strong>{inspectedSample.batteryPercent.toFixed(0)}%</strong> ({inspectedSample.batteryStorageKwh.toFixed(0)} kWh)
            </span>
            <span className="summary-metric">
              💨 Cabin O₂: <strong>{inspectedSample.oxygenLevelPercent.toFixed(1)}%</strong>
            </span>
            <span className="summary-metric">
              ☢️ Radiation: <strong>{inspectedSample.cumulativeRadiationDoseMsv.toFixed(1)} mSv</strong>
            </span>
            <span className="summary-metric">
              🌿 Crops: <strong>{inspectedSample.cropHealthPercent.toFixed(0)}%</strong>
            </span>
          </div>
          {inspectedSample.events.length > 0 && (
            <div className="summary-events">
              {inspectedSample.events.map((e, idx) => (
                <span key={idx} className="summary-event-tag">
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
