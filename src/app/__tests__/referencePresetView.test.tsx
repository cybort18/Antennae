// @vitest-environment jsdom
/**
 * Cached reference-preset interaction test.
 *
 * The WebGL viewport is stubbed because jsdom has no WebGL context; everything
 * else is the real workspace. The test proves the panel, draft, engine run, and
 * provenance notice are connected to the exact cached vector.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type StubSample = {
  state: {
    positionKm: { x: number; y: number; z: number };
  };
};

vi.mock('../../scene/SimulationViewport', () => ({
  SimulationViewport: ({
    sampleIndex,
    result,
  }: {
    sampleIndex: number;
    result: { samples: StubSample[] };
  }) => {
    const first = result.samples[0];
    return (
      <div
        data-testid="viewport-stub"
        data-sample-index={String(sampleIndex)}
        data-sample-count={String(result.samples.length)}
        data-first-x={first ? String(first.state.positionKm.x) : ''}
        data-first-z={first ? String(first.state.positionKm.z) : ''}
      />
    );
  },
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

import { renderEarthLab } from './renderEarthLab';
import { ReferencePresetPanel } from '../ReferencePresetPanel';

afterEach(cleanup);

describe('cached reference preset', () => {
  it('shows provenance and loads the exact state only when the user asks', async () => {
    const user = userEvent.setup();
    renderEarthLab();

    expect(screen.getByText('Reference data')).toBeTruthy();
    expect(screen.getByText(/Cached NASA\/JPL state/)).toBeTruthy();
    expect(screen.getByText('GOES-16 — cached JPL Horizons reference state')).toBeTruthy();
    expect(screen.getByText('NASA/JPL Horizons')).toBeTruthy();
    expect(screen.getByText('2026-Oct-20 00:00:00.0000 TDB')).toBeTruthy();
    expect(screen.getByText('ICRF')).toBeTruthy();
    expect(screen.getByText('Earth (399), BODY CENTER')).toBeTruthy();
    expect(screen.getByText('2026-10-20T08:11:49Z')).toBeTruthy();

    const before = screen.getByTestId('viewport-stub').dataset.sampleCount;
    await user.selectOptions(screen.getByLabelText('Revolutions to integrate'), '0.5');
    await user.click(screen.getByRole('button', { name: /Load reference into candidate/ }));

    expect(screen.getByText('Cached reference state')).toBeTruthy();
    expect(screen.getByText('Exact provider vector')).toBeTruthy();
    expect(screen.getByText(/This candidate uses the exact cached vector/)).toBeTruthy();
    expect(screen.getAllByText(/Unrun changes/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Loaded in draft/ })).toBeTruthy();
    // Loading is not a run: the displayed synthetic baseline is unchanged.
    expect(screen.getByTestId('viewport-stub').dataset.sampleCount).toBe(before);
    expect(screen.getAllByText(/400\.000 km/).length).toBeGreaterThan(0);
  }, 15000);

  it('runs the exact state and discloses the hypothetical provenance', async () => {
    const user = userEvent.setup();
    renderEarthLab();

    await user.selectOptions(screen.getByLabelText('Revolutions to integrate'), '0.5');
    await user.click(screen.getByRole('button', { name: /Load reference into candidate/ }));
    await user.click(screen.getByRole('button', { name: /Run candidate/ }));

    expect(screen.getAllByText(/35786\.9\d\d km/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/hypothetical two-body propagation/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not the satellite's real ephemeris/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GOES-16/).length).toBeGreaterThan(0);
    expect(screen.getByText(/No warnings/)).toBeTruthy();
    expect(screen.getByTestId('altitude-chart').textContent).toContain('30,000');
    // The displayed candidate result starts at the exact cached vector, not a
    // circular state at the same radius/speed.
    const viewport = screen.getByTestId('viewport-stub');
    expect(Number(viewport.dataset.firstX)).toBeCloseTo(9603.113140073136, 9);
    expect(Number(viewport.dataset.firstZ)).toBeCloseTo(-170.8594080548074, 9);
  }, 15000);

  it('converts to a circular approximation and retains its source provenance', async () => {
    const user = userEvent.setup();
    renderEarthLab();

    await user.selectOptions(screen.getByLabelText('Revolutions to integrate'), '0.5');
    await user.click(screen.getByRole('button', { name: /Load reference into candidate/ }));
    expect(screen.getByText('Cached reference state')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Convert to circular approximation/ }));

    expect(screen.queryByText('Cached reference state')).toBeNull();
    expect(screen.getByText('Circular approximation')).toBeTruthy();
    expect(screen.getByText('Reference-derived')).toBeTruthy();
    expect(screen.getByText(/original cached vector is retained/)).toBeTruthy();
    expect(screen.getByLabelText(/Initial altitude \(km\)/)).toBeTruthy();
    expect(screen.getByLabelText(/Initial tangential speed \(km\/s\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Load reference into candidate/ })).toBeTruthy();
    expect(screen.getAllByText(/Unrun changes/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Run candidate/ }));

    expect(
      await screen.findByText(/The original provider vector is retained in the record/),
    ).toBeTruthy();
    expect(screen.getByText(/No warnings/)).toBeTruthy();
  }, 20000);

  it('reports an unavailable cached fixture without substituting another target', () => {
    render(
      <ReferencePresetPanel
        preset={null}
        error="Expected exactly one vector row; received 2."
        loadedPresetId={null}
        onLoad={() => undefined}
      />,
    );

    expect(screen.getByText(/cached reference preset is unavailable/)).toBeTruthy();
    expect(screen.getByText(/Expected exactly one vector row; received 2\./)).toBeTruthy();
    expect(screen.getByText(/No different target or synthetic state is substituted/)).toBeTruthy();
    expect(screen.queryByText(/GOES-16/)).toBeNull();
  });
});
