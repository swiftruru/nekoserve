import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/screenshots-v5',
  testMatch: '**/*.spec.ts',
  timeout: 360_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results/screenshots-v5',
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
})
