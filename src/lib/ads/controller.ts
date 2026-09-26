/**
 * Runs the ad state machine (./state.ts) against the native AdMob plugin.
 *
 * - One controller per app: start() is idempotent (StrictMode, re-mounts).
 * - One native operation at a time (the state's `pending`), so the banner is
 *   created once; screen changes only hide/resume it.
 * - Every listener handle is kept and removed by dispose().
 * - `online` is debounced so a flapping connection doesn't hammer the SDK.
 */
import {
  DEBUG_GEOGRAPHY_KEY,
  DEBUG_TEST_DEVICES_KEY,
  bannerAdUnit,
  bannerOptions,
  consentDebug,
  parsePx,
  routeAllowsBanner,
  type BannerAdUnit,
  type BannerRequest,
  type ConsentDebug,
} from './config'
import { initialAdState, next, type AdEffect, type AdEvent, type AdState, type ConsentInfo } from './state'
import { OVERLAY_EVENT } from './signals'

export interface ListenerHandle {
  remove: () => Promise<void> | void
}

/** The slice of the AdMob plugin the controller uses (mocked in tests). */
export interface AdsNative {
  initialize(): Promise<void>
  requestConsentInfo(debug: ConsentDebug | null): Promise<ConsentInfo>
  showConsentForm(): Promise<ConsentInfo>
  showPrivacyOptionsForm(): Promise<void>
  showBanner(request: BannerRequest): Promise<void>
  hideBanner(): Promise<void>
  resumeBanner(): Promise<void>
  removeBanner(): Promise<void>
  onBannerSize(fn: (height: number) => void): Promise<ListenerHandle>
  onBannerLoaded(fn: () => void): Promise<ListenerHandle>
  onBannerFailed(fn: () => void): Promise<ListenerHandle>
}

export interface AdController {
  start(): void
  setRoute(pathname: string): void
  getState(): AdState
  subscribe(fn: (state: AdState) => void): () => void
  /** Opens Google's privacy options form. Resolves false if it could not open. */
  showPrivacyOptions(): Promise<boolean>
  dispose(): Promise<void>
}

export const ONLINE_DEBOUNCE_MS = 2000
export const LAYOUT_DEBOUNCE_MS = 300
export const REMOVAL_TIMEOUT_MS = 1000
/** Google's consent SDK refuses the privacy form while it is still preloading it. */
export const PRIVACY_FORM_ATTEMPTS = 5
export const PRIVACY_FORM_RETRY_MS = 1000

interface Options {
  native: AdsNative
  unit?: BannerAdUnit
  debug?: ConsentDebug | null
  now?: () => number
  log?: (message: string) => void
}

function storedDebug(unit: BannerAdUnit): ConsentDebug | null {
  if (!unit.isTesting) return null
  try {
    return consentDebug(unit, undefined, {
      geography: localStorage.getItem(DEBUG_GEOGRAPHY_KEY),
      testDevices: localStorage.getItem(DEBUG_TEST_DEVICES_KEY),
    })
  } catch {
    return consentDebug(unit)
  }
}

const EDITABLE = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]), textarea, select, [contenteditable=""], [contenteditable=true]'

function isEditable(el: Element | null): boolean {
  return !!el && typeof el.matches === 'function' && el.matches(EDITABLE)
}

export function createAdController({
  native,
  unit = bannerAdUnit(),
  debug = storedDebug(unit),
  now = Date.now,
  log = (m) => console.info(m),
}: Options): AdController {
  let state = initialAdState(true)
  let started = false
  let disposed = false
  const subscribers = new Set<(s: AdState) => void>()

  // Inputs that decide whether the current screen wants a banner.
  let routeAllowed = true
  let overlays = 0
  let keyboardOpen = false

  const pluginHandles: Promise<ListenerHandle>[] = []
  const cleanups: (() => void)[] = []
  let onlineTimer: ReturnType<typeof setTimeout> | undefined
  let layoutTimer: ReturnType<typeof setTimeout> | undefined
  let focusTimer: ReturnType<typeof setTimeout> | undefined
  let removal: { resolve: () => void; timer: ReturnType<typeof setTimeout> } | null = null

  const root = () => document.documentElement

  function bottomInset(): number {
    return parsePx(getComputedStyle(root()).getPropertyValue('--safe-area-inset-bottom'))
  }

  function layoutKey(): string {
    return `${window.innerWidth}x${bottomInset()}`
  }

  function wantsBanner(): boolean {
    return routeAllowed && overlays === 0 && !keyboardOpen && document.visibilityState !== 'hidden'
  }

  function dispatch(event: AdEvent) {
    if (disposed) return
    const t = next(state, event)
    const changed = t.state !== state
    state = t.state
    if (changed) subscribers.forEach((fn) => fn(state))
    t.effects.forEach(run)
  }

  function settleRemoval() {
    if (!removal) return
    clearTimeout(removal.timer)
    const { resolve } = removal
    removal = null
    resolve()
  }

  /** The plugin resolves removeBanner before the view is gone; wait for its size-0 event. */
  function waitForRemoval(): Promise<void> {
    settleRemoval()
    return new Promise((resolve) => {
      removal = { resolve, timer: setTimeout(settleRemoval, REMOVAL_TIMEOUT_MS) }
    })
  }

  function run(effect: AdEffect) {
    if (disposed) return
    log(`[ads] ${effect.type}${effect.type === 'setAdHeight' ? ` ${effect.px}` : ''}`)
    switch (effect.type) {
      case 'initSdk':
        native.initialize().then(
          () => dispatch({ type: 'SDK_READY', now: now() }),
          () => dispatch({ type: 'SDK_FAILED', now: now() }),
        )
        return
      case 'requestConsent':
        native.requestConsentInfo(debug).then(
          (info) => dispatch({ type: 'CONSENT_INFO', info, now: now() }),
          () => dispatch({ type: 'CONSENT_ERROR', now: now() }),
        )
        return
      case 'showConsentForm':
        native.showConsentForm().then(
          (info) => dispatch({ type: 'CONSENT_INFO', info, now: now() }),
          () => dispatch({ type: 'CONSENT_ERROR', now: now() }),
        )
        return
      case 'createBanner':
        native.showBanner(bannerOptions(unit, bottomInset())).then(
          () => dispatch({ type: 'BANNER_SHOWN', now: now() }),
          () => dispatch({ type: 'BANNER_FAILED', now: now() }),
        )
        return
      case 'hideBanner':
        native.hideBanner().catch(() => {})
        return
      case 'resumeBanner':
        native.resumeBanner().catch(() => {})
        return
      case 'removeBanner': {
        const removed = waitForRemoval()
        native
          .removeBanner()
          .catch(() => settleRemoval())
          .then(() => removed)
          .then(() => dispatch({ type: 'BANNER_REMOVED', now: now() }))
        return
      }
      case 'setAdHeight':
        root().style.setProperty('--ad-height', `${effect.px}px`)
        return
    }
  }

  function updateWants() {
    dispatch({ type: 'WANTS_BANNER', wants: wantsBanner(), now: now() })
  }

  function scheduleLayoutCheck() {
    clearTimeout(layoutTimer)
    layoutTimer = setTimeout(() => {
      // The keyboard changes the injected bottom inset; ignore that, or every
      // keyboard open/close would replace the banner.
      if (!keyboardOpen) dispatch({ type: 'LAYOUT', key: layoutKey(), now: now() })
    }, LAYOUT_DEBOUNCE_MS)
  }

  function listen<K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void): void
  function listen<K extends keyof DocumentEventMap>(target: Document, type: K, fn: (e: DocumentEventMap[K]) => void): void
  function listen(target: Window | Document, type: string, fn: (e: Event) => void) {
    target.addEventListener(type, fn)
    cleanups.push(() => target.removeEventListener(type, fn))
  }

  function attach() {
    pluginHandles.push(
      native.onBannerSize((height) => {
        if (height === 0) settleRemoval()
        dispatch({ type: 'BANNER_SIZE', height })
      }),
      native.onBannerLoaded(() => dispatch({ type: 'BANNER_LOADED' })),
      native.onBannerFailed(() => dispatch({ type: 'BANNER_FAILED', now: now() })),
    )

    listen(window, 'online', () => {
      clearTimeout(onlineTimer)
      onlineTimer = setTimeout(() => {
        if (navigator.onLine) dispatch({ type: 'ONLINE', now: now() })
      }, ONLINE_DEBOUNCE_MS)
    })
    listen(window, 'offline', () => {
      clearTimeout(onlineTimer)
      dispatch({ type: 'OFFLINE', now: now() })
    })
    listen(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') dispatch({ type: 'FOREGROUND', online: navigator.onLine, now: now() })
      updateWants()
    })
    listen(window, 'resize', scheduleLayoutCheck)
    listen(document, 'focusin', (e) => {
      if (!isEditable(e.target as Element | null)) return
      clearTimeout(focusTimer)
      keyboardOpen = true
      updateWants()
    })
    listen(document, 'focusout', () => {
      clearTimeout(focusTimer)
      focusTimer = setTimeout(() => {
        const open = isEditable(document.activeElement)
        if (open === keyboardOpen) return
        keyboardOpen = open
        updateWants()
        if (!open) scheduleLayoutCheck()
      }, 150)
    })
    const onOverlay = (e: Event) => {
      overlays = Math.max(0, overlays + ((e as CustomEvent<boolean>).detail ? 1 : -1))
      updateWants()
    }
    window.addEventListener(OVERLAY_EVENT, onOverlay)
    cleanups.push(() => window.removeEventListener(OVERLAY_EVENT, onOverlay))

    // Capacitor injects --safe-area-inset-* after load and on rotation.
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(scheduleLayoutCheck)
      observer.observe(root(), { attributes: true, attributeFilter: ['style'] })
      cleanups.push(() => observer.disconnect())
    }
  }

  return {
    start() {
      if (started || disposed) return
      started = true
      // Test builds only: a read-only probe for the Android emulator checks.
      if (unit.isTesting) Object.defineProperty(window, '__lriAds', { value: { state: () => state }, configurable: true })
      attach()
      dispatch({ type: 'START', online: navigator.onLine, wantsBanner: wantsBanner(), layoutKey: layoutKey(), now: now() })
    },
    setRoute(pathname) {
      routeAllowed = routeAllowsBanner(pathname)
      if (started) updateWants()
    },
    getState: () => state,
    subscribe(fn) {
      subscribers.add(fn)
      fn(state)
      return () => subscribers.delete(fn)
    },
    async showPrivacyOptions() {
      if (disposed) return false
      // Right after launch the SDK may still be loading the form ("being
      // loading, try again later"): retry briefly instead of ignoring the tap.
      for (let attempt = 1; ; attempt++) {
        try {
          await native.showPrivacyOptionsForm()
          break
        } catch {
          if (disposed || attempt >= PRIVACY_FORM_ATTEMPTS) return false // usually offline
          await new Promise((r) => setTimeout(r, PRIVACY_FORM_RETRY_MS))
        }
      }
      try {
        const info = await native.requestConsentInfo(debug)
        dispatch({ type: 'PRIVACY_CHANGED', info, now: now() })
      } catch {
        // The choice is saved by the SDK; the new status is read on the next launch.
      }
      return true
    },
    async dispose() {
      if (disposed) return
      disposed = true
      clearTimeout(onlineTimer)
      clearTimeout(layoutTimer)
      clearTimeout(focusTimer)
      settleRemoval()
      cleanups.splice(0).forEach((fn) => fn())
      const handles = await Promise.allSettled(pluginHandles.splice(0))
      await Promise.all(handles.map((h) => (h.status === 'fulfilled' ? h.value.remove() : undefined)))
      await native.removeBanner().catch(() => {})
      root().style.setProperty('--ad-height', '0px')
      subscribers.clear()
    },
  }
}
