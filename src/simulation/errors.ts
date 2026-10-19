/**
 * Typed errors for the simulation core.
 *
 * The physics core must fail loudly and explain why, never return
 * plausible-looking numbers for an invalid or numerically unsafe input.
 */

export type ValidationIssue = {
  /** Field path that failed validation, e.g. 'timestepSeconds'. */
  field: string;
  message: string;
};

export class SimulationInputError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[] = []) {
    super(message);
    this.name = 'SimulationInputError';
    this.issues = issues;
  }
}
