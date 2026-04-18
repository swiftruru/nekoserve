import { expect, test, type Page } from '@playwright/test'
import { launchNekoServe, runSimulation } from './helpers/electronApp'

async function setPlaybackTime(page: Page, value: number) {
  await page.locator('[data-testid="playback-scrubber"]').evaluate((element: Element, nextValue: number) => {
    const input = element as HTMLInputElement
    input.value = String(nextValue)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

test('controls playback transport and toggles the learning overlay', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await runSimulation(page)

    await expect(page.locator('[data-testid="playback-page"]')).toBeVisible()
    await expect(page.locator('[data-testid="playback-current-event"]')).not.toHaveText('')

    await page.locator('[data-testid="playback-play-toggle"]').click()

    await setPlaybackTime(page, 0)
    await expect(page.locator('[data-testid="playback-sim-clock"]')).toHaveText('00:00')

    const initialEvent = (await page.locator('[data-testid="playback-current-event"]').textContent()) ?? ''

    await page.locator('[data-testid="playback-step-next"]').click()
    await expect(page.locator('[data-testid="playback-sim-clock"]')).not.toHaveText('00:00')
    await expect(page.locator('[data-testid="playback-current-event"]')).not.toHaveText(initialEvent)

    await page.locator('[data-testid="playback-step-prev"]').click()
    await expect(page.locator('[data-testid="playback-sim-clock"]')).toHaveText('00:00')

    await page.locator('[data-testid="playback-speed-8"]').click()
    await expect(page.locator('[data-testid="playback-speed-8"]')).toHaveAttribute('aria-pressed', 'true')

    await page.locator('[data-testid="playback-learning-toggle"]').click()
    await expect(page.locator('[data-testid="playback-learning-overlay"]')).toBeVisible()
    await expect(page.locator('[data-testid="playback-learning-level-expert"]')).toHaveAttribute('aria-pressed', 'true')

    await page.locator('[data-testid="playback-learning-level-friendly"]').click()
    await expect(page.locator('[data-testid="playback-learning-level-friendly"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-testid="playback-learning-level-expert"]')).toHaveAttribute('aria-pressed', 'false')

    await page.locator('[data-testid="playback-learning-close"]').click()
    await expect(page.locator('[data-testid="playback-learning-overlay"]')).toHaveCount(0)
  } finally {
    await close()
  }
})
