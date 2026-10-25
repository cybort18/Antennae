import { describe, expect, it } from 'vitest';
import {
  isAudioMuted,
  playAdvanceSolSound,
  playAlertSiren,
  playClickSound,
  playDilemmaAlert,
  playMissionFailureTone,
  playMissionVictoryFanfare,
  setAudioMuted,
  toggleAudioMute,
} from '../outpostAudio';

describe('outpostAudio', () => {
  it('manages mute state cleanly', () => {
    setAudioMuted(false);
    expect(isAudioMuted()).toBe(false);

    toggleAudioMute();
    expect(isAudioMuted()).toBe(true);

    toggleAudioMute();
    expect(isAudioMuted()).toBe(false);
  });

  it('safely handles audio triggers without crashing in headless/test environments', () => {
    // Should execute safely without throwing errors even if window.AudioContext is unmocked or muted
    expect(() => {
      playClickSound();
      playAdvanceSolSound();
      playAlertSiren();
      playDilemmaAlert();
      playMissionVictoryFanfare();
      playMissionFailureTone();
    }).not.toThrow();

    setAudioMuted(true);
    expect(() => {
      playClickSound();
      playAdvanceSolSound();
    }).not.toThrow();
  });
});
