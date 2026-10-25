// @vitest-environment jsdom
/**
 * Mission Designer interaction tests.
 *
 * The real engine, records, comparison state, playback, and evaluator are used.
 * Only the WebGL viewport is stubbed. Tests cover pass/fail/not-evaluable
 * outcomes, the explicit Run Mission action, mode-switch preservation, and the
 * GOES render-only mesh association.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

vi.mock('../../scene/SimulationViewport', () => ({
  SimulationViewport: ({
    sampleIndex,
    result,
    spacecraftModel,
  }: {
    sampleIndex: number;
    result: { samples: unknown[] };
    spacecraftModel?: string | null;
  }) => (
    <div
      data-testid="viewport-stub"
      data-sample-index={String(sampleIndex)}
      data-sample-count={String(result.samples.length)}
      data-spacecraft-model={spacecraftModel ?? ''}
    />
  ),
}));

vi.mock('../../scene/SolarSystemViewport', () => ({
  SolarSystemViewport: ({
    selectedId,
    focusMode,
  }: {
    selectedId: string;
    focusMode: string;
  }) => (
    <div
      data-testid="solar-system-viewport-stub"
      data-selected-id={selectedId}
      data-focus-mode={focusMode}
    />
  ),
}));

import App from '../../App';
import {
  EARTH_MEAN_RADIUS_KM,
  EARTH_MU_KM3_S2,
  circularOrbitalSpeedKmPerS,
} from '../../simulation';

afterEach(cleanup);

function renderMission(): void {
  render(<App initialMode="overview" initialOverviewPlaying={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mission Designer' }));
}

function outcome(): HTMLElement {
  return screen.getByTestId('mission-outcome');
}

async function setNumber(user: UserEvent, label: RegExp, value: string): Promise<void> {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
  await user.keyboard('{Enter}');
}

function speedAtAltitude(altitudeKm: number): number {
  return circularOrbitalSpeedKmPerS(
    EARTH_MEAN_RADIUS_KM + altitudeKm,
    EARTH_MU_KM3_S2,
  );
}

async function setSpeedFactor(
  user: UserEvent,
  factor: number,
  altitudeKm = 400,
): Promise<void> {
  await setNumber(user, /Initial speed/, (speedAtAltitude(altitudeKm) * factor).toFixed(6));
}

async function runMission(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Run Mission' }));
}

function criterion(label: string): HTMLElement {
  const element = screen.getByText(label).closest('.mission-criterion');
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Criterion not found: ${label}`);
  }
  return element;
}

describe('Mission Designer', () => {
  it('opens with the objective, pass rule, baseline reference, and computed metrics', () => {
    renderMission();

    expect(
      screen.getByRole('heading', { name: 'Design a Stable Circular Earth Orbit' }),
    ).toBeTruthy();
    expect(document.querySelector('.mission-rule')?.textContent).toMatch(/Pass rule/);
    expect(screen.getByRole('button', { name: 'Run Mission' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mission Designer' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(document.activeElement?.id).toBe('mission-designer-title');

    expect(outcome().dataset.status).toBe('pass');
    expect(within(outcome()).getByText('PASS')).toBeTruthy();
    expect(within(outcome()).getByText(/Baseline reference/)).toBeTruthy();
    expect(criterion('Covers at least one target period').classList.contains('mission-criterion--pass')).toBe(true);
    expect(criterion('Stays inside the target-altitude window').classList.contains('mission-criterion--pass')).toBe(true);
    expect(criterion('Stays above the minimum clearance').classList.contains('mission-criterion--pass')).toBe(true);
    expect(screen.getByText('Computed metrics')).toBeTruthy();
    expect(screen.getAllByText('Target period').length).toBeGreaterThan(0);
    expect(screen.getByText(/Altitude span is max/)).toBeTruthy();
  });

  it('runs a new ideal mission at a changed target and passes', async () => {
    const user = userEvent.setup();
    renderMission();

    await setNumber(user, /Target altitude/, '500');
    await user.click(screen.getByRole('button', { name: 'Use ideal circular start' }));
    await runMission(user);

    expect(outcome().dataset.status).toBe('pass');
    expect(screen.getAllByText(/500 km altitude/).length).toBeGreaterThan(0);
    expect(within(outcome()).getByText(/Evaluated run: Candidate/)).toBeTruthy();
    expect(screen.getByTestId('viewport-stub').dataset.spacecraftModel).toBe('');
  }, 20000);

  it.each([
    ['too slow', 0.99],
    ['too fast', 1.01],
  ])('fails a completed run for a %s initial speed', async (_label, factor) => {
    const user = userEvent.setup();
    renderMission();

    await setSpeedFactor(user, factor);
    await runMission(user);

    expect(outcome().dataset.status).toBe('fail');
    expect(criterion('Stays inside the target-altitude window').classList.contains('mission-criterion--fail')).toBe(true);
    expect(within(criterion('Stays inside the target-altitude window')).getByText('FAIL')).toBeTruthy();
    expect(screen.getAllByText(/Recorded altitude range/).length).toBeGreaterThan(0);
  }, 20000);

  it('shows a stopped or invalid target as NOT EVALUABLE, not a pass or fail', async () => {
    const user = userEvent.setup();
    renderMission();

    await setNumber(user, /Initial speed/, '0.5');
    await runMission(user);
    expect(outcome().dataset.status).toBe('not-evaluable');
    expect(criterion('Covers at least one target period').classList.contains('mission-criterion--not-evaluable')).toBe(true);
    expect(
      screen.getAllByText(/a completed run covering at least one target period is required/i).length,
    ).toBeGreaterThan(0);

    await setNumber(user, /Target altitude/, '5000');
    expect(outcome().dataset.status).toBe('not-evaluable');
    expect(screen.getByText(/Target altitude is outside the template range/)).toBeTruthy();
  }, 20000);

  it('preserves the candidate when switching between Lab and Mission, and pauses playback', async () => {
    const user = userEvent.setup();
    renderMission();

    await setNumber(user, /Target altitude/, '500');
    await user.click(screen.getByRole('button', { name: 'Use ideal circular start' }));
    await runMission(user);
    const missionSamples = screen.getByTestId('viewport-stub').dataset.sampleCount;

    await user.click(screen.getAllByRole('button', { name: 'Run playback' })[0]);
    expect(screen.getAllByRole('button', { name: 'Pause playback' }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Earth Orbit Lab' }));
    expect(screen.queryAllByRole('button', { name: 'Pause playback' })).toHaveLength(0);
    expect(screen.getByTestId('viewport-stub').dataset.sampleCount).toBe(missionSamples);
    expect(screen.getAllByText(/500 km altitude/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Mission Designer' }));
    expect(outcome().dataset.status).toBe('pass');
    expect(screen.getByTestId('viewport-stub').dataset.sampleCount).toBe(missionSamples);
  }, 25000);

  it('associates the GOES-16 reference run with the render-only local mesh', async () => {
    const user = userEvent.setup();
    renderMission();

    await user.click(screen.getByRole('button', { name: /Objects & data/ }));
    await user.click(screen.getByRole('button', { name: /Load reference into candidate/ }));
    await runMission(user);

    expect(screen.getByTestId('viewport-stub').dataset.spacecraftModel).toBe('goes-16');
    expect(screen.getByText('GOES-16 spacecraft')).toBeTruthy();
    expect(screen.getByText(/render-only mesh · no physical effect/)).toBeTruthy();
    expect(screen.getAllByText(/NASA GOES Spacecraft 3D Model/).length).toBeGreaterThan(0);
    expect(outcome().dataset.status).toBe('fail');
  }, 20000);

  it('provides collapsible comparison chart access in Mission Designer with target window and clearance guides', async () => {
    const user = userEvent.setup();
    renderMission();

    const body = document.getElementById('comparison-chart-body');
    const toggle = screen.getByRole('button', { name: 'Show chart' });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(body?.hasAttribute('hidden')).toBe(true);

    // Toggle open the chart
    await user.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(body?.hasAttribute('hidden')).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide chart' })).toBeTruthy();
    expect(screen.getByTestId('altitude-chart')).toBeTruthy();

    // Verify mission threshold guides
    expect(screen.getByTestId('chart-guide-band')).toBeTruthy();
    expect(screen.getByText(/Target window ±20 km/)).toBeTruthy();
    expect(screen.getByTestId('chart-guide-line')).toBeTruthy();
    expect(screen.getByText(/Minimum clearance 200 km/)).toBeTruthy();

    // Change target altitude to 600 km and verify guide label updates dynamically
    await setNumber(user, /Target altitude/, '600');
    expect(screen.getByText(/Target window ±20 km \(580–620 km\)/)).toBeTruthy();
  }, 20000);
});
