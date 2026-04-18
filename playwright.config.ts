import { defineConfig } from '@playwright/test'

const runRealSmoke = process.env.NEKOSERVE_UI_REAL_SMOKE === '1'

export default defineConfig({
  testDir: './tests/ui',
  testMatch: '**/*.spec.ts',
  grep: runRealSmoke ? /@real/ : undefined,
  grepInvert: runRealSmoke ? undefined : /@real/,
  timeout: runRealSmoke ? 60_000 : 30_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? (runRealSmoke ? 1 : 2) : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  outputDir: 'test-results/playwright',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
})
