// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../scene/MarsOutpostViewport', () => ({
  MarsOutpostViewport: () => <div data-testid="mars-outpost-viewport-mock" />,
}));

vi.mock('../../scene/MoonOutpostViewport', () => ({
  MoonOutpostViewport: () => <div data-testid="moon-outpost-viewport-mock" />,
}));

import { OutpostMissionPanel } from '../outpost/OutpostMissionPanel';
import App from '../../App';

describe('OutpostMissionPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('lands on Outpost Mission Trainer as the default App initial landing mode', () => {
    render(<App />);
    expect(screen.getByText('NASA JUNIOR ASTRONAUT ACADEMY')).toBeTruthy();
    expect(screen.getByText('Sol 42: The Jezero Outpost Crisis')).toBeTruthy();
  });

  it('renders initial scenario briefing and Sol 0 pre-flight status', () => {
    render(<OutpostMissionPanel />);

    expect(screen.getByText('NASA JUNIOR ASTRONAUT ACADEMY')).toBeTruthy();
    expect(screen.getByText('Sol 42: The Jezero Outpost Crisis')).toBeTruthy();
    expect(screen.getByText('PRE-FLIGHT (SOL 0)')).toBeTruthy();
    expect(screen.getByText('CABIN O2')).toBeTruthy();
    expect(screen.getByText('RADIATION')).toBeTruthy();
    expect(screen.getByText('CROP HEALTH')).toBeTruthy();
    expect(screen.getByText('BATTERY STORAGE')).toBeTruthy();
  });

  it('steps forward 1 Sol when clicking Advance 1 Sol', () => {
    render(<OutpostMissionPanel />);

    const stepBtn = screen.getByRole('button', { name: /Advance 1 Sol/i });
    fireEvent.click(stepBtn);

    expect(screen.getByText('SOL 1 / 14')).toBeTruthy();
  });

  it('applies power allocation presets correctly', () => {
    render(<OutpostMissionPanel />);

    const conservationBtn = screen.getByRole('button', { name: /Dust Storm Conservation/i });
    fireEvent.click(conservationBtn);

    expect(screen.getByText(/Demanded:\s*34\.0\s*kW/)).toBeTruthy();
  });

  it('runs scenario through tactical dilemmas and displays mission debrief upon completion', () => {
    render(<OutpostMissionPanel />);

    // Apply conservation preset so outpost survives the dust storm to reach dilemmas
    const conservationBtn = screen.getByRole('button', { name: /Dust Storm Conservation/i });
    fireEvent.click(conservationBtn);

    // Click Run Scenario; should pause at Sol 5 for interactive dilemma
    const runBtn = screen.getByRole('button', { name: /Run Scenario/i });
    fireEvent.click(runBtn);

    expect(screen.getByText(/COMMAND DILEMMA · SOL 5/i)).toBeTruthy();

    // Resolve Sol 5 dilemma
    const option1 = screen.getByRole('button', { name: /Deploy 2 Astronauts for Rapid EVA Sweep/i });
    fireEvent.click(option1);

    // Continue running to Sol 7 dilemma
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario/i }));
    expect(screen.getByText(/COMMAND DILEMMA · SOL 7/i)).toBeTruthy();

    // Resolve Sol 7 dilemma
    const option2 = screen.getByRole('button', { name: /Isolate Pod B & Conserve Life Support/i });
    fireEvent.click(option2);

    // Complete remaining Sols
    fireEvent.click(screen.getByRole('button', { name: /Run Scenario/i }));

    expect(screen.getByRole('status', { name: 'Mission Evaluation Outcome' })).toBeTruthy();
    expect(screen.getByText(/NASA Flight Director Debrief:/i)).toBeTruthy();
  });

  it('resets back to Sol 0 pre-flight state when clicking Reset', () => {
    render(<OutpostMissionPanel />);

    // Step first
    const stepBtn = screen.getByRole('button', { name: /Advance 1 Sol/i });
    fireEvent.click(stepBtn);
    expect(screen.getByText('SOL 1 / 14')).toBeTruthy();

    // Reset
    const resetBtn = screen.getByRole('button', { name: /Reset Sol 0/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText('PRE-FLIGHT (SOL 0)')).toBeTruthy();
  });

  it('switches scenario to Artemis Moon Outpost when selecting Moon tab', () => {
    render(<OutpostMissionPanel />);

    const moonTab = screen.getByRole('tab', { name: /Moon/i });
    fireEvent.click(moonTab);

    expect(screen.getByText(/The Shackleton Endurance/i)).toBeTruthy();
    expect(screen.getAllByText(/LUNAR CYCLE/i).length).toBeGreaterThanOrEqual(1);
  });

  it('opens and closes the Junior Astronaut briefing modal', () => {
    render(<OutpostMissionPanel />);

    const guideBtn = screen.getByRole('button', { name: /Mission Guide/i });
    fireEvent.click(guideBtn);

    expect(screen.getByText(/Outpost Commander Briefing & Survival Guide/i)).toBeTruthy();

    const closeBtn = screen.getByRole('button', { name: /Close briefing/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Outpost Commander Briefing & Survival Guide/i)).toBeNull();
  });

  it('toggles sound mute state', () => {
    render(<OutpostMissionPanel />);

    const muteBtn = screen.getByRole('button', { name: /Mute sound effects/i });
    expect(muteBtn).toBeTruthy();

    fireEvent.click(muteBtn);
    expect(screen.getByRole('button', { name: /Unmute sound effects/i })).toBeTruthy();
  });
});

