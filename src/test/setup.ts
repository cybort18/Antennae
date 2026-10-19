/**
 * Shared test setup.
 *
 * Vitest 5 does not enable React act() support automatically, and React logs a
 * warning if the environment is not marked as act-capable for testing-library
 * renders.
 */
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export {};
