/**
 * Formatting helpers for the workspace UI.
 *
 * Rules: every number is shown with its unit by the caller; unavailable values
 * are shown as an explicit placeholder rather than a guessed number.
 */

export const UNAVAILABLE = '—';

/** Formats a finite number with fixed decimals; non-finite values stay explicit. */
export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return UNAVAILABLE;
  }
  return value.toFixed(digits);
}

/** Groups thousands for readability without changing the value. */
export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) {
    return UNAVAILABLE;
  }
  return Math.round(value).toLocaleString('en-US');
}

export function formatPercent(fraction: number, digits = 4): string {
  if (!Number.isFinite(fraction)) {
    return UNAVAILABLE;
  }
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Explicit sign for differences (candidate − baseline). */
export function formatSignedNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) {
    return UNAVAILABLE;
  }
  const fixed = value.toFixed(digits);
  return value > 0 ? `+${fixed}` : fixed;
}

/** Simulated duration as HH:MM:SS (clamped at zero). */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return UNAVAILABLE;
  }
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return [hours, minutes, secs].map((part) => String(part).padStart(2, '0')).join(':');
}

/** Time scale as simulated seconds per real second. */
export function formatTimeScale(timeScale: number): string {
  return `${formatInteger(timeScale)}x`;
}
