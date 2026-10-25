/**
 * Browser LocalStorage persistence for Junior Astronaut Mission Trainer records.
 *
 * Stores highest stars achieved and mission completion status per scenario
 * without external network requirements or telemetry tracking.
 */

import type { OutpostOutcome } from './types';

export interface SavedMissionRecord {
  scenarioId: string;
  outcome: OutpostOutcome;
  starsAwarded: number;
  commanderRank: string;
  completedAt: string;
}

const STORAGE_KEY_PREFIX = 'antennae_outpost_record_';

export function saveMissionRecord(
  scenarioId: string,
  outcome: OutpostOutcome,
  starsAwarded: number,
  commanderRank: string,
): void {
  if (typeof window === 'undefined') return;

  const key = `${STORAGE_KEY_PREFIX}${scenarioId}`;
  const existing = getMissionRecord(scenarioId);

  // Preserve highest star achievement
  if (existing && existing.starsAwarded >= starsAwarded && existing.outcome === 'PASS') {
    return;
  }

  const record: SavedMissionRecord = {
    scenarioId,
    outcome,
    starsAwarded,
    commanderRank,
    completedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Gracefully handle storage quota or private mode restrictions
  }
}

export function getMissionRecord(scenarioId: string): SavedMissionRecord | null {
  if (typeof window === 'undefined') return null;

  const key = `${STORAGE_KEY_PREFIX}${scenarioId}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SavedMissionRecord;
  } catch {
    return null;
  }
}
