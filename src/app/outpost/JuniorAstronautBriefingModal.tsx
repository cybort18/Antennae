import { useEffect } from 'react';
import { playClickSound } from '../../audio/outpostAudio';

export interface JuniorAstronautBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JuniorAstronautBriefingModal({
  isOpen,
  onClose,
}: JuniorAstronautBriefingModalProps) {
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

  if (!isOpen) return null;

  return (
    <div
      className="outpost-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-title"
    >
      <div className="outpost-modal outpost-modal--briefing">
        <div className="outpost-modal__header">
          <span className="outpost-modal__badge">NASA JUNIOR ASTRONAUT ACADEMY</span>
          <h2 id="briefing-title" className="outpost-modal__title">
            Outpost Commander Briefing &amp; Survival Guide
          </h2>
          <p className="outpost-modal__subtitle">
            Authentic NASA mission engineering: balance competing life-support trade-offs to keep your crew alive.
          </p>
        </div>

        <div className="outpost-modal__body">
          <div className="briefing-steps">
            {/* Step 1 */}
            <div className="briefing-card">
              <div className="briefing-card__num">01</div>
              <div className="briefing-card__content">
                <h3 className="briefing-card__title">Monitor Hostile Space Weather</h3>
                <p>
                  On Mars, regional dust storms reduce solar panel power by up to <strong>68%</strong>.
                  On the Moon, 7-day crater shadow drops solar generation to <strong>0%</strong>.
                  When a <strong>Solar Particle Event (SPE)</strong> erupts, deadly ionizing radiation strikes the surface.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="briefing-card">
              <div className="briefing-card__num">02</div>
              <div className="briefing-card__content">
                <h3 className="briefing-card__title">Balance 4 Critical Subsystems</h3>
                <ul className="briefing-list">
                  <li>
                    <strong>Cabin Life Support (ECLSS):</strong> Needs &ge;16 kW. Underpowering causes hypoxia (O₂ drops below 19.5%) and hypothermia.
                  </li>
                  <li>
                    <strong>Radiation Shielding:</strong> Needs &ge;12 kW during SPE flares to magnetically deflect protons away from crew quarters.
                  </li>
                  <li>
                    <strong>Hydroponics Greenhouse:</strong> Needs &ge;14 kW for grow lights. 3 consecutive dark Sols causes irreversible crop blight.
                  </li>
                  <li>
                    <strong>Auxiliary Avionics:</strong> Base communications, sensors, and computer systems.
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="briefing-card">
              <div className="briefing-card__num">03</div>
              <div className="briefing-card__content">
                <h3 className="briefing-card__title">Manage Battery Energy Reserves</h3>
                <p>
                  Nuclear Kilopower supplies continuous base power. Surplus solar charges your main battery bank.
                  During dust storms or lunar darkness, ration power carefully so your battery never hits <strong>0%</strong>.
                </p>
                <div className="briefing-badge-criteria">
                  <span>🏆 Commander Certification: Complete 14 Sols · Crew Alive · Radiation &lt;40 mSv · Food Viable</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="outpost-modal__footer">
          <button
            type="button"
            className="outpost-btn outpost-btn--primary"
            aria-label="Close briefing"
            onClick={() => {
              playClickSound();
              onClose();
            }}
          >
            Acknowledge &amp; Take Command ▶
          </button>
        </div>
      </div>
    </div>
  );
}
