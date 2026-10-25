// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../scene/MarsOutpostViewport', () => ({
  MarsOutpostViewport: () => <div data-testid="mars-outpost-viewport-mock" />,
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
    expect(screen.getByText('20.9')).toBeTruthy(); // Cabin O2 %
    expect(screen.getByText('21.0')).toBeTruthy(); // Cabin temp °C
    expect(screen.getByText('0.0')).toBeTruthy(); // Cumulative radiation mSv
  });

  it('steps forward 1 Sol when clicking Advance 1 Sol', () => {
    render(<OutpostMissionPanel />);

    const stepBtn = screen.getByRole('button', { name: /Advance 1 Sol/i });
    fireEvent.click(stepBtn);

    expect(screen.getByText('SOL 1 / 14')).toBeTruthy();
  });

  it('applies power allocation presets correctly', () => {
    render(<OutpostMissionPanel />);

    const conservationBtn = screen.getByRole('button', { name: /Conservation/i });
    fireEvent.click(conservationBtn);

    expect(screen.getByText(/^4\.0\s*kW/)).toBeTruthy(); // Food at 4 kW
    expect(screen.getByText(/Demand: 34\.0 kW/)).toBeTruthy();
  });

  it('runs scenario and displays mission debrief when clicking Run Scenario', () => {
    render(<OutpostMissionPanel />);

    const runBtn = screen.getByRole('button', { name: /Run Scenario/i });
    fireEvent.click(runBtn);

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
});
