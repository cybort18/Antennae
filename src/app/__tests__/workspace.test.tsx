// @vitest-environment jsdom
/**
 * Workspace interaction tests.
 *
 * These render the real application shell (with the WebGL viewport replaced by a
 * stub, because jsdom has no WebGL context) and exercise the flows the milestone
 * requires: run, pause, reset, stepping, time scale, editing an initial
 * condition, invalid input, and a stopped run's warning.
 *
 * Assertions read the values the UI derives from real engine output, so a broken
 * connection between engine and UI fails these tests.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

afterEach(cleanup);

function readSampleCounter(): string {
  return screen.getAllByText(/sample \d+ \/ [\d,]+/)[0].textContent ?? '';
}

function viewportStub(): HTMLElement {
  return screen.getByTestId('viewport-stub');
}

describe('workspace shell', () => {
  it('renders the app identity, model status, and both objects', () => {
    render(<App />);

    expect(screen.getByText('Antennae')).toBeTruthy();
    expect(screen.getByText('Space Sandbox')).toBeTruthy();
    expect(screen.getByText('Two-body model')).toBeTruthy();
    // Status appears in the top bar and in the results panel.
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);

    expect(screen.getByRole('button', { name: /Test particle/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Earth/ })).toBeTruthy();
  });

  it('displays the model and scientific limitations disclosure', () => {
    render(<App />);

    expect(screen.getByText(/Simplified two-body point-mass gravity/)).toBeTruthy();
    expect(screen.getByText(/Earth-centered inertial axes/)).toBeTruthy();
    expect(screen.getByText(/Not NASA\/JPL observational data/)).toBeTruthy();
    expect(screen.getByText(/Not a flight-safety, navigation, collision-risk, or impact-prediction tool/)).toBeTruthy();
  });

  it('shows sample-derived metrics for the default scenario', () => {
    render(<App />);

    // 400 km altitude at 6771 km radius, rendered from the engine's first sample.
    // (The comparison summary reports the same value for baseline and candidate.)
    expect(screen.getAllByText('400.000 km').length).toBeGreaterThan(0);
    // Current speed appears in the speed row and in the min/max row.
    expect(screen.getAllByText(/7\.672\d km\/s/).length).toBeGreaterThan(0);
    expect(screen.getByText(/No warnings/)).toBeTruthy();
  });

  it('switches the inspector when Earth is selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Earth/ }));

    expect(screen.getByText('Inspector — Earth')).toBeTruthy();
    expect(screen.getByText(/Fixed force centre at frame origin/)).toBeTruthy();
    // Reported twice: ephemeris state and rotation/oblateness are both absent.
    expect(screen.getAllByText('Not modelled').length).toBe(2);
  });
});

describe('editing initial conditions', () => {
  it('keeps the running results untouched until the candidate is run', async () => {
    const user = userEvent.setup();
    render(<App />);

    const sampleCountBefore = viewportStub().dataset.sampleCount;
    expect(screen.getAllByText('400.000 km').length).toBeGreaterThan(0);

    const altitude = screen.getByLabelText(/Initial altitude \(km\)/);
    await user.clear(altitude);
    await user.type(altitude, '1200');
    await user.keyboard('{Enter}');

    // The draft acknowledges the change, and the baseline result is unchanged.
    expect(screen.getAllByText(/Unrun changes/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('400.000 km').length).toBeGreaterThan(0);
    expect(viewportStub().dataset.sampleCount).toBe(sampleCountBefore);
    // Draft-derived reference values update immediately (no integration).
    expect(screen.getByText(/Circular speed at this altitude: 7\.256 km\/s/)).toBeTruthy();
    expect(screen.getAllByText(/1\.06x circular/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Run candidate/ }));

    // Now the engine has integrated the new parameters.
    expect(screen.getAllByText('1200.000 km').length).toBeGreaterThan(0);
    expect(viewportStub().dataset.sampleCount).not.toBe(sampleCountBefore);
    expect(Number(viewportStub().dataset.sampleCount)).toBeGreaterThan(1);
    expect(screen.queryAllByText(/Unrun changes/).length).toBe(0);
  });

  it('can restore the circular speed for the current altitude', async () => {
    const user = userEvent.setup();
    render(<App />);

    const altitude = screen.getByLabelText(/Initial altitude \(km\)/);
    await user.clear(altitude);
    await user.type(altitude, '1200');
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: /Use circular speed/ }));
    await user.click(screen.getByRole('button', { name: /Run candidate/ }));

    // Back at exactly one circular speed: the ratio returns to 1.00x and the
    // engine's sample-0 speed is the circular speed for 7571 km.
    expect(screen.getByText(/Current: 1\.00x circular/)).toBeTruthy();
    // Speed row (and min/max row when both round to the same value).
    expect(screen.getAllByText(/7\.2560 km\/s/).length).toBeGreaterThan(0);
  });

  it('applies slider edits to the candidate parameters immediately', async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText(/Initial altitude slider/), {
      target: { value: '800' },
    });

    // Draft feedback is immediate, but no result has been produced yet.
    expect(screen.getByText('7171.0 km')).toBeTruthy();
    expect(screen.queryAllByText('800.000 km').length).toBe(0);

    await user.click(screen.getByRole('button', { name: /Run candidate/ }));
    expect(screen.getAllByText('800.000 km').length).toBeGreaterThan(0);
  });

  it('does not commit typed text until it is confirmed', async () => {
    const user = userEvent.setup();
    render(<App />);

    const speed = screen.getByLabelText(/Initial tangential speed \(km\/s\)/);
    await user.clear(speed);
    await user.type(speed, '7.6');

    // Unconfirmed text changes nothing at all.
    expect(screen.getAllByText(/7\.6726 km\/s/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Unrun changes/).length).toBe(0);

    await user.keyboard('{Enter}');

    // Confirmed text updates the candidate parameters, still without a run.
    expect(screen.getAllByText(/Unrun changes/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/7\.6726 km\/s/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Run candidate/ }));
    expect(screen.getAllByText(/7\.6000 km\/s/).length).toBeGreaterThan(0);
  });

  it('rejects out-of-range input without integrating anything', async () => {
    const user = userEvent.setup();
    render(<App />);

    const altitude = screen.getByLabelText(/Initial altitude \(km\)/);
    await user.clear(altitude);
    await user.type(altitude, '50');
    await user.keyboard('{Enter}');

    expect(screen.getByText(/Candidate parameters invalid — not integrated/)).toBeTruthy();
    expect(
      screen.getAllByText(/Altitude must be between 200 and 20000 km/).length,
    ).toBeGreaterThan(0);

    // Running it reports the rejection and still changes nothing.
    await user.click(screen.getByRole('button', { name: /Run candidate/ }));
    expect(screen.getByText(/Candidate run rejected — nothing was integrated/)).toBeTruthy();
    expect(screen.getAllByText('400.000 km').length).toBeGreaterThan(0);
    expect(screen.getByText('Locked comparison reference')).toBeTruthy();
  });
});

describe('playback', () => {
  it('runs and pauses without changing simulation data', async () => {
    const user = userEvent.setup();
    render(<App />);

    const sampleCount = viewportStub().dataset.sampleCount;

    await user.click(screen.getAllByRole('button', { name: /Run playback/ })[0]);
    expect(screen.getAllByRole('button', { name: /Pause playback/ }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: /Pause playback/ })[0]);
    expect(screen.getAllByRole('button', { name: /Run playback/ }).length).toBeGreaterThan(0);

    // Pausing does not alter the recorded run.
    expect(viewportStub().dataset.sampleCount).toBe(sampleCount);
  });

  it('steps sample-accurately and resets to the first sample', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(readSampleCounter()).toContain('sample 1 /');

    await user.click(screen.getByRole('button', { name: /Step forward one sample/ }));
    expect(readSampleCounter()).toContain('sample 2 /');
    expect(screen.getByText(/t = 10\.0 s \//)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Step forward one sample/ }));
    expect(readSampleCounter()).toContain('sample 3 /');

    await user.click(screen.getAllByRole('button', { name: /Reset/ })[0]);
    expect(readSampleCounter()).toContain('sample 1 /');
    expect(screen.getByText(/t = 0\.0 s \//)).toBeTruthy();
  });

  it('advances playback while running and never past the recorded samples', () => {
    vi.useFakeTimers();
    try {
      render(<App />);
      const before = readSampleCounter();

      fireEvent.click(screen.getAllByRole('button', { name: /Run playback/ })[0]);
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      const after = readSampleCounter();
      expect(after).not.toBe(before);

      const shown = Number(after.match(/sample (\d+)/)?.[1] ?? '0');
      const total = Number(after.match(/\/ ([\d,]+)/)?.[1]?.replace(/,/g, '') ?? '0');
      expect(shown).toBeGreaterThan(1);
      expect(shown).toBeLessThanOrEqual(total);
    } finally {
      vi.useRealTimers();
    }
  });

  it('changes the time scale without touching the physics', async () => {
    const user = userEvent.setup();
    render(<App />);

    const sampleCount = viewportStub().dataset.sampleCount;
    await user.click(screen.getByRole('button', { name: '1000x' }));

    expect(screen.getByRole('button', { name: '1000x' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '300x' }).getAttribute('aria-pressed')).toBe('false');
    expect(viewportStub().dataset.sampleCount).toBe(sampleCount);
    expect(screen.getAllByText('400.000 km').length).toBeGreaterThan(0);
  });
});

describe('stopped runs', () => {
  it('shows the engine warning instead of animating a successful completion', async () => {
    const user = userEvent.setup();
    render(<App />);

    // A sub-circular speed drops the perigee below the stop radius.
    const speed = screen.getByLabelText(/Initial tangential speed \(km\/s\)/);
    await user.clear(speed);
    await user.type(speed, '5');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: /Run candidate/ }));

    expect(screen.getByText(/Candidate stopped · Reached the impact radius/)).toBeTruthy();
    expect(screen.getByText(/Stopped · IMPACT_RADIUS_REACHED/)).toBeTruthy();
    // Engine message appears in the status banner and in the results warnings list.
    expect(screen.getAllByText(/crossed the configured impact radius/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Playback ends at the last recorded sample/)).toBeTruthy();
  });
});
