import { expect, test, type Page } from '@playwright/test'
import { launchNekoServe } from './helpers/electronApp'

async function setRangeValue(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((element: Element, nextValue: number) => {
    const input = element as HTMLInputElement
    input.value = String(nextValue)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

test('renders the How It Works page, toggles learning level, and drives the first demo', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await page.locator('[data-testid="nav-tab-howitworks"]').click()

    await expect(page.locator('[data-testid="nav-tab-howitworks"]')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('[data-testid="howitworks-page"]')).toBeVisible()

    await expect(page.locator('[data-testid="howitworks-level-expert"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-testid="howitworks-fel-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="howitworks-section1-code-toggle"]')).toBeVisible()

    await page.locator('[data-testid="howitworks-section1-code-toggle"]').click()
    await expect(page.locator('[data-testid="howitworks-section1-code-panel"]')).toBeVisible()

    await expect(page.locator('[data-testid="howitworks-fel-clock"]')).toContainText('0.0')
    await page.locator('[data-testid="howitworks-fel-next"]').click()
    await page.locator('[data-testid="howitworks-fel-next"]').click()
    await page.locator('[data-testid="howitworks-fel-next"]').click()
    await expect(page.locator('[data-testid="howitworks-fel-clock"]')).toContainText('0.3')

    await page.locator('[data-testid="howitworks-fel-reset"]').click()
    await expect(page.locator('[data-testid="howitworks-fel-clock"]')).toContainText('0.0')

    await page.locator('[data-testid="howitworks-level-friendly"]').click()
    await expect(page.locator('[data-testid="howitworks-level-friendly"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-testid="howitworks-level-expert"]')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('[data-testid="howitworks-fel-demo"]')).toBeVisible()
    await expect(page.locator('[data-testid="howitworks-fel-list"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="howitworks-section1-code-toggle"]')).toHaveCount(0)
  } finally {
    await close()
  }
})

test('runs the patience race demo to a deterministic seat-win outcome', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await page.locator('[data-testid="nav-tab-howitworks"]').click()

    const patienceDemo = page.locator('[data-testid="howitworks-patience-demo"]')
    await patienceDemo.scrollIntoViewIfNeeded()
    await expect(patienceDemo).toBeVisible()

    await setRangeValue(page, '[data-testid="howitworks-patience-seat-speed"]', 100)
    await setRangeValue(page, '[data-testid="howitworks-patience-value"]', 100)

    await page.locator('[data-testid="howitworks-patience-start"]').click()
    await expect(page.locator('[data-testid="howitworks-patience-racing"]')).toBeVisible()
    await expect(page.locator('[data-testid="howitworks-patience-result"]')).toHaveAttribute('data-state', 'seatWon', { timeout: 4000 })

    await page.locator('[data-testid="howitworks-patience-reset"]').click()
    await expect(page.locator('[data-testid="howitworks-patience-result"]')).toHaveCount(0)
  } finally {
    await close()
  }
})

test('updates the CI explorer stats and hides expert-only sensitivity content in friendly mode', async () => {
  const { page, close } = await launchNekoServe()

  try {
    await page.locator('[data-testid="nav-tab-howitworks"]').click()

    const ciDemo = page.locator('[data-testid="howitworks-ci-demo"]')
    await ciDemo.scrollIntoViewIfNeeded()
    await expect(ciDemo).toBeVisible()
    await expect(page.locator('[data-testid="howitworks-ci-sensitivity"]')).toBeVisible()

    const initialStats = await page.locator('[data-testid="howitworks-ci-stats"]').textContent()

    await setRangeValue(page, '[data-testid="howitworks-ci-sample-size"]', 40)
    await page.locator('[data-testid="howitworks-ci-conf-99"]').click()

    await expect(page.locator('[data-testid="howitworks-ci-conf-99"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-testid="howitworks-ci-stats"]')).not.toHaveText(initialStats ?? '')

    await page.locator('[data-testid="howitworks-level-friendly"]').click()
    await expect(page.locator('[data-testid="howitworks-level-friendly"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-testid="howitworks-ci-sensitivity"]')).toHaveCount(0)
  } finally {
    await close()
  }
})
