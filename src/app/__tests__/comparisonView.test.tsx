// @vitest-environment jsdom
/**
 * Baseline-versus-candidate flow tests.
 *
 * These drive the real workspace shell (WebGL viewport replaced by a stub) and
 * assert what the comparison actually shows: which series exist, what they are
 * derived from, how a stopped run is represented, and that editing, rejecting,
 * restoring, and promoting never mix records from different configurations.
 *
 * The chart is verified through its rendered geometry, not only through text:
 * x positions are checked against the shared time axis, and vertical ordering is
 * checked against the physical altitude difference.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

vi.mock('../../scene/SimulationViewport', () => ({
  SimulationViewport: ({
    sampleIndex,
    result,
  }: {
    sampleIndex: number;
    result: { samples: unknown[] };
  }) => (
    <div
      data-testid="viewport-stub"
      data-sample-index={String(sampleIndex)}
      data-sample-count={String(result.samples.length)}
    />
  ),
}));

import App from '../../App';
import { chartLayout } from '../altitudeChartMath';

afterEach(cleanup);

const layout = chartLayout();

type SeriesInfo = {
  samples: number;
  lastTimeSeconds: number;
  endedEarly: boolean;
  first: [number, number];
  last: [number, number];
  pointsString: string;
};

function readSeries(role: 'baseline' | 'candidate'): SeriesInfo | null {
  const element = document.querySelector(`[data-testid="series-${role}"]`);

  if (!element) {
    return null;
  }

  const pointsString = element.getAttribute('points') ?? '';
  const pairs = pointsString
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number) as [number, number]);

  return {
    samples: Number(element.getAttribute('data-samples')),
    lastTimeSeconds: Number(element.getAttribute('data-last-time-seconds')),
    endedEarly: element.getAttribute('data-ended-early') === 'true',
    first: pairs[0],
    last: pairs[pairs.length - 1],
    pointsString,
  };
}

function metricValue(label: RegExp): string {
  const rows = Array.from(document.querySelectorAll('.metric'));
  const row = rows.find((candidate) =>
    label.test(candidate.querySelector('.metric__label')?.textContent ?? ''),
  );
  return row?.querySelector('.metric__value')?.textContent ?? 'MISSING';
}

function totalSamplesFromCounter(): number {
  const text = screen.getAllByText(/sample \d+ \/ [\d,]+/)[0].textContent ?? '';
  return Number(text.match(/\/ ([\d,]+)/)?.[1]?.replace(/,/g, '') ?? '0');
}

/** Text of the top bar's active-record line (avoids dash/encoding brittleness). */
function topBarLabel(): string {
  return document.querySelector('.topbar__label')?.textContent ?? '';
}

function legendText(): string {
  return document.querySelector('.series-legend')?.textContent ?? '';
}

async function setAltitude(user: UserEvent, value: string): Promise<void> {
  const input = screen.getByLabelText(/Initial altitude \(km\)/);
  await user.clear(input);
  await user.type(input, value);
  await user.keyboard('{Enter}');
}

async function setSpeed(user: UserEvent, value: string): Promise<void> {
  const input = screen.getByLabelText(/Initial tangential speed \(km\/s\)/);
  await user.clear(input);
  await user.type(input, value);
  await user.keyboard('{Enter}');
}

async function runCandidate(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: /Run candidate/ }));
}

async function setCircularCandidateAt(user: UserEvent, altitudeKm: string): Promise<void> {
  await setAltitude(user, altitudeKm);
  await user.click(screen.getByRole('button', { name: /Use circular speed/ }));
  await runCandidate(user);
}

describe('initial comparison state', () => {
  it('opens with a completed baseline and no candidate series', () => {
    render(<App />);

    expect(screen.getByText('Locked comparison reference')).toBeTruthy();
    expect(screen.getAllByText(/No candidate run yet/).length).toBeGreaterThan(0);

    const baseline = readSeries('baseline');
    expect(baseline).not.toBeNull();
    expect(readSeries('candidate')).toBeNull();

    // The baseline series is the displayed run, point for point.
    expect(baseline?.samples).toBe(totalSamplesFromCounter());
    expect(baseline?.endedEarly).toBe(false);
    // t = 0 at the left edge, last recorded time at the right edge.
    expect(baseline?.first[0]).toBeCloseTo(layout.plot.left, 1);
    expect(baseline?.last[0]).toBeCloseTo(layout.plot.right, 1);

    // A not-run candidate column cannot show numbers.
    expect(screen.getByText('Not run')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('labels both axes with explicit units', () => {
    render(<App />);

    const chart = document.querySelector('.chart');
    expect(chart?.textContent).toContain('simulated time (s)');
    expect(chart?.textContent).toContain('altitude above mean Earth radius (6371 km) — km');
  });
});

describe('candidate edits', () => {
  it('change neither the baseline record nor the chart', async () => {
    const user = userEvent.setup();
    render(<App />);

    const baselineBefore = readSeries('baseline');

    await setAltitude(user, '900');

    expect(screen.getAllByText(/Unrun changes/).length).toBeGreaterThan(0);
    expect(screen.getByText('7271.0 km')).toBeTruthy(); // draft radius 6371 + 900
    expect(readSeries('candidate')).toBeNull();

    const baselineAfter = readSeries('baseline');
    expect(baselineAfter?.pointsString).toBe(baselineBefore?.pointsString);
    expect(baselineAfter?.samples).toBe(baselineBefore?.samples);
    expect(legendText()).toContain('400 km altitude');
  });
});

describe('running a candidate', () => {
  it('adds a second series, switches the viewport, and reports the difference', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setCircularCandidateAt(user, '900');

    const candidate = readSeries('candidate');
    // Re-read the baseline *after* the candidate exists: both series are now
    // drawn on the shared time axis, which is what these geometry checks mean.
    const baseline = readSeries('baseline');
    expect(candidate).not.toBeNull();
    expect(candidate?.samples).toBe(totalSamplesFromCounter());
    expect(candidate?.endedEarly).toBe(false);

    // The viewport and timeline now follow the candidate record.
    expect(topBarLabel()).toContain('Candidate');
    expect(topBarLabel()).toContain('900 km altitude');
    expect(screen.getByTestId('viewport-stub').dataset.sampleCount).toBe(String(candidate?.samples));

    // Both series share one time axis: the candidate run is longer, so it owns
    // the right edge and the baseline ends earlier on the same axis.
    expect(candidate?.last[0]).toBeCloseTo(layout.plot.right, 1);
    expect(baseline?.last[0]).toBeLessThan(layout.plot.right);
    expect(baseline?.last[0]).toBeGreaterThan(layout.plot.left);

    // A higher circular orbit is drawn above the lower one.
    expect(candidate?.first[1]).toBeLessThan(baseline?.first[1] ?? 0);

    // The computed difference at the common recorded time is ~+500 km, and the
    // higher orbit is slower (both are circular orbits).
    const altitudeDifference = Number(metricValue(/Altitude difference/).replace(/[^\d.+-]/g, ''));
    expect(altitudeDifference).toBeGreaterThan(490);
    expect(altitudeDifference).toBeLessThan(510);

    const speedDifference = Number(metricValue(/Speed difference/).replace(/[^\d.+-]/g, ''));
    expect(speedDifference).toBeLessThan(-0.15);
    expect(speedDifference).toBeGreaterThan(-0.35);
  });

  it('names each series with its own parameters and status', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setCircularCandidateAt(user, '900');

    expect(legendText()).toContain('Baseline');
    expect(legendText()).toContain('400 km altitude');
    expect(legendText()).toContain('Candidate');
    expect(legendText()).toContain('900 km altitude');
  });

  it('creates a second series from the candidate run only, never from the draft', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setCircularCandidateAt(user, '900');
    const afterRun = readSeries('candidate');

    // Editing again must not redraw the candidate series.
    await setAltitude(user, '1100');
    expect(readSeries('candidate')?.pointsString).toBe(afterRun?.pointsString);
    expect(screen.getByText(/Candidate parameters changed after the last candidate run/)).toBeTruthy();

    await runCandidate(user);
    expect(readSeries('candidate')?.pointsString).not.toBe(afterRun?.pointsString);
    expect(readSeries('candidate')?.samples).toBe(totalSamplesFromCounter());
  });
});

describe('restoring the baseline parameters', () => {
  it('reproduces the baseline run and leaves the reference intact', async () => {
    const user = userEvent.setup();
    render(<App />);

    const baselineBefore = readSeries('baseline');
    await setAltitude(user, '900');
    await runCandidate(user);

    expect(readSeries('candidate')?.pointsString).not.toBe(baselineBefore?.pointsString);

    await user.click(screen.getByRole('button', { name: /Restore baseline parameters/ }));

    // Parameters are restored exactly…
    expect((screen.getByLabelText(/Initial altitude \(km\)/) as HTMLInputElement).value).toBe('400');
    expect(screen.getByText(/These parameters match the last candidate run/)).toBeTruthy();

    // …the candidate now reproduces the baseline sample for sample…
    const restoredCandidate = readSeries('candidate');
    expect(restoredCandidate?.pointsString).toBe(baselineBefore?.pointsString);
    expect(restoredCandidate?.samples).toBe(baselineBefore?.samples);

    // …the difference is exactly zero…
    expect(metricValue(/Altitude difference/)).toBe('0.000 km');
    expect(metricValue(/Speed difference/)).toBe('0.0000 km/s');

    // …and the original comparison reference is untouched.
    expect(readSeries('baseline')?.pointsString).toBe(baselineBefore?.pointsString);
  });

  it('returns to a promoted baseline, not to the original default', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setAltitude(user, '900');
    await runCandidate(user);
    await user.click(screen.getByRole('button', { name: /Replace baseline with candidate/ }));
    await user.click(screen.getByRole('button', { name: /Confirm replace baseline/ }));

    await setAltitude(user, '1200');
    await user.click(screen.getByRole('button', { name: /Restore baseline parameters/ }));

    expect((screen.getByLabelText(/Initial altitude \(km\)/) as HTMLInputElement).value).toBe('900');
  });
});

describe('invalid candidate parameters', () => {
  it('never replace a valid run in the comparison', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setCircularCandidateAt(user, '900');
    const candidateBefore = readSeries('candidate');
    const baselineBefore = readSeries('baseline');

    await setAltitude(user, '50');
    expect(screen.getByText(/Candidate parameters invalid — not integrated/)).toBeTruthy();

    await runCandidate(user);
    expect(screen.getByText(/Candidate run rejected — nothing was integrated/)).toBeTruthy();

    // Both series and the displayed record are unchanged.
    expect(readSeries('candidate')?.pointsString).toBe(candidateBefore?.pointsString);
    expect(readSeries('baseline')?.pointsString).toBe(baselineBefore?.pointsString);
    expect(topBarLabel()).toContain('Candidate');
    expect(topBarLabel()).toContain('900 km altitude');
    expect(legendText()).toContain('400 km altitude');
  });
});

describe('stopped candidate runs', () => {
  it('are drawn up to their last recorded sample and labelled as stopped', async () => {
    const user = userEvent.setup();
    render(<App />);

    const baselineBefore = readSeries('baseline');
    await setSpeed(user, '5');
    await runCandidate(user);

    const candidate = readSeries('candidate');
    expect(candidate?.endedEarly).toBe(true);
    expect(candidate?.samples).toBeLessThan(baselineBefore?.samples ?? 0);
    // Plotted well before the shared axis end, not stretched to it.
    expect(candidate?.last[0]).toBeLessThan(layout.plot.right - 1);
    expect(candidate?.last[0]).toBeGreaterThan(layout.plot.left);

    // The completed baseline is still shown in full on the same axis.
    const baselineAfter = readSeries('baseline');
    expect(baselineAfter?.samples).toBe(baselineBefore?.samples);
    expect(baselineAfter?.last[0]).toBeCloseTo(layout.plot.right, 1);

    // Status and the recorded (not requested) end time are both stated.
    expect(screen.getAllByText(/Stopped · Reached the impact radius/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/of [\d,]+ s requested/).length).toBeGreaterThan(0);
    expect(screen.getByText(/A series marked stopped ends at its own last recorded sample/)).toBeTruthy();
  });
});

describe('replacing the baseline', () => {
  it('requires an explicit confirmation and clears the candidate', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setAltitude(user, '900');
    await runCandidate(user);
    const promotedSamples = readSeries('candidate')?.samples ?? 0;

    await user.click(screen.getByRole('button', { name: /Replace baseline with candidate/ }));

    // Confirmation is shown first; nothing has changed yet.
    expect(screen.getByText(/Replace the baseline with the current candidate run\?/)).toBeTruthy();
    expect(readSeries('candidate')).not.toBeNull();
    expect(legendText()).toContain('400 km altitude');

    await user.click(screen.getByRole('button', { name: /Confirm replace baseline/ }));

    expect(screen.queryByTestId('series-candidate')).toBeNull();
    expect(readSeries('baseline')?.samples).toBe(promotedSamples);
    expect(legendText()).toContain('900 km altitude');
    expect(screen.getAllByText(/No candidate run yet/).length).toBeGreaterThan(0);
  });

  it('can be cancelled without touching either record', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setAltitude(user, '900');
    await runCandidate(user);
    const candidateBefore = readSeries('candidate');
    const baselineBefore = readSeries('baseline');

    await user.click(screen.getByRole('button', { name: /Replace baseline with candidate/ }));
    await user.click(screen.getByRole('button', { name: /^Cancel$/ }));

    expect(screen.queryByText(/Replace the baseline with the current candidate run\?/)).toBeNull();
    expect(readSeries('candidate')?.pointsString).toBe(candidateBefore?.pointsString);
    expect(readSeries('baseline')?.pointsString).toBe(baselineBefore?.pointsString);
  });
});

describe('playback independence', () => {
  it('resetting or stepping playback never clears the comparison records', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setAltitude(user, '900');
    await runCandidate(user);

    const baselineBefore = readSeries('baseline');
    const candidateBefore = readSeries('candidate');

    await user.click(screen.getAllByRole('button', { name: /Reset/ })[0]);
    await user.click(screen.getByRole('button', { name: /Step forward one sample/ }));
    await user.click(screen.getAllByRole('button', { name: /Run playback/ })[0]);
    await user.click(screen.getAllByRole('button', { name: /Pause playback/ })[0]);

    expect(readSeries('baseline')?.pointsString).toBe(baselineBefore?.pointsString);
    expect(readSeries('candidate')?.pointsString).toBe(candidateBefore?.pointsString);
    expect(screen.getByText('Locked comparison reference')).toBeTruthy();
    expect(metricValue(/Altitude difference/)).not.toBe('MISSING');
  });

  it('switching the displayed trajectory does not change the compared runs', async () => {
    const user = userEvent.setup();
    render(<App />);

    await setAltitude(user, '900');
    await runCandidate(user);

    const baselineBefore = readSeries('baseline');
    const candidateBefore = readSeries('candidate');
    const candidateSamples = candidateBefore?.samples ?? 0;

    await user.click(screen.getByRole('button', { name: /^Baseline$/ }));
    expect(screen.getByTestId('viewport-stub').dataset.sampleCount).not.toBe(String(candidateSamples));

    await user.click(screen.getByRole('button', { name: /^Candidate$/ }));
    expect(screen.getByTestId('viewport-stub').dataset.sampleCount).toBe(String(candidateSamples));

    expect(readSeries('baseline')?.pointsString).toBe(baselineBefore?.pointsString);
    expect(readSeries('candidate')?.pointsString).toBe(candidateBefore?.pointsString);
  });
});
