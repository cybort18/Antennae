// @vitest-environment jsdom
/**
 * Solar System Overview interaction tests.
 *
 * Both WebGL viewports are replaced with stubs because jsdom has no WebGL
 * context. The rest of the application is real: the default landing mode, the
 * body selector, the reference-only disclosure, and the reversible switch into
 * the Earth Orbit Lab where the two-body engine remains untouched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const engineProbe = vi.hoisted(() => ({ calls: 0, allow: false }));

vi.mock('../../simulation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../simulation')>();
  return {
    ...actual,
    runSimulation: (...args: Parameters<typeof actual.runSimulation>) => {
      engineProbe.calls += 1;
      if (!engineProbe.allow) {
        throw new Error('Engine ran before the Earth Orbit Lab was opened');
      }
      return actual.runSimulation(...args);
    },
  };
});

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

vi.mock('../../scene/SolarSystemViewport', () => ({
  SolarSystemViewport: ({
    selectedId,
    focusMode,
    focusSignal,
    elapsedDays,
  }: {
    selectedId: string;
    focusMode: string;
    focusSignal: number;
    elapsedDays?: number;
  }) => (
    <div
      data-testid="solar-system-viewport-stub"
      data-selected-id={selectedId}
      data-focus-mode={focusMode}
      data-focus-signal={String(focusSignal)}
      data-elapsed-days={String(elapsedDays ?? 0)}
    />
  ),
}));

import App from '../../App';

afterEach(cleanup);

beforeEach(() => {
  engineProbe.calls = 0;
  engineProbe.allow = false;
});

describe('Solar System Overview', () => {
  it('lands on the reference overview, not the Earth Orbit Lab', () => {
    render(<App />);

    // The Overview must not instantiate the two-body engine on first load.
    expect(engineProbe.calls).toBe(0);
    expect(
      screen.getByRole('heading', { name: 'Solar System Overview' }),
    ).toBeTruthy();
    expect(screen.getByText(/Reference visualization · not a dynamics simulation/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Solar System' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'Earth Orbit Lab' }).getAttribute('aria-pressed'),
    ).toBe('false');

    // All nine reference bodies are present and selectable.
    const bodySelector = within(screen.getByLabelText('Solar System bodies'));
    for (const name of [
      'Sun',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
    ]) {
      expect(bodySelector.getByRole('button', { name: new RegExp(`^${name}`) })).toBeTruthy();
    }

    const viewport = screen.getByTestId('solar-system-viewport-stub');
    expect(viewport.dataset.selectedId).toBe('sun');
    expect(viewport.dataset.focusMode).toBe('overview');
    expect(viewport.dataset.elapsedDays).toBe('0');

    // The overview is explicitly not to scale, starts paused at 0.0 Earth days, and exposes no simulation sample playback controls.
    expect(screen.getAllByText(/not to scale/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ILLUSTRATIVE MOTION · NOT AN EPHEMERIS/)).toBeTruthy();
    expect(screen.getByTestId('schematic-elapsed-readout').textContent).toBe(
      'Schematic elapsed time: +0.0 Earth days',
    );
    expect(
      screen.getByRole('button', { name: 'Play schematic motion' }).getAttribute('aria-pressed'),
    ).toBe('false');
    expect(screen.queryByRole('button', { name: /Run playback/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Step forward one sample/ })).toBeNull();
    expect(screen.queryByText('Two-body model')).toBeNull();

    // Sun orbital fields are explicitly shown as not applicable rather than 0.
    expect(screen.getByText('695,700 km')).toBeTruthy();
    expect(screen.getAllByText(/Not applicable \(central star\)/)).toHaveLength(4);
  });

  it('selects a body, updates its reference details, and resets the camera', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Jupiter/ }));

    const viewport = screen.getByTestId('solar-system-viewport-stub');
    expect(viewport.dataset.selectedId).toBe('jupiter');
    expect(viewport.dataset.focusMode).toBe('body');
    expect(screen.getByRole('heading', { name: 'Jupiter' })).toBeTruthy();
    expect(screen.getByText('5 of 8 from the Sun')).toBeTruthy();
    expect(screen.getByText('Gas giant')).toBeTruthy();
    expect(screen.getByText('69,911 km')).toBeTruthy();
    expect(screen.getByText('5.2029 AU')).toBeTruthy();
    expect(screen.getByText(/4332\.82 Earth days/)).toBeTruthy();
    expect(screen.getByText('0.0484')).toBeTruthy();
    expect(screen.getByText(/1\.30° \(J2000 ecliptic\)/)).toBeTruthy();
    expect(screen.getByText('NASA 3D Resources texture')).toBeTruthy();
    expect(screen.getAllByText(/fixed illustrative angle/i).length).toBeGreaterThan(0);

    // Earth must be attributed to the Earth Observatory, not NASA 3D Resources, and disclose its NSSDC vs. EM Bary provenance.
    const bodySelector = within(screen.getByLabelText('Solar System bodies'));
    await user.click(bodySelector.getByRole('button', { name: /^Earth/ }));
    expect(screen.getByText('NASA Earth Observatory texture')).toBeTruthy();
    expect(screen.getByText('6371.0 km')).toBeTruthy();
    expect(screen.getByText('1.0000 AU')).toBeTruthy();
    expect(screen.getByText(/365\.26 Earth days/)).toBeTruthy();
    expect(screen.getByText(/Earth-Moon barycenter/i)).toBeTruthy();

    // Radar-derived and illustrative surfaces are not presented as natural
    // colour or observational maps.
    await user.click(screen.getByRole('button', { name: /^Venus/ }));
    expect(screen.getAllByText(/radar-derived surface map, not natural colour/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /^Neptune/ }));
    expect(screen.getAllByText(/not an observational map/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Overview view' }));
    expect(viewport.dataset.selectedId).toBe('neptune');
    expect(viewport.dataset.focusMode).toBe('overview');
  });

  it('controls schematic motion deterministically, honors reduced motion, and preserves elapsed days across mode switches without running the physics engine', async () => {
    const user = userEvent.setup();
    render(<App />);

    const viewport = () => screen.getByTestId('solar-system-viewport-stub');
    const readout = () => screen.getByTestId('schematic-elapsed-readout');

    // Step forward +10 d twice, step back -10 d once
    await user.click(screen.getByRole('button', { name: 'Step forward 10 Earth days' }));
    expect(readout().textContent).toBe('Schematic elapsed time: +10.0 Earth days');
    expect(viewport().dataset.elapsedDays).toBe('10');

    await user.click(screen.getByRole('button', { name: 'Step forward 10 Earth days' }));
    expect(readout().textContent).toBe('Schematic elapsed time: +20.0 Earth days');

    await user.click(screen.getByRole('button', { name: 'Step back 10 Earth days' }));
    expect(readout().textContent).toBe('Schematic elapsed time: +10.0 Earth days');

    // Scrub to 120 Earth days and verify rate selector buttons
    const scrubber = screen.getByRole('slider', { name: 'Schematic elapsed time (Earth days)' });
    fireEvent.change(scrubber, { target: { value: '120' } });
    expect(readout().textContent).toBe('Schematic elapsed time: +120.0 Earth days');
    expect(viewport().dataset.elapsedDays).toBe('120');

    await user.click(screen.getByRole('button', { name: '10 d/s' }));
    expect(screen.getByRole('button', { name: '10 d/s' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(screen.getByRole('button', { name: '365 d/s' }));
    expect(screen.getByRole('button', { name: '365 d/s' }).getAttribute('aria-pressed')).toBe('true');

    // Play schematic motion, then switch to Earth Orbit Lab and back
    await user.click(screen.getByRole('button', { name: 'Play schematic motion' }));
    expect(screen.getByRole('button', { name: 'Pause schematic motion' }).getAttribute('aria-pressed')).toBe('true');

    // Physics engine has still never been called during Overview motion/scrubbing/stepping
    expect(engineProbe.calls).toBe(0);

    // Switch to Lab -> pauses schematic motion; returning to Overview preserves elapsed days and starts paused
    engineProbe.allow = true;
    await user.click(screen.getByRole('button', { name: 'Earth Orbit Lab' }));
    expect(screen.getByText('Two-body model')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Solar System' }));
    expect(
      screen.getByRole('button', { name: 'Play schematic motion' }).getAttribute('aria-pressed'),
    ).toBe('false');
    expect(readout().textContent).toMatch(/^\Schematic elapsed time: \+12\d\.\d Earth days$/);

    // Scrub to upper bound (3650) and verify +10 d is disabled and Play does not advance past 3650
    const returnedScrubber = screen.getByRole('slider', {
      name: 'Schematic elapsed time (Earth days)',
    });
    fireEvent.change(returnedScrubber, { target: { value: '3650' } });
    expect(readout().textContent).toBe('Schematic elapsed time: +3650.0 Earth days');
    expect(
      (screen.getByRole('button', { name: 'Step forward 10 Earth days' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    // Reset returns to 0.0 Earth days
    await user.click(screen.getByRole('button', { name: 'Reset schematic motion' }));
    expect(readout().textContent).toBe('Schematic elapsed time: +0.0 Earth days');
    expect(viewport().dataset.elapsedDays).toBe('0');
  });

  it('switches to the laboratory and back without discarding comparison records', async () => {
    const user = userEvent.setup();
    engineProbe.allow = true;
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Earth Orbit Lab' }));
    expect(screen.getByText('Two-body model')).toBeTruthy();

    const altitude = screen.getByLabelText(/Initial altitude \(km\)/);
    await user.clear(altitude);
    await user.type(altitude, '900');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: /Run candidate/ }));

    const candidateSamples = screen.getByTestId('viewport-stub').dataset.sampleCount;
    expect(candidateSamples).toBeTruthy();
    expect(screen.getAllByText(/900 km altitude/).length).toBeGreaterThan(0);

    // Leaving the Lab pauses a running cursor instead of advancing it unseen.
    await user.click(screen.getAllByRole('button', { name: 'Run playback' })[0]);
    expect(screen.getAllByRole('button', { name: 'Pause playback' }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Solar System' }));
    const overviewHeading = screen.getByRole('heading', { name: 'Solar System Overview' });
    expect(overviewHeading).toBeTruthy();
    expect(document.activeElement).toBe(overviewHeading);
    expect(screen.queryByTestId('viewport-stub')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Earth Orbit Lab' }));
    expect(document.activeElement?.id).toBe('lab-workspace');
    expect(screen.getByTestId('viewport-stub').dataset.sampleCount).toBe(candidateSamples);
    expect(screen.getAllByText(/900 km altitude/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Candidate' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getAllByRole('button', { name: 'Run playback' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button', { name: 'Pause playback' })).toHaveLength(0);
  }, 20000);
});
