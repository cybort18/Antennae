/**
 * Playback over recorded simulation samples.
 *
 * Contract (see docs/UX_UI_GUIDELINES.md and the Milestone 2 brief):
 * - Playback moves a cursor through the samples the engine actually recorded.
 * - The rendered state is always an exact recorded sample; no interpolated or
 *   extrapolated state is ever presented as simulation output.
 * - Playback never changes the timestep, the gravitational parameter, or any
 *   physical state; changing the time scale only changes how fast the existing
 *   simulated timeline is replayed.
 * - The cursor cannot move past the last recorded sample, so a run that stopped
 *   early (impact, instability) simply ends there.
 *
 * The time-scale value means: simulated seconds advanced per real second.
 */

import { useCallback, useEffect, useState } from 'react';

export const TIME_SCALE_OPTIONS = [10, 60, 300, 1000] as const;
export const DEFAULT_TIME_SCALE = 300;

/**
 * Longest real-time step that may be applied in one frame. Rendering hiccups or
 * a backgrounded tab therefore slow playback down instead of skipping ahead.
 */
const MAX_FRAME_DELTA_SECONDS = 0.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Advances the simulated-time cursor. Pure and deterministic. */
export function advanceProgressSeconds(
  progressSeconds: number,
  realDeltaSeconds: number,
  timeScale: number,
  maxTimeSeconds: number,
): number {
  const start = clamp(
    Number.isFinite(progressSeconds) ? progressSeconds : 0,
    0,
    maxTimeSeconds,
  );
  if (!Number.isFinite(realDeltaSeconds) || realDeltaSeconds <= 0) {
    return start;
  }
  return clamp(start + realDeltaSeconds * timeScale, 0, maxTimeSeconds);
}

/**
 * Maps a simulated time to the index of the nearest recorded sample.
 *
 * Samples are evenly spaced at the sample interval, except that a run stopped by
 * the engine may add one final sample off that grid; the cursor therefore snaps
 * to the last sample once it reaches the end of recorded time.
 */
export function indexForTime(
  timeSeconds: number,
  sampleIntervalSeconds: number,
  sampleCount: number,
  maxTimeSeconds: number,
): number {
  if (sampleCount <= 0) {
    return 0;
  }
  if (timeSeconds >= maxTimeSeconds - 1e-9) {
    return sampleCount - 1;
  }
  if (!Number.isFinite(sampleIntervalSeconds) || sampleIntervalSeconds <= 0) {
    return 0;
  }
  return clamp(Math.round(timeSeconds / sampleIntervalSeconds), 0, sampleCount - 1);
}

export type Playback = {
  /** Simulated time of the playback cursor, seconds. */
  progressSeconds: number;
  /** Index of the recorded sample currently shown. */
  sampleIndex: number;
  playing: boolean;
  timeScale: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  setTimeScale: (value: number) => void;
  seek: (timeSeconds: number) => void;
  /** Sample-accurate stepping; pauses playback first. */
  stepSamples: (delta: number) => void;
};

export type PlaybackOptions = {
  /** Identity of the current run; changing it rewinds the cursor to the start. */
  runKey: unknown;
  sampleIntervalSeconds: number;
  sampleCount: number;
  /** Simulated time of the last recorded sample. */
  maxTimeSeconds: number;
};

export function usePlayback(options: PlaybackOptions): Playback {
  const { runKey, sampleIntervalSeconds, sampleCount, maxTimeSeconds } = options;

  const [progressSeconds, setProgressSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timeScale, setTimeScale] = useState<number>(DEFAULT_TIME_SCALE);
  const [trackedRunKey, setTrackedRunKey] = useState(runKey);
  const [trackedMaxTimeSeconds, setTrackedMaxTimeSeconds] = useState(maxTimeSeconds);

  // State is adjusted during render (React's documented pattern for reacting to
  // changed inputs) rather than in effects, so a new run rewinds in the same
  // render and no extra commit is scheduled.
  if (trackedRunKey !== runKey) {
    // A new run is a new timeline: rewind, but keep the user's play/pause intent.
    setTrackedRunKey(runKey);
    setProgressSeconds(0);
  }

  if (trackedMaxTimeSeconds !== maxTimeSeconds) {
    // Never point past the end of recorded time (for example after a stopped run).
    setTrackedMaxTimeSeconds(maxTimeSeconds);
    setProgressSeconds((previous) => Math.min(previous, maxTimeSeconds));
  }

  // Reaching the last sample stops playback instead of holding a finished run in
  // a "playing" state.
  if (playing && progressSeconds >= maxTimeSeconds - 1e-9) {
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing || maxTimeSeconds <= 0) {
      return undefined;
    }

    let frame = 0;
    let last = performance.now();

    const tick = (now: number): void => {
      const deltaSeconds = Math.min((now - last) / 1000, MAX_FRAME_DELTA_SECONDS);
      last = now;
      setProgressSeconds((previous) =>
        advanceProgressSeconds(previous, deltaSeconds, timeScale, maxTimeSeconds),
      );
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, timeScale, maxTimeSeconds]);

  const play = useCallback(() => {
    setPlaying(maxTimeSeconds > 0);
  }, [maxTimeSeconds]);

  const pause = useCallback(() => setPlaying(false), []);

  const toggle = useCallback(() => {
    setPlaying((previous) => (previous ? false : maxTimeSeconds > 0));
  }, [maxTimeSeconds]);

  const reset = useCallback(() => {
    setPlaying(false);
    setProgressSeconds(0);
  }, []);

  const seek = useCallback(
    (timeSeconds: number) => {
      setProgressSeconds(clamp(timeSeconds, 0, maxTimeSeconds));
    },
    [maxTimeSeconds],
  );

  const stepSamples = useCallback(
    (delta: number) => {
      setPlaying(false);
      setProgressSeconds((previous) => {
        const current = indexForTime(previous, sampleIntervalSeconds, sampleCount, maxTimeSeconds);
        const next = clamp(current + delta, 0, Math.max(sampleCount - 1, 0));
        return Math.min(next * sampleIntervalSeconds, maxTimeSeconds);
      });
    },
    [maxTimeSeconds, sampleCount, sampleIntervalSeconds],
  );

  return {
    progressSeconds,
    sampleIndex: indexForTime(progressSeconds, sampleIntervalSeconds, sampleCount, maxTimeSeconds),
    playing,
    timeScale,
    play,
    pause,
    toggle,
    reset,
    setTimeScale,
    seek,
    stepSamples,
  };
}
