/**
 * Flight Director's Causal Diagnostics Card ("Why Did This Happen?").
 *
 * Provides clear, human-accessible, scientifically accurate cause-and-effect
 * explanations and tactical recommendations derived deterministically from simulation state.
 */

import { memo, useState } from 'react';
import type { OutpostDiagnostics } from '../../outpost/outpostDiagnostics';

export interface CausalDiagnosticsCardProps {
  diagnostics: OutpostDiagnostics;
}

export const CausalDiagnosticsCard = memo(function CausalDiagnosticsCard({
  diagnostics,
}: CausalDiagnosticsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusClass =
    diagnostics.overallStatus === 'critical'
      ? 'is-critical'
      : diagnostics.overallStatus === 'strained'
        ? 'is-strained'
        : 'is-nominal';

  const nonNominalItems = diagnostics.items.filter((i) => i.severity !== 'nominal');

  return (
    <div
      className={`causal-diag-card ${statusClass}`}
      role="region"
      aria-label="Flight Director Causal Diagnostics"
    >
      <div className="causal-diag-header">
        <div className="causal-diag-headline-row">
          <span className="causal-diag-badge">
            {diagnostics.overallStatus === 'critical'
              ? 'CRITICAL HAZARD'
              : diagnostics.overallStatus === 'strained'
                ? 'OPERATIONAL STRAIN'
                : 'SYSTEMS NOMINAL'}
          </span>
          <span className="causal-diag-headline">{diagnostics.headline}</span>
        </div>

        <button
          type="button"
          className="causal-diag-toggle-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▲ Hide Analysis' : 'Why is this happening?'}
        </button>
      </div>

      {isExpanded && (
        <div className="causal-diag-body">
          <div className="causal-diag-list">
            {(nonNominalItems.length > 0 ? nonNominalItems : diagnostics.items).map((item) => (
              <div key={item.id} className={`diag-item diag-item--${item.severity}`}>
                <div className="diag-item__top">
                  <span className="diag-item__subsystem">
                    {item.subsystem === 'eclss'
                      ? 'Life Support (ECLSS)'
                      : item.subsystem === 'radiation'
                        ? 'Radiation Protection'
                        : item.subsystem === 'food'
                          ? 'Hydroponics Food'
                          : 'Power Grid'}
                  </span>
                  <span className="diag-item__title">{item.title}</span>
                </div>

                <div className="diag-item__detail">
                  <div className="diag-detail-row">
                    <strong>Cause:</strong> <span>{item.cause}</span>
                  </div>
                  <div className="diag-detail-row">
                    <strong>Physical Impact:</strong> <span>{item.impact}</span>
                  </div>
                  <div className="diag-detail-row diag-detail-row--rec">
                    <strong>Flight Director Advice:</strong> <span>{item.recommendation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
