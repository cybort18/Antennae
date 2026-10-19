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
  },
})
