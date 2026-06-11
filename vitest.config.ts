import { defineConfig } from 'vitest/config'

// Vitest runs the pure calculation-layer unit tests (e.g. src/renderer/src/
// utils/cdf.test.ts). It is deliberately separate from electron-vite: the
// tested modules are framework-free pure functions, so we need neither the
// main/preload/renderer build targets nor a DOM. Playwright owns the E2E
// suite under tests/ (*.spec.ts) and does not overlap with *.test.ts here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/renderer/src/**/*.test.ts'],
  },
})
