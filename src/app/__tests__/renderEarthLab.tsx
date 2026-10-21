import { fireEvent, render, screen } from '@testing-library/react';

import App from '../../App';

/**
 * Opens the deterministic Earth Orbit Lab from the default Solar System
 * Overview. The overview viewport is stubbed by each WebGL-facing test file.
 */
export function renderEarthLab(): void {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Earth Orbit Lab' }));
}
