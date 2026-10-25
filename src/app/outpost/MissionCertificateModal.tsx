import { useCallback, useEffect, useRef } from 'react';
import type { OutpostEvaluation, OutpostScenario } from '../../outpost/types';
import { playClickSound } from '../../audio/outpostAudio';

export interface MissionCertificateModalProps {
  isOpen: boolean;
  evaluation: OutpostEvaluation | null;
  scenario: OutpostScenario;
  onClose: () => void;
}

export function MissionCertificateModal({
  isOpen,
  evaluation,
  scenario,
  onClose,
}: MissionCertificateModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playClickSound();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDownloadCertificate = useCallback(() => {
    playClickSound();
    const canvas = canvasRef.current;
    if (!canvas || !evaluation) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 760;

    // Background Gradient (Deep Space Navy to Obsidian)
    const bg = ctx.createLinearGradient(0, 0, 1200, 760);
    bg.addColorStop(0, '#040b16');
    bg.addColorStop(0.5, '#07162c');
    bg.addColorStop(1, '#02050b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 760);

    // Decorative Golden Border
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, 1144, 704);
    ctx.strokeStyle = '#4da6ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 36, 1128, 688);

    // Header Text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6bb3ff';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('★ NASA JUNIOR ASTRONAUT ACADEMY ★', 600, 95);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('CERTIFICATE OF COMMENDATION', 600, 150);

    ctx.fillStyle = '#9cb4d4';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('For exceptional operational command during planetary outpost environmental crisis', 600, 185);

    // Divider Line
    ctx.strokeStyle = '#274b78';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(250, 215);
    ctx.lineTo(950, 215);
    ctx.stroke();

    // Commander Rank & Title
    const rank = evaluation.commanderRank ?? 'Junior Outpost Commander';
    ctx.fillStyle = '#ffd15c';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(rank.toUpperCase(), 600, 275);

    // Star Rating
    const stars = '★'.repeat(evaluation.starsAwarded ?? 1);
    ctx.fillStyle = '#ffd15c';
    ctx.font = '38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(stars, 600, 325);

    // Scenario Citation
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Mission: ${scenario.title}`, 600, 385);

    ctx.fillStyle = '#78a6db';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Location: ${scenario.locationName} · Duration: ${scenario.durationSols} Sols Completed`, 600, 415);

    // Metric Summary Cards
    const cards = [
      { label: 'CREW SURVIVAL', value: '4/4 ASTRONAUTS', sub: 'Nominal Health' },
      { label: 'RADIATION SHIELD', value: `${evaluation.maxRadiationDoseMsv.toFixed(1)} mSv`, sub: 'NASA Safe Threshold' },
      { label: 'FOOD SECURITY', value: `${evaluation.finalCropHealthPercent.toFixed(1)}%`, sub: 'Biomass Sustained' },
      { label: 'POWER GRID', value: `${evaluation.finalBatteryPercent.toFixed(1)}%`, sub: 'Storage Reserve' },
    ];

    cards.forEach((c, idx) => {
      const x = 140 + idx * 240;
      const y = 460;
      ctx.fillStyle = 'rgba(12, 28, 54, 0.75)';
      ctx.strokeStyle = '#274b78';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, 205, 120, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#78a6db';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(c.label, x + 102, y + 32);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(c.value, x + 102, y + 68);

      ctx.fillStyle = '#4ade80';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(c.sub, x + 102, y + 96);
    });

    // Verification Seal Text
    ctx.fillStyle = '#6e8baa';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('VERIFIED DETERMINISTIC PHYSICS SIMULATION · ANTENNAE SPACE SANDBOX · NASA SPACE APPS 2026', 600, 645);

    // Export to Image download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Junior_Astronaut_Certificate_${scenario.id}.png`;
    link.href = dataUrl;
    link.click();
  }, [evaluation, scenario]);

  if (!isOpen || !evaluation) return null;

  const stars = evaluation.starsAwarded ?? 1;

  return (
    <div
      className="outpost-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="certificate-title"
    >
      <div className="outpost-modal outpost-modal--certificate">
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="certificate-card">
          <div className="certificate-card__badge">★ NASA JUNIOR ASTRONAUT ACADEMY ★</div>
          <h2 id="certificate-title" className="certificate-card__title">
            Certificate of Commendation
          </h2>
          <div className="certificate-card__stars">
            {'★'.repeat(stars)}
          </div>
          <div className="certificate-card__rank">
            {evaluation.commanderRank ?? 'Junior Outpost Commander'}
          </div>

          <p className="certificate-card__citation">
            Awarded for demonstrating superior resource management, balancing life support,
            radiation deflection, power generation, and agricultural continuity during:
          </p>

          <div className="certificate-card__scenario-box">
            <span className="certificate-card__scenario-name">{scenario.title}</span>
            <span className="certificate-card__scenario-meta">
              {scenario.locationName} · {scenario.durationSols} Sols Completed
            </span>
          </div>

          <div className="certificate-card__metrics-row">
            <div className="cert-metric">
              <span className="cert-metric__label">CREW</span>
              <span className="cert-metric__val">4/4 ALIVE</span>
            </div>
            <div className="cert-metric">
              <span className="cert-metric__label">RADIATION</span>
              <span className="cert-metric__val">{evaluation.maxRadiationDoseMsv.toFixed(1)} mSv</span>
            </div>
            <div className="cert-metric">
              <span className="cert-metric__label">CROPS</span>
              <span className="cert-metric__val">{evaluation.finalCropHealthPercent.toFixed(1)}%</span>
            </div>
            <div className="cert-metric">
              <span className="cert-metric__label">BATTERY</span>
              <span className="cert-metric__val">{evaluation.finalBatteryPercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="outpost-modal__footer">
          <button
            type="button"
            className="outpost-btn outpost-btn--primary"
            onClick={handleDownloadCertificate}
          >
            💾 Download Certificate Badge (.PNG)
          </button>
          <button
            type="button"
            className="outpost-btn outpost-btn--ghost"
            onClick={() => {
              playClickSound();
              onClose();
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
