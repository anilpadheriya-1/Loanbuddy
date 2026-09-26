#!/usr/bin/env node
/**
 * Android checks on an emulator: ads, consent, offline and lifecycle.
 *
 * Run by .github/workflows/android.yml inside reactivecircus/android-emulator-runner:
 *
 *   APK=loan-reality-india-debug.apk OUT=android-check node scripts/android-check.mjs
 *
 * Installs the debug APK (Google test ads only) and walks through the cases in
 * CASES below. The app's WebView is driven over the Chrome DevTools protocol
 * (debug builds allow WebView debugging); the native banner is read from
 * `dumpsys activity top`. Writes screenshots, results.json and summary.md to OUT
 * and exits 1 if any case fails. Needs Node 22+ (global WebSocket and fetch).
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PKG = 'com.loanrealityindia.app'
const APK = process.env.APK ?? 'loan-reality-india-debug.apk'
const OUT = process.env.OUT ?? 'android-check'
const AD_VIEW = 'com.google.android.gms.ads.AdView'
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8', maxBuffer: 64 << 20 })
const shell = (cmd) => adb('shell', cmd)
const tryShell = (cmd) => spawnSync('adb', ['shell', cmd], { encoding: 'utf8' }).stdout ?? ''

// ---------------------------------------------------------------- device helpers

function pid() {
  return tryShell(`pidof ${PKG}`).trim().split(/\s+/)[0] ?? ''
}
function forceStop() {
  shell(`am force-stop ${PKG}`)
}
function launch() {
  shell(`am start -W -n ${PKG}/.MainActivity`)
}
function clearApp() {
  forceStop()
  shell(`pm clear ${PKG}`)
}
function key(name) {
  shell(`input keyevent ${name}`)
}
function tap(x, y) {
  shell(`input tap ${Math.round(x)} ${Math.round(y)}`)
}
function logcatClear() {
  adb('logcat', '-c')
}
function logcat() {
  return adb('logcat', '-d')
}
function countLog(text) {
  return logcat()
    .split('\n')
    .filter((l) => l.includes(text)).length
}

let shot = 0
function screenshot(name) {
  const file = `${String(++shot).padStart(2, '0')}-${name}.png`
  writeFileSync(join(OUT, file), execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 }))
  return file
}

function networkUp() {
  return !/Active default network: none/.test(tryShell('dumpsys connectivity'))
}
/** Airplane mode switches every radio; Wi-Fi and data come back when it is turned off. */
async function setNetwork(on) {
  shell(`cmd connectivity airplane-mode ${on ? 'disable' : 'enable'}`)
}
async function waitNetwork(on, timeout = 30000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (networkUp() === on) return
    await sleep(500)
  }
  throw new Error(`network did not turn ${on ? 'on' : 'off'}`)
}

/** Native views of our activity with absolute screen rects, from `dumpsys activity top`. */
function views() {
  const out = shell('dumpsys activity top')
  const at = out.indexOf(`ACTIVITY ${PKG}/`)
  if (at < 0) return []
  const rest = out.slice(at + 1)
  const end = rest.search(/\n\s*ACTIVITY /)
  const block = end < 0 ? rest : rest.slice(0, end)
  const re = /^(\s*)([\w.$]+)\{[0-9a-f]+ ([VIG.])\S* \S+ (-?\d+),(-?\d+)-(-?\d+),(-?\d+)/
  const stack = []
  const nodes = []
  for (const line of block.split('\n')) {
    const m = re.exec(line)
    if (!m) continue
    const depth = m[1].length
    while (stack.length && stack.at(-1).depth >= depth) stack.pop()
    const parent = stack.at(-1) ?? { x: 0, y: 0, visible: true }
    const [l, t, r, b] = m.slice(4, 8).map(Number)
    const node = { cls: m[2], depth, x: parent.x + l, y: parent.y + t, w: r - l, h: b - t, visible: parent.visible && m[3] === 'V' }
    stack.push(node)
    nodes.push(node)
  }
  return nodes
}

function nativeLayout() {
  const nodes = views()
  const webview = nodes.find((n) => /CapacitorWebView|android\.webkit\.WebView/.test(n.cls))
  const banners = nodes.filter((n) => n.cls === AD_VIEW && n.visible && n.h > 0)
  return { webview, banner: banners[0] ?? null, bannerCount: banners.length }
}

async function waitBanner(present, timeout = 30000) {
  const deadline = Date.now() + timeout
  let last
  while (Date.now() < deadline) {
    last = nativeLayout()
    if (!!last.banner === present) return last
    await sleep(700)
  }
  throw new Error(`banner ${present ? 'did not appear' : 'still visible'} after ${timeout / 1000}s`)
}

function uiDump() {
  tryShell('uiautomator dump /sdcard/ui.xml')
  return tryShell('cat /sdcard/ui.xml')
}
function findText(xml, re) {
  for (const [node] of xml.matchAll(/<node [^>]*>/g)) {
    const text = /text="([^"]*)"/.exec(node)?.[1] ?? ''
    const desc = /content-desc="([^"]*)"/.exec(node)?.[1] ?? ''
    if (!re.test(text.trim()) && !re.test(desc.trim())) continue
    const b = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node)
    if (b) return { text: text || desc, x: (+b[1] + +b[3]) / 2, y: (+b[2] + +b[4]) / 2 }
  }
  return null
}
async function waitText(re, timeout = 30000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const hit = findText(uiDump(), re)
    if (hit) return hit
    await sleep(1000)
  }
  return null
}

// ---------------------------------------------------------------- WebView (CDP)

class Page {
  static async connect(timeout = 45000) {
    const deadline = Date.now() + timeout
    let lastError
    while (Date.now() < deadline) {
      try {
        const p = pid()
        if (!p) throw new Error('app is not running')
        adb('forward', 'tcp:9222', `localabstract:webview_devtools_remote_${p}`)
        const targets = await (await fetch('http://127.0.0.1:9222/json')).json()
        const target = targets.find((t) => t.type === 'page' && /^https?:\/\/localhost/.test(t.url))
        if (!target) throw new Error('app page not found')
        const page = new Page(target.webSocketDebuggerUrl)
        await page.open()
        await page.waitFor(`!!document.querySelector('#main h1')`, 20000, 'the first page')
        return page
      } catch (e) {
        lastError = e
        await sleep(700)
      }
    }
    throw new Error(`could not attach to the app WebView: ${lastError?.message}`)
  }
  constructor(url) {
    this.url = url
    this.seq = 0
    this.pending = new Map()
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)
      this.ws.onopen = () => resolve()
      this.ws.onerror = () => reject(new Error('DevTools socket error'))
      this.ws.onmessage = (m) => {
        const msg = JSON.parse(String(m.data))
        const p = this.pending.get(msg.id)
        if (!p) return
        this.pending.delete(msg.id)
        if (msg.error) p.reject(new Error(msg.error.message))
        else p.resolve(msg.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.seq
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      setTimeout(() => this.pending.delete(id) && reject(new Error(`${method} timed out`)), 15000)
    })
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  async waitFor(expression, timeout = 20000, label = expression) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      try {
        const v = await this.eval(expression)
        if (v) return v
      } catch {
        // page busy or navigating
      }
      await sleep(300)
    }
    throw new Error(`timed out waiting for ${label}`)
  }
  close() {
    try {
      this.ws.close()
    } catch {
      // already closed
    }
  }
}

const adState = (page) => page.eval('window.__lriAds ? window.__lriAds.state() : null')
const adHeight = (page) => page.eval(`getComputedStyle(document.documentElement).getPropertyValue('--ad-height').trim()`)
const rootPadding = (page) => page.eval(`getComputedStyle(document.querySelector('#root > div')).paddingBottom`)
const h1 = (page) => page.eval(`document.querySelector('#main h1')?.textContent ?? ''`)

async function go(page, path) {
  await page.eval(`(() => {
    const a = document.querySelector('a[href="${path}"]')
    if (a) { a.click(); return }
    history.pushState({}, '', '${path}')
    dispatchEvent(new PopStateEvent('popstate'))
  })()`)
  await page.waitFor(`location.pathname === '${path}' && !!document.querySelector('#main h1')`, 20000, `route ${path}`)
  await sleep(1200) // lazy route + ad state settle
}

async function openExample(page) {
  await go(page, '/')
  await page.eval(`[...document.querySelectorAll('button')].find(b => /Open this example/.test(b.textContent)).click()`)
  await page.waitFor(`location.pathname === '/check-loan/results' && document.body.innerText.includes('14.39%')`, 20000, 'example report with 14.39%')
  await sleep(1200)
}

/** Chromium writes localStorage to disk a few seconds after a change; wait before killing the app. */
const STORAGE_FLUSH_MS = 8000

/** The last footer line must end above the banner, and the banner above the navigation bar. */
async function checkClearance(page) {
  await page.eval('window.scrollTo(0, document.documentElement.scrollHeight)')
  await sleep(800)
  const r = await page.eval(`(() => {
    const ps = document.querySelectorAll('footer p')
    const b = ps[ps.length - 1].getBoundingClientRect()
    const inset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0
    return { bottom: b.bottom, dpr: devicePixelRatio, inset, innerHeight }
  })()`)
  const { webview, banner } = nativeLayout()
  if (!webview) throw new Error('app WebView not found in the view tree')
  const footerBottom = webview.y + r.bottom * r.dpr
  const detail = { footerBottom: Math.round(footerBottom), bannerTop: banner?.y ?? null }
  if (banner && footerBottom > banner.y + 2) throw new Error(`footer text (bottom ${Math.round(footerBottom)}px) is under the banner (top ${banner.y}px)`)
  if (banner) {
    const navTop = webview.y + (r.innerHeight - r.inset) * r.dpr
    if (banner.y + banner.h > navTop + 2) throw new Error(`banner (bottom ${banner.y + banner.h}px) overlaps the navigation bar (top ${Math.round(navTop)}px)`)
  }
  return detail
}

// ---------------------------------------------------------------- cases

const results = []
let page = null

async function attach() {
  page?.close()
  page = await Page.connect()
  return page
}

async function freshStart({ online }) {
  clearApp()
  await setNetwork(online)
  await waitNetwork(online)
  logcatClear()
  launch()
  return attach()
}

const CASES = [
  [
    'Fresh install + internet',
    async () => {
      await freshStart({ online: true })
      await page.waitFor(`document.body.innerText.includes('Know what your loan')`, 20000, 'home page')
      await page.waitFor(`(() => { const s = window.__lriAds?.state(); return s && s.phase === 'ready' && s.bannerVisible })()`, 60000, 'ads ready')
      const layout = await waitBanner(true, 45000)
      if (layout.bannerCount !== 1) throw new Error(`${layout.bannerCount} banners`)
      const h = await adHeight(page)
      if (h === '0px') throw new Error('no space reserved for the visible banner')
      const clearance = await checkClearance(page)
      return { banner: `${layout.banner.w}×${layout.banner.h}px at y=${layout.banner.y}`, adHeight: h, ...clearance, screenshot: screenshot('fresh-online-home') }
    },
  ],
  [
    'Fixed bottom UI: no banner on forms; results footer clear of it',
    async () => {
      await go(page, '/check-loan')
      await waitBanner(false, 10000)
      if ((await adHeight(page)) !== '0px') throw new Error('space still reserved on /check-loan')
      const s1 = screenshot('check-loan-no-banner')
      await go(page, '/ask-lender')
      await waitBanner(false, 10000)
      const s2 = screenshot('ask-lender-no-banner')
      await openExample(page)
      await waitBanner(true, 30000)
      const clearance = await checkClearance(page)
      return { ...clearance, screenshots: [s1, s2, screenshot('results-banner-clear')] }
    },
  ],
  [
    'Android back',
    async () => {
      await go(page, '/')
      await waitBanner(true, 20000)
      await go(page, '/check-loan')
      await waitBanner(false, 10000)
      key('KEYCODE_BACK')
      await page.waitFor(`location.pathname === '/'`, 10000, 'back to Home')
      await waitBanner(true, 20000)
      return { screenshot: screenshot('back-to-home') }
    },
  ],
  [
    'Background → foreground',
    async () => {
      const before = await page.eval('location.pathname')
      logcatClear()
      key('KEYCODE_HOME')
      await sleep(2500)
      launch()
      await attach()
      await sleep(2000)
      const after = await page.eval('location.pathname')
      if (after !== before) throw new Error(`screen changed from ${before} to ${after}`)
      const layout = await waitBanner(true, 20000)
      if (layout.bannerCount !== 1) throw new Error(`${layout.bannerCount} banners`)
      const created = countLog('[ads] createBanner')
      if (created > 0) throw new Error(`banner was re-created ${created}× (should be reused)`)
      return { path: after, screenshot: screenshot('foreground') }
    },
  ],
  [
    'Rotation',
    async () => {
      const portrait = (await waitBanner(true, 20000)).banner
      shell('settings put system accelerometer_rotation 0')
      shell('settings put system user_rotation 1')
      try {
        await sleep(3000)
        // The adaptive banner must be re-created for the wider landscape screen.
        const land = await (async () => {
          const deadline = Date.now() + 40000
          while (Date.now() < deadline) {
            const l = nativeLayout()
            if (l.banner && l.webview && l.webview.w > l.webview.h && l.banner.w > portrait.w && l.bannerCount === 1) return l
            await sleep(800)
          }
          throw new Error(`no landscape-width banner (portrait banner was ${portrait.w}px wide)`)
        })()
        const s = screenshot('landscape')
        await checkClearance(page)
        return { portrait: `${portrait.w}px`, landscape: `${land.banner.w}px banner on ${land.webview.w}px screen`, screenshot: s }
      } finally {
        shell('settings put system user_rotation 0')
        await sleep(3000)
        await waitBanner(true, 30000).catch(() => {})
      }
    },
  ],
  [
    'Internet → offline',
    async () => {
      await go(page, '/')
      await waitBanner(true, 20000)
      await setNetwork(false)
      await waitNetwork(false)
      await page.waitFor('navigator.onLine === false', 15000, 'WebView offline')
      await waitBanner(false, 15000)
      await page.waitFor(`getComputedStyle(document.documentElement).getPropertyValue('--ad-height').trim() === '0px'`, 5000, 'ad space released')
      const s = await adState(page)
      if (s?.phase !== 'offline') throw new Error(`phase ${s?.phase}`)
      if ((await rootPadding(page)) !== '0px') throw new Error('bottom gap left behind')
      return { phase: s.phase, screenshot: screenshot('went-offline') }
    },
  ],
  [
    'Offline → internet (5 quick toggles)',
    async () => {
      logcatClear()
      // Flap on the device itself (no adb round trips): on/off five times, then on.
      shell(
        "for i in 1 2 3 4 5; do cmd connectivity airplane-mode disable; sleep 0.3; cmd connectivity airplane-mode enable; sleep 0.3; done; cmd connectivity airplane-mode disable",
      )
      await waitNetwork(true)
      await waitBanner(true, 60000)
      await sleep(3000)
      const created = countLog('[ads] createBanner')
      if (created !== 1) throw new Error(`createBanner ran ${created}× (expected exactly 1)`)
      return { createBanner: created, screenshot: screenshot('back-online') }
    },
  ],
  [
    'Low-memory restart (process killed in background)',
    async () => {
      await go(page, '/check-loan')
      await page.eval(`(() => {
        const el = document.getElementById('sanctionedAmount')
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '500000')
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.blur()
      })()`)
      await sleep(2000) // autosave debounce
      key('KEYCODE_HOME')
      await sleep(STORAGE_FLUSH_MS)
      const before = pid()
      shell(`am kill ${PKG}`)
      await sleep(1500)
      if (pid() === before) tryShell(`run-as ${PKG} kill -9 ${before}`)
      await sleep(1000)
      if (pid() === before) throw new Error('could not kill the background process')
      logcatClear()
      launch()
      await attach()
      await go(page, '/check-loan')
      const value = await page.eval(`document.getElementById('sanctionedAmount')?.value ?? ''`)
      if (value.replace(/\D/g, '') !== '500000') throw new Error(`draft not restored (loan amount "${value}")`)
      await sleep(3000)
      const inits = countLog('[ads] initSdk')
      if (inits !== 1) throw new Error(`initSdk ran ${inits}×`)
      return { restored: value, initSdk: inits, screenshot: screenshot('restored-after-kill') }
    },
  ],
  [
    'Fresh install + no internet',
    async () => {
      await freshStart({ online: false })
      await page.waitFor(`document.body.innerText.includes('Know what your loan')`, 20000, 'home page')
      await page.waitFor(`window.__lriAds?.state().phase === 'offline'`, 20000, 'ads offline')
      const shots = [screenshot('offline-home')]
      await openExample(page)
      shots.push(screenshot('offline-example-report'))
      await go(page, '/ask-lender')
      const ask = await h1(page)
      if (!/full loan details/i.test(ask)) throw new Error(`Ask Your Lender heading: "${ask}"`)
      shots.push(screenshot('offline-ask-lender'))
      await go(page, '/learn')
      const learn = await h1(page)
      if (!/Learn/.test(learn)) throw new Error(`Learn heading: "${learn}"`)
      shots.push(screenshot('offline-learn'))
      const { banner } = nativeLayout()
      if (banner) throw new Error('a banner is showing offline')
      if ((await adHeight(page)) !== '0px' || (await rootPadding(page)) !== '0px') throw new Error('space reserved for an ad offline')
      return { screenshots: shots }
    },
  ],
  [
    'Consent required (EEA debug geography)',
    async () => {
      await freshStart({ online: true })
      // Google's consent SDK prints the device's hashed ID for its debug settings.
      await sleep(5000)
      const hashed = /addTestDeviceHashedId\("([0-9A-Fa-f]+)"\)/.exec(logcat())?.[1] ?? ''
      await page.eval(`localStorage.setItem('lri.debug.adsGeography', 'EEA'); localStorage.setItem('lri.debug.adsTestDevices', '${hashed}')`)
      await sleep(STORAGE_FLUSH_MS)
      forceStop()
      logcatClear()
      launch()
      const accept = await waitText(/^Consent$/i, 45000)
      if (!accept) throw new Error('the consent form did not appear')
      const s1 = screenshot('consent-form')
      tap(accept.x, accept.y)
      await attach()
      await waitBanner(true, 45000)
      const s = await adState(page)
      return { hashedDeviceId: hashed || '(emulator default)', status: s?.consent?.status, screenshots: [s1, screenshot('consent-given-banner')] }
    },
  ],
  [
    'Consent already given',
    async () => {
      forceStop()
      launch()
      await attach()
      const form = await waitText(/^Consent$/i, 8000)
      if (form) throw new Error('the consent form was shown again')
      await waitBanner(true, 45000)
      return { screenshot: screenshot('consent-remembered') }
    },
  ],
  [
    'User changes privacy choices',
    async () => {
      await go(page, '/privacy')
      await page.waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Ad privacy choices'))`, 15000, 'Ad privacy choices button')
      await page.eval(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Ad privacy choices')).click()`)
      const refuse = await waitText(/^Do not consent$/i, 30000)
      if (!refuse) throw new Error('the privacy options form did not open')
      const s1 = screenshot('privacy-options-form')
      tap(refuse.x, refuse.y)
      await sleep(4000)
      await attach()
      const title = await page.eval('document.title')
      if (!title) throw new Error('app not responsive after the form')
      const s = await adState(page)
      const { banner } = nativeLayout()
      const canRequest = s?.consent?.canRequestAds === true
      if (!canRequest && banner) throw new Error('banner still showing although consent no longer allows ads')
      if (canRequest && s.phase === 'ready' && !banner) await waitBanner(true, 30000)
      return { canRequestAds: canRequest, phase: s?.phase, screenshots: [s1, screenshot('privacy-choice-applied')] }
    },
  ],
]

// ---------------------------------------------------------------- run

async function main() {
  adb('wait-for-device')
  shell('settings put global window_animation_scale 0')
  shell('settings put global transition_animation_scale 0')
  shell('settings put global animator_duration_scale 0')
  adb('install', '-r', '-g', APK)
  shell('svc wifi enable')
  shell('svc data enable')
  await setNetwork(true)

  for (const [name, fn] of CASES) {
    const started = Date.now()
    try {
      const detail = await fn()
      results.push({ name, ok: true, seconds: Math.round((Date.now() - started) / 1000), detail })
      console.log(`✓ ${name}`)
    } catch (e) {
      let failShot = null
      try {
        failShot = screenshot(`FAILED-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
      } catch {
        // no screenshot
      }
      results.push({ name, ok: false, seconds: Math.round((Date.now() - started) / 1000), error: e.message, screenshot: failShot })
      console.log(`✗ ${name}: ${e.message}`)
      // Recover a clean state for the next case.
      await setNetwork(true).catch(() => {})
      try {
        forceStop()
        launch()
        await attach()
      } catch {
        // next case starts fresh anyway
      }
    }
  }

  await setNetwork(true).catch(() => {})
  writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2))
  writeFileSync(join(OUT, 'logcat.txt'), logcat())
  const summary = [
    '## Android checks (emulator)',
    '',
    '| Case | Result | Details |',
    '|---|---|---|',
    ...results.map((r) => `| ${r.name} | ${r.ok ? '✅ pass' : '❌ fail'} | ${r.ok ? JSON.stringify(r.detail ?? {}).replace(/\|/g, '/') : r.error} |`),
    '',
  ].join('\n')
  writeFileSync(join(OUT, 'summary.md'), summary)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
  console.log(summary)
  page?.close()
  if (results.some((r) => !r.ok)) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
