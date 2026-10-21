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
import { cleanup, render, screen, within } from '@testing-library/react';
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
  }: {
    selectedId: string;
    focusMode: string;
    focusSignal: number;
  }) => (
    <div
      data-testid="solar-system-viewport-stub"
      data-selected-id={selectedId}
      data-focus-mode={focusMode}
      data-focus-signal={String(focusSignal)}
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

    // The overview is explicitly not to scale and exposes no playback controls.
    expect(screen.getAllByText(/not to scale/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Run playback/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Step forward one sample/ })).toBeNull();
    expect(screen.queryByText('Two-body model')).toBeNull();
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
    expect(screen.getByText('NASA 3D Resources texture')).toBeTruthy();
    expect(screen.getAllByText(/fixed illustrative angle/i).length).toBeGreaterThan(0);

    // Earth must be attributed to the Earth Observatory, not NASA 3D Resources.
    const bodySelector = within(screen.getByLabelText('Solar System bodies'));
    await user.click(bodySelector.getByRole('button', { name: /^Earth/ }));
    expect(screen.getByText('NASA Earth Observatory texture')).toBeTruthy();

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
