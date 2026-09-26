import { expect, test, type Page } from '@playwright/test'

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `e2e/screenshots/${test.info().project.name}-${name}.png`, fullPage: true })

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, 'page should not scroll horizontally').toBeLessThanOrEqual(1)
}

test('home → example → Loan Cost Report', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.hostname !== 'localhost') external.push(r.url())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Know what your loan REALLY costs.')
  await noHorizontalScroll(page)
  await shot(page, 'home')

  await page.getByRole('button', { name: 'Open this example' }).click()
  await expect(page).toHaveURL(/\/check-loan\/results$/)
  await expect(page.getByRole('region', { name: 'Estimated effective annualized cost' })).toContainText('14.39%')
  await noHorizontalScroll(page)
  await shot(page, 'results')
  // Loan data never goes into the URL, and nothing is sent to other sites.
  expect(page.url()).not.toMatch(/500000|480000|12%/)
  expect(external).toEqual([])
})

test('wizard: enter a flat-rate loan with a fee and see the explanation', async ({ page }) => {
  await page.goto('/check-loan')
  await page.getByRole('textbox', { name: 'Loan amount sanctioned', exact: true }).fill('100000')
  await page.getByRole('textbox', { name: 'Tenure', exact: true }).fill('36')
  await noHorizontalScroll(page)
  await shot(page, 'wizard-step1')
  await page.getByRole('button', { name: 'Next' }).click()

  await page.getByRole('textbox', { name: 'Interest rate quoted by the lender', exact: true }).fill('10')
  await page.getByRole('radio', { name: 'Flat rate' }).click()
  await page.getByRole('button', { name: 'Next' }).click()

  await page.getByRole('button', { name: 'Processing fee' }).first().click()
  await page.getByLabel('Amount', { exact: true }).first().fill('2000')
  await expect(page.getByText('Net amount you receive')).toBeVisible()
  await noHorizontalScroll(page)
  await shot(page, 'wizard-charges')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'See effective cost' }).click()

  const hero = page.getByRole('region', { name: 'Estimated effective annualized cost' })
  await expect(hero).toContainText('10.00%')
  await expect(page.getByText('Why flat rates look cheaper')).toBeVisible()
  await expect(page.getByText('Flat-rate method', { exact: true })).toBeVisible()

  // Deep link reload keeps working (SPA fallback) and the answers were autosaved.
  await page.reload()
  await expect(hero).toContainText('10.00%')
})

test('savings lab slider updates the result', async ({ page }) => {
  await page.goto('/savings')
  await page.getByRole('radio', { name: 'Quick entry' }).click()
  const card = page.locator('#extra')
  await card.getByRole('button', { name: '₹10,000' }).click()
  await expect(card.getByText('Save', { exact: false }).first()).toBeVisible()
  await noHorizontalScroll(page)
  await shot(page, 'savings')
})

test('compare two offers', async ({ page }) => {
  await page.goto('/compare')
  await expect(page.getByRole('table')).toContainText('Estimated effective annualized cost')
  await noHorizontalScroll(page)
  await shot(page, 'compare')
})

test('Hindi core flow', async ({ page }) => {
  await page.goto('/check-loan')
  await page.getByRole('button', { name: /Language: हिंदी/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('मेरा लोन जाँचें')
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
  await noHorizontalScroll(page)
  await shot(page, 'wizard-hindi')
})

for (const path of ['/ask-lender', '/learn', '/learn/flat-vs-reducing', '/rules', '/documents', '/help', '/my-loans', '/about', '/privacy', '/no-such-page']) {
  test(`page ${path} renders without horizontal scroll`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await noHorizontalScroll(page)
    if (path === '/rules' || path === '/ask-lender' || path === '/learn/flat-vs-reducing') await shot(page, path.replaceAll('/', '_'))
  })
}
