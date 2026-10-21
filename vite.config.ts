import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // The physics core and pure UI logic run in a plain Node environment.
    // Files that need a DOM declare it with a `@vitest-environment jsdom`
    // docblock at the top (see src/app/__tests__/workspace.test.tsx).
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    // DOM flows that run a geostationary candidate integrate several thousand
    // steps; keep the default command stable on constrained/parallel machines
    // without weakening any assertion.
    testTimeout: 15000,
    // This machine launches a fresh fork per test file. Unlimited parallelism
    // has intermittently exceeded the worker-start timeout on Windows; four
    // workers keeps the full suite reproducible without serializing it.
    maxWorkers: 4,
  },
})
