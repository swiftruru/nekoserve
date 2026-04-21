import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/screenshots-v2',
  testMatch: '**/*.spec.ts',
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results/screenshots-v2',
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
})
