/**
 * Simulation clock data types and playback configuration.
 */

export type PlaybackRateConfig = {
  id: string;
  label: string;
  daysPerSecond: number;
  description: string;
};

export type SimulationClockState = {
  julianDate: number;
  isPlaying: boolean;
  rateDaysPerSec: number;
};
