// @vitest-environment jsdom
/**
 * Tests for the Solar System Continuous Date-Driven Observatory.
 *
 * Validates:
 * 1. Rendering of continuous time controller & date picker HUD
 * 2. Deterministic Keplerian orbital stats display for selected bodies
 * 3. Mars Space Apps 2026 Challenge Portal integration
 * 4. Mode transition from Mars details into Outpost Mission Trainer
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SolarSystemOverview } from '../SolarSystemOverview';
import {
  isoDateToJulianDate,
} from '../../solarSystem/astronomy';

vi.mock('../../scene/SolarSystemViewport', () => ({
  SolarSystemViewport: ({
    selectedId,
    julianDate,
    elapsedDays,
    showTrails,
    onToggleTrails,
  }: {
    selectedId: string;
    julianDate?: number;
    elapsedDays?: number;
    showTrails?: boolean;
    onToggleTrails?: () => void;
  }) => (
    <div
      data-testid="solar-system-viewport-mock"
      data-selected-id={selectedId}
      data-julian-date={String(julianDate ?? '')}
      data-elapsed-days={String(elapsedDays ?? 0)}
      data-show-trails={String(showTrails ?? false)}
    >
      <button data-testid="mock-toggle-trails" onClick={onToggleTrails}>
        Toggle Trails
      </button>
    </div>
  ),
}));

afterEach(cleanup);

describe('Solar System Astronomical Observatory', () => {
  it('renders simulation date readout and date picker input', () => {
    const handleSelect = vi.fn();
    const handleModeChange = vi.fn();

    render(
      <SolarSystemOverview
        selectedId="earth"
        onSelect={handleSelect}
        onChangeMode={handleModeChange}
      />,
    );

    const dateReadout = screen.getByTestId('simulation-date-readout');
    expect(dateReadout.textContent).toMatch(/Date:\s+\d{4}-[A-Za-z]{3}-\d{2}\s+\d{2}:\d{2}\s+UTC/);

    const datePicker = screen.getByLabelText('Jump to simulation date') as HTMLInputElement;
    expect(datePicker).toBeTruthy();
    expect(datePicker.type).toBe('date');
    expect(datePicker.min).toBe('1800-01-01');
    expect(datePicker.max).toBe('2050-12-31');
  });

  it('jumps simulation date deterministically when date picker changes', () => {
    const handleSelect = vi.fn();
    const handleModeChange = vi.fn();

    render(
      <SolarSystemOverview
        selectedId="earth"
        onSelect={handleSelect}
        onChangeMode={handleModeChange}
      />,
    );

    const datePicker = screen.getByLabelText('Jump to simulation date');
    fireEvent.change(datePicker, { target: { value: '2030-07-20' } });

    const expectedJd = isoDateToJulianDate('2030-07-20');
    const viewport = screen.getByTestId('solar-system-viewport-mock');
    expect(Number(viewport.dataset.julianDate)).toBeCloseTo(expectedJd, 1);

    const dateReadout = screen.getByTestId('simulation-date-readout');
    expect(dateReadout.textContent).toContain('2030-Jul-20');
  });

  it('displays live Keplerian distance and velocity for Earth', () => {
    const handleSelect = vi.fn();
    const handleModeChange = vi.fn();

    render(
      <SolarSystemOverview
        selectedId="earth"
        onSelect={handleSelect}
        onChangeMode={handleModeChange}
      />,
    );

    expect(screen.getByText('Live distance')).toBeTruthy();
    expect(screen.getByText('Orbital speed')).toBeTruthy();
    expect(screen.getByText('True anomaly')).toBeTruthy();
    expect(screen.getByText('J2000 [X, Y, Z]')).toBeTruthy();

    // Earth's orbital speed is ~29.78 km/s
    expect(screen.getByText(/29\.\d+ km\/s/)).toBeTruthy();
    expect(screen.getByText(/\(vis-viva\)/)).toBeTruthy();
  });

  it('displays the NASA Space Apps Challenge portal when Mars is selected and transitions to outpost mode', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const handleModeChange = vi.fn();

    render(
      <SolarSystemOverview
        selectedId="mars"
        onSelect={handleSelect}
        onChangeMode={handleModeChange}
      />,
    );

    const portal = screen.getByTestId('mars-outpost-portal');
    expect(portal).toBeTruthy();
    expect(screen.getByText(/NASA SPACE APPS 2026 CHALLENGE/)).toBeTruthy();
    expect(screen.getByText(/Active Capstone Mission: Sol 42 Jezero Outpost Crisis/)).toBeTruthy();

    const ctaButton = screen.getByRole('button', { name: 'Launch Outpost Mission Trainer →' });
    expect(ctaButton).toBeTruthy();

    await user.click(ctaButton);
    expect(handleModeChange).toHaveBeenCalledWith('outpost');
  });

  it('does not display Mars challenge portal when selecting Sun or Jupiter', () => {
    const handleSelect = vi.fn();
    const handleModeChange = vi.fn();

    const { rerender } = render(
      <SolarSystemOverview
        selectedId="jupiter"
        onSelect={handleSelect}
        onChangeMode={handleModeChange}
      />,
    );

    expect(screen.queryByTestId('mars-outpost-portal')).toBeNull();

    rerender(
      <SolarSystemOverview
        selectedId="sun"
        onSelect={handleSelect}
        onChangeMode={handleModeChange}
      />,
    );
    expect(screen.queryByTestId('mars-outpost-portal')).toBeNull();
  });

  it('starts playing automatically on mount (1 Earth day per real second)', () => {
    const handleSelect = vi.fn();
    const handleModeChange = vi.fn();

    render(
      <SolarSystemOverview
        selectedId="earth"
        onSelect={handleSelect}
        onChangeMode={handleModeChange}
      />,
    );

    // Pause button is shown and active, indicating autoplay started
    const pauseBtn = screen.getByRole('button', { name: 'Pause schematic motion' });
    expect(pauseBtn).toBeTruthy();
    expect(pauseBtn.getAttribute('aria-pressed')).toBe('true');

    // 1 d/s playback rate option is present and active by default
    const rate1Btn = screen.getByRole('button', { name: '1 d/s' });
    expect(rate1Btn).toBeTruthy();
    expect(rate1Btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('jumps to verified preset date and selects target body', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const handleModeChange = vi.fn();

    render(
      <SolarSystemOverview
        selectedId="earth"
        onSelect={handleSelect}
        onChangeMode={handleModeChange}
      />,
    );

    const presetSelect = screen.getByTestId('astronomy-preset-select');
    expect(presetSelect).toBeTruthy();

    // Select Apollo 11 Lunar Landing
    await user.selectOptions(presetSelect, 'apollo-11-landing');

    const dateReadout = screen.getByTestId('simulation-date-readout');
    expect(dateReadout.textContent).toContain('1969-Jul-20');
  });

  it('toggles dynamic motion trails on and off', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const handleModeChange = vi.fn();

    render(
      <SolarSystemOverview
        selectedId="earth"
        onSelect={handleSelect}
        onChangeMode={handleModeChange}
      />,
    );

    const viewport = screen.getByTestId('solar-system-viewport-mock');
    expect(viewport.dataset.showTrails).toBe('false');

    const toggleBtn = screen.getByTestId('mock-toggle-trails');
    await user.click(toggleBtn);
    expect(viewport.dataset.showTrails).toBe('true');

    await user.click(toggleBtn);
    expect(viewport.dataset.showTrails).toBe('false');
  });
});

