import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `e2e/screenshots/${test.info().project.name}-${name}.png`, fullPage: true })

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, 'page should not scroll horizontally').toBeLessThanOrEqual(1)
}

/** Bottom content (footer / sticky bars) must never sit under the mobile tab bar. */
async function clearOfTabBar(page: Page) {
  const bar = page.getByRole('navigation', { name: 'Quick navigation' })
  if (!(await bar.isVisible())) return
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const barTop = (await bar.boundingBox())!.y
  const lastTop = await page.evaluate(() => {
    const els = document.querySelectorAll('footer p')
    const last = els[els.length - 1]
    return last.getBoundingClientRect().bottom
  })
  expect(lastTop, 'footer text should end above the tab bar').toBeLessThanOrEqual(barTop + 1)
}

// Nothing is ever sent to another site: no ads, analytics or trackers, in any test.
const external = new WeakMap<Page, string[]>()
test.beforeEach(({ page }) => {
  const list: string[] = []
  external.set(page, list)
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.hostname !== 'localhost' && u.protocol !== 'data:' && u.protocol !== 'blob:') list.push(r.url())
  })
})
test.afterEach(({ page }) => {
  expect(external.get(page) ?? [], 'requests to other sites').toEqual([])
})

async function openExample(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open this example' }).click()
  await expect(page).toHaveURL(/\/check-loan\/results$/)
}

test('home → example → Loan Cost Report', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Know what your loan REALLY costs.')
  await noHorizontalScroll(page)
  await shot(page, 'home')

  await page.getByRole('button', { name: 'Open this example' }).click()
  await expect(page).toHaveURL(/\/check-loan\/results$/)
  await expect(page.getByRole('region', { name: 'Estimated effective annualized cost' })).toContainText('14.39%')
  await noHorizontalScroll(page)
  await shot(page, 'results')
  await clearOfTabBar(page)
  // Loan data never goes into the URL (other sites are checked in afterEach).
  expect(page.url()).not.toMatch(/500000|480000|12%/)
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

for (const path of ['/learn', '/learn/flat-vs-reducing', '/rules', '/documents', '/help', '/my-loans', '/about', '/privacy', '/no-such-page']) {
  test(`page ${path} renders without horizontal scroll`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await noHorizontalScroll(page)
    await clearOfTabBar(page)
    if (path === '/rules' || path === '/learn/flat-vs-reducing') await shot(page, path.replaceAll('/', '_'))
  })
}

test('dark mode: home and report', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lri.theme', 'dark'))
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await noHorizontalScroll(page)
  await shot(page, 'home-dark')
  await page.getByRole('button', { name: 'Open this example' }).click()
  await expect(page.getByRole('region', { name: 'Estimated effective annualized cost' })).toContainText('14.39%')
  await noHorizontalScroll(page)
  await shot(page, 'results-dark')
})

test('Hindi report, and long Gujarati / long names do not overflow', async ({ page }) => {
  await openExample(page)
  await page.getByRole('button', { name: /Language: हिंदी/ }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
  await expect(page.getByText('14.39%').first()).toBeVisible()
  await noHorizontalScroll(page)
  await shot(page, 'results-hindi')
  // Gujarati UI is not translated yet; this only checks the layout copes with long Gujarati text.
  await page.getByRole('button', { name: 'English' }).click()
  await page.goto('/check-loan')
  await page.getByRole('textbox', { name: /^Lender name/ }).fill('અત્યંતલાંબુનામધરાવતીનાણાકીયસંસ્થાઅનેબેંકિંગકંપની')
  await page.getByRole('textbox', { name: /^Name this calculation/ }).fill('ગુજરાતી લોન ખર્ચ અહેવાલ — વાહન લોન ઓફર ડીલર તરફથી પ્રક્રિયા ફી સાથે')
  await page.goto('/check-loan/results')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ગુજરાતી')
  await noHorizontalScroll(page)
})

test('wizard: inline errors, then a very large loan', async ({ page }) => {
  await page.goto('/check-loan')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Please check the highlighted fields.')).toBeVisible()
  await expect(page.locator('[aria-invalid="true"]').first()).toBeFocused()
  // The primary action stays above the tab bar on phones.
  const bar = page.getByRole('navigation', { name: 'Quick navigation' })
  if (await bar.isVisible()) {
    const next = (await page.getByRole('button', { name: 'Next' }).boundingBox())!
    expect(next.y + next.height).toBeLessThanOrEqual((await bar.boundingBox())!.y + 1)
  }
  await page.getByRole('textbox', { name: 'Loan amount sanctioned', exact: true }).fill('9999999999')
  await page.getByRole('textbox', { name: 'Tenure', exact: true }).fill('360')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('textbox', { name: 'Interest rate quoted by the lender', exact: true }).fill('9.5')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'See effective cost' }).click()
  const hero = page.getByRole('region', { name: 'Estimated effective annualized cost' })
  await expect(hero).toContainText('9.50%')
  await expect(hero).toContainText('₹9,99,99,99,999')
  await noHorizontalScroll(page)
  await shot(page, 'results-large-loan')
})

/** Client-side navigation, like tapping a link (no page reload). */
async function spaGo(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, '', p)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

test('works offline once loaded, and saved loans persist', async ({ page, context }) => {
  await openExample(page)
  // Visit screens once in the same session (the Android app ships these files inside the APK).
  for (const p of ['/my-loans', '/check-loan', '/savings']) {
    await spaGo(page, p)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
  await spaGo(page, '/check-loan/results')
  await context.setOffline(true)
  await page.getByRole('button', { name: /Save to My Loans/ }).click()
  await expect(page.getByRole('button', { name: /Saved to My Loans/ })).toBeVisible()
  await page.locator('a[href="/my-loans"]:visible').first().click()
  await expect(page).toHaveURL(/\/my-loans$/)
  await expect(page.getByText('Illustrative example').first()).toBeVisible()
  await page.locator('a[href="/check-loan"]:visible').first().click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check My Loan')
  // A page never opened before cannot load on the website while offline: show a retry screen, not a blank app.
  await spaGo(page, '/rules')
  await expect(page.getByRole('heading', { name: 'This page could not be loaded' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).or(page.getByRole('navigation', { name: 'Quick navigation' })).first()).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rules & Sources')
  await page.goto('/my-loans')
  await expect(page.getByText('Illustrative example').first()).toBeVisible()
})

test('keyboard: navigation sheet opens, traps focus and closes with Escape', async ({ page }) => {
  await page.goto('/')
  const mobile = await page.getByRole('navigation', { name: 'Quick navigation' }).isVisible()
  const trigger = page.getByRole('button', { name: mobile ? 'More' : 'Menu', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'More' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('link', { name: 'Rules & Sources' })).toBeVisible()
  await shot(page, 'more-sheet')
  await page.keyboard.press('Tab')
  expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('print: collapsed sections are expanded in the PDF', async ({ page, browserName }, info) => {
  test.skip(browserName !== 'chromium' || info.project.name !== 'desktop', 'PDF output is checked once, in desktop Chromium')
  await openExample(page)
  const method = page.locator('#method')
  await expect(method).not.toHaveAttribute('open', '')
  await expect(page.getByText('Compounded effective annual rate (same cash flows)')).toBeHidden()
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByText('Compounded effective annual rate (same cash flows)')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeHidden()
  const pdf = await page.pdf({ format: 'A4' })
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  const dir = mkdtempSync(join(tmpdir(), 'lri-pdf-'))
  writeFileSync(join(dir, 'report.pdf'), pdf)
  let text = ''
  try {
    text = execFileSync('pdftotext', ['-layout', join(dir, 'report.pdf'), '-'], { encoding: 'utf8' })
  } catch {
    test.info().annotations.push({ type: 'note', description: 'pdftotext not installed; PDF text not checked' })
    return
  }
  for (const s of ['Assumptions & method', 'Compounded effective annual rate', 'Questions to ask your lender', 'Rules that may apply', '14.39%']) {
    expect(text, s).toContain(s)
  }
})
