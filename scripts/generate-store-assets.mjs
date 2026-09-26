/**
 * Renders the Google Play store listing graphics into store/:
 *   - icon-512.png                (512×512, full-bleed; Play rounds the corners)
 *   - feature-graphic-1024x500.png
 *   - screenshots/*.png            (1080×1920 phone screenshots, English + Hindi)
 *
 *   npm run build && node scripts/generate-store-assets.mjs     (or: npm run store:assets)
 *
 * Uses the Chromium that Playwright already uses for tests, and `vite preview`
 * to serve the built app. Screenshots use the app's own built-in example loan,
 * so no invented rates or lender names appear.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { preview } from 'vite'

const OUT = 'store'
const SHOTS = join(OUT, 'screenshots')
const NAVY = '#0b2a5b'
const GLYPH = 'M20 18h24M20 28h24M20 18c14 0 14 20 0 20l18 12'
mkdirSync(SHOTS, { recursive: true })

const font = (weight) =>
  `data:font/woff2;base64,${readFileSync(`node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-${weight}-normal.woff2`).toString('base64')}`
const FONTS = `<style>
  @font-face { font-family: Plex; font-weight: 500; src: url(${font(500)}) format('woff2'); }
  @font-face { font-family: Plex; font-weight: 700; src: url(${font(700)}) format('woff2'); }
  body { margin: 0; font-family: Plex, sans-serif; }
</style>`

const mark = (size, color = '#ffffff') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><g transform="translate(32 34) scale(0.78) translate(-32 -34)"><path d="${GLYPH}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`

const icon = `<div style="width:512px;height:512px;background:${NAVY};display:grid;place-items:center">${mark(400)}</div>`

const feature = `<div style="width:1024px;height:500px;box-sizing:border-box;background:linear-gradient(135deg,${NAVY} 0%,#123f86 100%);color:#fff;display:flex;align-items:center;gap:56px;padding:0 72px">
  <div style="flex:none;width:200px;height:200px;border-radius:44px;background:rgba(255,255,255,0.1);display:grid;place-items:center">${mark(168)}</div>
  <div>
    <div style="font-size:30px;font-weight:500;opacity:0.85;letter-spacing:0.02em">Loan Reality India</div>
    <div style="font-size:58px;font-weight:700;line-height:1.08;margin-top:10px">Know what your loan<br/>REALLY costs</div>
    <div style="font-size:26px;font-weight:500;margin-top:22px;opacity:0.9">Fees, GST, insurance and deductions — in ₹, step by step</div>
  </div>
</div>`

const browser = await chromium.launch()

async function renderHtml(html, width, height, file) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.setContent(`<html><head>${FONTS}</head><body>${html}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(OUT, file), clip: { x: 0, y: 0, width, height } })
  await page.close()
}

await renderHtml(icon, 512, 512, 'icon-512.png')
await renderHtml(feature, 1024, 500, 'feature-graphic-1024x500.png')

// ---- phone screenshots from the built app (360×640 CSS px at 3× = 1080×1920)
const server = await preview({ preview: { port: 4175, strictPort: true }, logLevel: 'warn' })
const base = 'http://localhost:4175'

async function phone(lang) {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true })
  await context.addInitScript((l) => {
    localStorage.setItem('lri.theme', 'light')
    localStorage.setItem('lri.lang', l)
  }, lang)
  const page = await context.newPage()
  return { context, page }
}

async function snap(page, name) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(SHOTS, `${name}.png`) })
  console.log('  ', name)
}

async function openExample(page) {
  await page.goto(base + '/')
  await page.getByRole('button', { name: /Open this example|यह उदाहरण/ }).first().click()
  await page.waitForURL('**/check-loan/results')
  await page.getByText('14.39%').first().waitFor()
}

for (const lang of ['en', 'hi']) {
  const { context, page } = await phone(lang)
  await page.goto(base + '/')
  await page.locator('#main h1').waitFor()
  await snap(page, `${lang}-1-home`)
  await openExample(page)
  await snap(page, `${lang}-2-report`)
  if (lang === 'en') {
    // Put the "Full cost breakdown" card just under the sticky header.
    await page.evaluate(() => {
      const h2 = [...document.querySelectorAll('h2')].find((h) => h.textContent?.includes('Full cost breakdown'))
      if (h2) window.scrollTo(0, h2.getBoundingClientRect().top + window.scrollY - 112)
    })
    await snap(page, 'en-3-cost-breakdown')
    for (const [path, name] of [
      ['/savings', 'en-4-savings-lab'],
      ['/ask-lender', 'en-5-ask-your-lender'],
      ['/learn', 'en-6-learn'],
    ]) {
      await page.goto(base + path)
      await page.locator('#main h1').waitFor()
      await snap(page, name)
    }
  }
  await context.close()
}

await browser.close()
await new Promise((resolve) => server.httpServer.close(resolve))
console.log('Store graphics written to', OUT)
