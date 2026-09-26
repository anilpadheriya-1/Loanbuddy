import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdController, ONLINE_DEBOUNCE_MS, LAYOUT_DEBOUNCE_MS, type AdController, type AdsNative, type ListenerHandle } from '../controller'
import { reportOverlay } from '../signals'
import type { ConsentInfo } from '../state'

const LOAD_MS = 50

function fakeNative(consent: Partial<ConsentInfo> = {}) {
  const size: ((h: number) => void)[] = []
  const loaded: (() => void)[] = []
  const failed: (() => void)[] = []
  const handles: { remove: ReturnType<typeof vi.fn> }[] = []
  let failNextLoad = false
  const consentInfo = (): ConsentInfo => ({
    status: 'NOT_REQUIRED',
    canRequestAds: true,
    formAvailable: false,
    privacyOptionsRequired: false,
    ...consent,
  })
  const on = <T,>(list: T[], fn: T): Promise<ListenerHandle> => {
    list.push(fn)
    const h = { remove: vi.fn(() => void list.splice(list.indexOf(fn), 1)) }
    handles.push(h)
    return Promise.resolve(h)
  }
  const native = {
    initialize: vi.fn(async () => {}),
    requestConsentInfo: vi.fn(async () => consentInfo()),
    showConsentForm: vi.fn(async () => ({ ...consentInfo(), status: 'OBTAINED' as const, canRequestAds: true })),
    showPrivacyOptionsForm: vi.fn(async () => {}),
    // Like the real plugin: resolves at once, loads (or fails) a little later.
    showBanner: vi.fn(async () => {
      setTimeout(() => {
        if (failNextLoad) {
          failNextLoad = false
          size.forEach((f) => f(0))
          failed.forEach((f) => f())
        } else {
          size.forEach((f) => f(50))
          loaded.forEach((f) => f())
        }
      }, LOAD_MS)
    }),
    hideBanner: vi.fn(async () => size.forEach((f) => f(0))),
    resumeBanner: vi.fn(async () => size.forEach((f) => f(50))),
    removeBanner: vi.fn(async () => {
      setTimeout(() => size.forEach((f) => f(0)), 5)
    }),
    onBannerSize: vi.fn((fn: (h: number) => void) => on(size, fn)),
    onBannerLoaded: vi.fn((fn: () => void) => on(loaded, fn)),
    onBannerFailed: vi.fn((fn: () => void) => on(failed, fn)),
  } satisfies AdsNative
  return {
    native,
    handles,
    failNextLoad: () => {
      failNextLoad = true
    },
  }
}

let online = true
const adHeight = () => document.documentElement.style.getPropertyValue('--ad-height')
const settle = () => vi.advanceTimersByTimeAsync(0)

let controller: AdController | null = null
let logs: string[] = []

function make(native: AdsNative, unit = { adId: 'ca-app-pub-3940256099942544/9214589741', isTesting: true }) {
  logs = []
  controller = createAdController({ native, unit, debug: null, log: (m) => logs.push(m) })
  return controller
}

beforeEach(() => {
  vi.useFakeTimers()
  online = true
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online })
  document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px')
  document.documentElement.style.setProperty('--ad-height', '0px')
})

afterEach(async () => {
  await controller?.dispose()
  controller = null
  vi.useRealTimers()
  document.documentElement.removeAttribute('style')
})

describe('ad controller', () => {
  it('start() is idempotent: one SDK init, one consent check, one banner', async () => {
    const { native } = fakeNative()
    const c = make(native)
    c.start()
    c.start()
    await settle()
    c.start()
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    expect(native.initialize).toHaveBeenCalledTimes(1)
    expect(native.requestConsentInfo).toHaveBeenCalledTimes(1)
    expect(native.showBanner).toHaveBeenCalledTimes(1)
    expect(adHeight()).toBe('50px')
    expect(c.getState().phase).toBe('ready')
  })

  it('sends only whitelisted banner options, with the nav-bar inset as margin', async () => {
    const { native } = fakeNative()
    make(native).start()
    await settle()
    expect(native.showBanner).toHaveBeenCalledWith({
      adId: 'ca-app-pub-3940256099942544/9214589741',
      adSize: 'ADAPTIVE_BANNER',
      position: 'BOTTOM_CENTER',
      margin: 24,
      isTesting: true,
    })
    const [request] = native.showBanner.mock.calls[0] as unknown as [object]
    expect(Object.keys(request).sort()).toEqual(['adId', 'adSize', 'isTesting', 'margin', 'position'])
  })

  it('20 route changes: one banner, then only hide/resume; no space kept on form screens', async () => {
    const { native } = fakeNative()
    const c = make(native)
    c.setRoute('/')
    c.start()
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    const routes = ['/check-loan', '/learn', '/ask-lender', '/check-loan/results']
    for (let i = 0; i < 20; i++) {
      c.setRoute(routes[i % routes.length]!)
      await settle()
      const allowed = !['/check-loan', '/ask-lender'].includes(routes[i % routes.length]!)
      expect(adHeight(), routes[i % routes.length]).toBe(allowed ? '50px' : '0px')
    }
    expect(native.showBanner).toHaveBeenCalledTimes(1)
    expect(native.hideBanner).toHaveBeenCalledTimes(10)
    expect(native.resumeBanner).toHaveBeenCalledTimes(10)
  })

  it('never requests an ad when consent does not allow it', async () => {
    const { native } = fakeNative({ status: 'OBTAINED', canRequestAds: false })
    const c = make(native)
    c.start()
    await vi.advanceTimersByTimeAsync(5 * LOAD_MS)
    expect(native.showBanner).not.toHaveBeenCalled()
    expect(c.getState().phase).toBe('consent_required')
    expect(adHeight()).toBe('0px')
  })

  it('consent required: shows the form, then the banner once consent allows ads', async () => {
    const { native } = fakeNative({ status: 'REQUIRED', canRequestAds: false, formAvailable: true })
    make(native).start()
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    expect(native.showConsentForm).toHaveBeenCalledTimes(1)
    expect(native.showBanner).toHaveBeenCalledTimes(1)
  })

  it('offline at launch: SDK starts, no consent or ad request until online (debounced)', async () => {
    online = false
    const { native } = fakeNative()
    const c = make(native)
    c.start()
    await settle()
    expect(native.initialize).toHaveBeenCalledTimes(1)
    expect(native.requestConsentInfo).not.toHaveBeenCalled()
    expect(c.getState().phase).toBe('offline')

    online = true
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new Event('online'))
      await vi.advanceTimersByTimeAsync(ONLINE_DEBOUNCE_MS / 4)
    }
    expect(native.requestConsentInfo).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(ONLINE_DEBOUNCE_MS)
    expect(native.requestConsentInfo).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    expect(native.showBanner).toHaveBeenCalledTimes(1)
  })

  it('internet → offline removes the banner and its space; flapping back creates exactly one', async () => {
    const { native } = fakeNative()
    const c = make(native)
    c.start()
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    expect(adHeight()).toBe('50px')

    online = false
    window.dispatchEvent(new Event('offline'))
    await vi.advanceTimersByTimeAsync(10)
    expect(native.removeBanner).toHaveBeenCalledTimes(1)
    expect(adHeight()).toBe('0px')
    expect(c.getState().phase).toBe('offline')

    for (let i = 0; i < 5; i++) {
      online = true
      window.dispatchEvent(new Event('online'))
      await vi.advanceTimersByTimeAsync(100)
      online = false
      window.dispatchEvent(new Event('offline'))
      await vi.advanceTimersByTimeAsync(100)
    }
    online = true
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(ONLINE_DEBOUNCE_MS + LOAD_MS)
    expect(native.showBanner).toHaveBeenCalledTimes(2)
    expect(logs.filter((l) => l === '[ads] createBanner')).toHaveLength(2)
    expect(adHeight()).toBe('50px')
  })

  it('ad-free fallback: a failed load leaves no reserved space', async () => {
    const fake = fakeNative()
    fake.failNextLoad()
    const c = make(fake.native)
    c.start()
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    expect(adHeight()).toBe('0px')
    expect(c.getState()).toMatchObject({ phase: 'failed', bannerCreated: false })
  })

  it('dialogs and the keyboard hide the banner while open', async () => {
    const { native } = fakeNative()
    make(native).start()
    await vi.advanceTimersByTimeAsync(LOAD_MS)

    reportOverlay(true)
    await settle()
    expect(native.hideBanner).toHaveBeenCalledTimes(1)
    expect(adHeight()).toBe('0px')
    reportOverlay(false)
    await settle()
    expect(native.resumeBanner).toHaveBeenCalledTimes(1)

    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    await settle()
    expect(native.hideBanner).toHaveBeenCalledTimes(2)
    input.blur()
    await vi.advanceTimersByTimeAsync(200)
    expect(native.resumeBanner).toHaveBeenCalledTimes(2)
    input.remove()
  })

  it('rotation (width change) replaces the banner once, after the old one is gone', async () => {
    const { native } = fakeNative()
    make(native).start()
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    const width = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width + 300 })
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    await vi.advanceTimersByTimeAsync(LAYOUT_DEBOUNCE_MS + 10)
    expect(native.removeBanner).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    expect(native.showBanner).toHaveBeenCalledTimes(2)
    expect(adHeight()).toBe('50px')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  })

  it('changing privacy choices to "no ads" removes the banner', async () => {
    const fake = fakeNative()
    const c = make(fake.native)
    c.start()
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    fake.native.requestConsentInfo.mockResolvedValueOnce({
      status: 'OBTAINED',
      canRequestAds: false,
      formAvailable: true,
      privacyOptionsRequired: true,
    })
    await c.showPrivacyOptions()
    await vi.advanceTimersByTimeAsync(10)
    expect(fake.native.showPrivacyOptionsForm).toHaveBeenCalledTimes(1)
    expect(fake.native.removeBanner).toHaveBeenCalledTimes(1)
    expect(c.getState().phase).toBe('consent_required')
    expect(adHeight()).toBe('0px')
  })

  it('dispose() removes every listener and the banner', async () => {
    const fake = fakeNative()
    const c = make(fake.native)
    c.start()
    await vi.advanceTimersByTimeAsync(LOAD_MS)
    await c.dispose()
    expect(fake.handles).toHaveLength(3)
    fake.handles.forEach((h) => expect(h.remove).toHaveBeenCalledTimes(1))
    const removes = fake.native.removeBanner.mock.calls.length
    online = false
    window.dispatchEvent(new Event('offline'))
    reportOverlay(true)
    await vi.advanceTimersByTimeAsync(ONLINE_DEBOUNCE_MS)
    expect(fake.native.removeBanner).toHaveBeenCalledTimes(removes)
    expect(fake.native.hideBanner).not.toHaveBeenCalled()
    reportOverlay(false)
  })
})
