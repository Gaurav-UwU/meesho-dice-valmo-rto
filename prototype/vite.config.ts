import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts', 'src/domain/**/*.ts', 'api/_lib/**/*.ts', 'scripts/lib/**/*.ts'],
      // Thin adapters that talk to Supabase and process.env are covered by the live test, not unit tests.
      exclude: ['**/*.test.ts', '**/testkit.ts', 'api/_lib/supabaseDb.ts', 'api/_lib/runtime.ts'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
})
