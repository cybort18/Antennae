/**
 * Altitude-versus-simulated-time chart for the baseline and candidate runs.
 *
 * Implementation choice: a dependency-free SVG chart. No chart library is
 * installed in this project, and this milestone needs exactly two series, axis
 * labels, and honest handling of runs with different lengths, which a small SVG
 * component covers without adding a rendering dependency.
 *
 * Data contract: every point comes from a recorded sample of its own run
 * (`AltitudeSeries`). The polyline connects recorded samples in time order, so a
 * line segment between two samples is a visual connection of measured values,
 * not a computed intermediate state; nothing is resampled, extended, or padded.
 */

import { useMemo } from 'react';

import type { AltitudeSeries } from '../comparison/compareRuns';
import { formatNumber } from '../results/format';
import {
  altitudeDomain,
  chartLayout,
  createAltitudeScale,
  createLinearScale,
  formatTickValue,
  niceTicks,
  roundCoordinate,
  timeDomain,
} from './altitudeChartMath';

export type AltitudeChartProps = {
  /** One entry per run being compared; order defines draw order. */
  series: AltitudeSeries[];
  /** Reference body radius used to express altitude, km. */
  bodyRadiusKm: number;
};

export function AltitudeChart({ series, bodyRadiusKm }: AltitudeChartProps) {
  const layout = chartLayout();

  const { timeScale, altitudeScale, timeTicks, altitudeTicks } = useMemo(() => {
    const time = timeDomain(series);
    const altitude = altitudeDomain(series);

    return {
      timeScale: createLinearScale(time, { start: layout.plot.left, end: layout.plot.right }),
      altitudeScale: createAltitudeScale(altitude, layout),
      timeTicks: niceTicks(time, 6),
      altitudeTicks: niceTicks(altitude, 4),
    };
  }, [series, layout]);

  const drawn = useMemo(
    () =>
      series.map((one) => {
        const points = one.points
          .map(
            (point) =>
              `${roundCoordinate(timeScale.map(point.timeSeconds))},${roundCoordinate(
                altitudeScale.map(point.altitudeKm),
              )}`,
          )
          .join(' ');

        const last = one.points[one.points.length - 1];

        return {
          series: one,
          points,
          lastMarker: last
            ? {
                x: roundCoordinate(timeScale.map(last.timeSeconds)),
                y: roundCoordinate(altitudeScale.map(last.altitudeKm)),
              }
            : null,
        };
      }),
    [series, timeScale, altitudeScale],
  );

  const ariaLabel = useMemo(() => {
    const parts = series.map(
      (one) =>
        `${one.role}: ${one.points.length} recorded samples, last at t = ${formatNumber(
          one.lastRecordedTimeSeconds,
          1,
        )} s${one.endedEarly ? ' (run ended early)' : ''}`,
    );
    return `Altitude above mean Earth radius versus simulated time. ${parts.join('. ')}.`;
  }, [series]);

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={ariaLabel}
      data-testid="altitude-chart"
    >
      {/* Plot background, so the axes read as a frame rather than floating lines. */}
      <rect
        className="chart__plot"
        x={layout.plot.left}
        y={layout.plot.top}
        width={layout.plot.width}
        height={layout.plot.height}
      />

      {altitudeTicks.map((tick) => {
        const y = altitudeScale.map(tick);
        return (
          <g key={`altitude-${tick}`}>
            <line
              className="chart__grid"
              x1={layout.plot.left}
              x2={layout.plot.right}
              y1={y}
              y2={y}
            />
            <text className="chart__tick" x={layout.plot.left - 8} y={y + 4} textAnchor="end">
              {formatTickValue(tick)}
            </text>
          </g>
        );
      })}

      {timeTicks.map((tick) => {
        const x = timeScale.map(tick);
        return (
          <g key={`time-${tick}`}>
            <line
              className="chart__grid"
              x1={x}
              x2={x}
              y1={layout.plot.top}
              y2={layout.plot.bottom}
            />
            <text
              className="chart__tick"
              x={x}
              y={layout.plot.bottom + 16}
              textAnchor="middle"
            >
              {formatTickValue(tick)}
            </text>
          </g>
        );
      })}

      <text className="chart__axis-title" x={layout.plot.left} y={layout.margin.top - 4}>
        altitude above mean Earth radius ({formatNumber(bodyRadiusKm, 0)} km) — km
      </text>
      <text
        className="chart__axis-title"
        x={(layout.plot.left + layout.plot.right) / 2}
        y={layout.height - 6}
        textAnchor="middle"
      >
        simulated time (s) — recorded sample timestamps
      </text>

      {drawn.map(({ series: one, points, lastMarker }) => (
        <g key={one.role} className={`chart__series chart__series--${one.role}`}>
          <polyline
            className="chart__line"
            points={points}
            fill="none"
            data-testid={`series-${one.role}`}
            data-samples={one.points.length}
            data-last-time-seconds={roundCoordinate(one.lastRecordedTimeSeconds)}
            data-ended-early={one.endedEarly ? 'true' : 'false'}
          />
          {lastMarker ? (
            <circle
              className={
                one.endedEarly ? 'chart__end-marker chart__end-marker--stopped' : 'chart__end-marker'
              }
              cx={lastMarker.x}
              cy={lastMarker.y}
              r={3.5}
              data-testid={`series-${one.role}-last`}
              data-time-seconds={roundCoordinate(one.lastRecordedTimeSeconds)}
            />
          ) : null}
        </g>
      ))}
    </svg>
  );
}
