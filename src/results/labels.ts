/**
 * Human-readable labels for engine identifiers and warning codes.
 * The messages from the engine are always shown verbatim as well; these strings
 * only summarise the code.
 */

import type { IntegratorId, SimulationModelId, SimulationWarningCode } from '../simulation';

export function describeModel(model: SimulationModelId): string {
  switch (model) {
    case 'two-body-central':
      return 'Two-body point-mass gravity (simplified)';
    default:
      return model;
  }
}

export function describeIntegrator(integrator: IntegratorId): string {
  switch (integrator) {
    case 'leapfrog-kick-drift-kick':
      return 'Fixed-step kick-drift-kick leapfrog (velocity Verlet)';
    default:
      return integrator;
  }
}

export function describeWarning(code: SimulationWarningCode): string {
  switch (code) {
    case 'IMPACT_RADIUS_REACHED':
      return 'Reached the impact radius';
    case 'UNSAFE_SEPARATION':
      return 'Separation below the numeric floor';
    case 'NON_FINITE_STATE':
      return 'Non-finite state';
    case 'ENERGY_DEVIATION_UNSTABLE':
      return 'Energy deviation unstable';
    case 'COARSE_TIMESTEP_ADVISORY':
      return 'Coarse timestep advisory';
    default:
      return code;
  }
}

export function warningTone(code: SimulationWarningCode): 'warn' | 'danger' {
  return code === 'COARSE_TIMESTEP_ADVISORY' ? 'warn' : 'danger';
}
