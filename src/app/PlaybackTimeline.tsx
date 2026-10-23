/**
 * Playback timeline.
 *
 * The cursor moves through recorded samples only: stepping is sample-accurate,
 * scrubbing snaps to the nearest recorded sample, and the time scale changes
 * replay speed — never the physics.
 */

import { Button } from '../components/ui';
import { formatClock, formatInteger, formatNumber } from '../results/format';
import { TIME_SCALE_OPTIONS, type Playback } from './playback';

export type PlaybackTimelineProps = {
  playback: Playback;
  sampleCount: number;
  maxTimeSeconds: number;
  sampleIntervalSeconds: number;
  /** Which record the timeline is playing ("Baseline (reference)" / "Candidate"). */
  recordLabel: string;
};

export function PlaybackTimeline({
  playback,
  sampleCount,
  maxTimeSeconds,
  sampleIntervalSeconds,
  recordLabel,
}: PlaybackTimelineProps) {
  const { progressSeconds, sampleIndex, playing, timeScale } = playback;
  const atStart = sampleIndex <= 0;
  const atEnd = sampleIndex >= sampleCount - 1;

  return (
    <section className="timeline" aria-label="Playback timeline">
      <div className="timeline__controls">
        <Button onClick={playback.reset} title="Reset playback to the first recorded sample">
          ⟲ Reset
        </Button>
        <Button
          onClick={() => playback.stepSamples(-1)}
          disabled={atStart}
          title="Step back one recorded sample (pauses playback)"
          ariaLabel="Step back one sample"
        >
          ◀▲
        </Button>
        <Button
          variant="default"
          onClick={playback.toggle}
          ariaPressed={playing}
          ariaLabel={playing ? 'Pause playback' : 'Run playback'}
          title={playing ? 'Pause playback' : 'Play recorded simulation samples'}
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </Button>
        <Button
          onClick={() => playback.stepSamples(1)}
          disabled={atEnd}
          title="Step forward one recorded sample (pauses playback)"
          ariaLabel="Step forward one sample"
        >
          ▶▲
        </Button>
      </div>

      <div className="timeline__track">
        <input
          className="timeline__scrubber"
          type="range"
          min={0}
          max={Math.max(maxTimeSeconds, 0)}
          step={sampleIntervalSeconds}
          value={Math.min(progressSeconds, maxTimeSeconds)}
          aria-label="Playback position (simulated time)"
          onChange={(event) => playback.seek(Number(event.target.value))}
        />
        <div className="timeline__readout">
          <span>
            t = {formatNumber(progressSeconds, 1)} s / {formatNumber(maxTimeSeconds, 1)} s
          </span>
          <span>
            {formatClock(progressSeconds)} / {formatClock(maxTimeSeconds)}
          </span>
          <span>
            sample {formatInteger(sampleIndex + 1)} / {formatInteger(sampleCount)}
          </span>
        </div>
      </div>

      <div className="timeline__scale" role="group" aria-label="Time scale (simulated seconds per real second)">
        <span className="timeline__scale-label">Time scale</span>
        {TIME_SCALE_OPTIONS.map((option) => (
          <Button
            key={option}
            variant={timeScale === option ? 'primary' : 'ghost'}
            ariaPressed={timeScale === option}
            onClick={() => playback.setTimeScale(option)}
            title={`${option} simulated seconds per real second`}
          >
            {option}x
          </Button>
        ))}
      </div>

      <p className="timeline__note">
        Playing <strong>{recordLabel}</strong> · playback replays recorded samples only — no
        interpolated states are shown. Finest available resolution is the integration sample interval
        ({sampleIntervalSeconds} s).
      </p>
    </section>
  );
}
