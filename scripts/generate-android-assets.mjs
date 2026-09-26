/**
 * Renders the Android launcher icons and splash screens from the app logo
 * using the Chromium that Playwright already uses for tests.
 *
 *   node scripts/generate-android-assets.mjs
 *
 * Output goes into android/app/src/main/res (committed to git).
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const RES = 'android/app/src/main/res'
const NAVY = '#0b2a5b'
const BG = '#f6f8fb'
const GLYPH = 'M20 18h24M20 28h24M20 18c14 0 14 20 0 20l18 12'

const glyph = (color) =>
  `<path d="${GLYPH}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`

/** Full icon: navy tile with the white ₹-style mark. */
const fullIcon = (round) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${
    round ? `<circle cx="32" cy="32" r="32" fill="${NAVY}"/>` : `<rect width="64" height="64" rx="14" fill="${NAVY}"/>`
  }<g transform="translate(32 34) scale(0.78) translate(-32 -34)">${glyph('#ffffff')}</g></svg>`

/** Adaptive foreground: transparent 108dp canvas, mark inside the 66dp safe zone. */
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><g transform="translate(22 22)">${glyph('#ffffff')}</g></svg>`

/** Splash: light background with a small navy tile in the middle. */
const splash = (w, h) => {
  const s = Math.round(Math.min(w, h) * 0.28)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${BG}"/><svg x="${(w - s) / 2}" y="${(h - s) / 2}" width="${s}" height="${s}" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${NAVY}"/>${glyph('#ffffff')}</svg></svg>`
}

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const SPLASH_PORT = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }

const browser = await chromium.launch()
const page = await browser.newPage()

async function render(svg, w, h, file, transparent = false) {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}</body></html>`,
  )
  const out = join(RES, file)
  mkdirSync(dirname(out), { recursive: true })
  await page.screenshot({ path: out, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } })
}

for (const [d, m] of Object.entries(DENSITIES)) {
  await render(fullIcon(false), 48 * m, 48 * m, `mipmap-${d}/ic_launcher.png`, true)
  await render(fullIcon(true), 48 * m, 48 * m, `mipmap-${d}/ic_launcher_round.png`, true)
  await render(foreground, 108 * m, 108 * m, `mipmap-${d}/ic_launcher_foreground.png`, true)
  const [pw, ph] = SPLASH_PORT[d]
  await render(splash(pw, ph), pw, ph, `drawable-port-${d}/splash.png`)
  await render(splash(ph, pw), ph, pw, `drawable-land-${d}/splash.png`)
}
await render(splash(480, 320), 480, 320, 'drawable/splash.png')
await browser.close()
console.log('Android icons and splash screens written to', RES)
