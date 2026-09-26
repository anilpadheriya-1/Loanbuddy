import { describe, expect, it } from 'vitest'
import {
  MAX_FAILURES,
  RETRY_COOLDOWN_MS,
  initialAdState,
  next,
  type AdEffect,
  type AdEvent,
  type AdState,
  type ConsentInfo,
  type ConsentStatus,
} from '../state'

const T0 = 1_000_000

function consent(status: ConsentStatus, canRequestAds: boolean, formAvailable = false): ConsentInfo {
  return { status, canRequestAds, formAvailable, privacyOptionsRequired: false }
}

/** Feed events in order; collect every effect. */
function run(events: AdEvent[], from: AdState = initialAdState(true)) {
  let state = from
  const effects: AdEffect[] = []
  for (const e of events) {
    const t = next(state, e)
    state = t.state
    effects.push(...t.effects)
  }
  return { state, effects, types: effects.map((e) => e.type) }
}

const start = (online = true, wantsBanner = true): AdEvent => ({ type: 'START', online, wantsBanner, layoutKey: '360x48', now: T0 })
const sdkReady: AdEvent = { type: 'SDK_READY', now: T0 }
const info = (c: ConsentInfo, now = T0): AdEvent => ({ type: 'CONSENT_INFO', info: c, now })
const shown: AdEvent = { type: 'BANNER_SHOWN', now: T0 }
const wants = (w: boolean, now = T0): AdEvent => ({ type: 'WANTS_BANNER', wants: w, now })

/** Started, consent allows ads, banner created and visible. */
function withBanner() {
  return run([start(), sdkReady, info(consent('NOT_REQUIRED', true)), shown, { type: 'BANNER_LOADED' }]).state
}

describe('ad state machine: start', () => {
  it('does nothing on the website (disabled)', () => {
    const r = run([start(), sdkReady, info(consent('OBTAINED', true))], initialAdState(false))
    expect(r.state.phase).toBe('disabled')
    expect(r.effects).toEqual([])
  })

  it('START is idempotent', () => {
    const r = run([start(), start(), start()])
    expect(r.types).toEqual(['initSdk'])
  })

  it('starts the SDK even when offline, but asks for nothing until online', () => {
    const r = run([start(false), sdkReady])
    expect(r.types).toEqual(['initSdk'])
    expect(r.state.phase).toBe('offline')
    const back = run([{ type: 'ONLINE', now: T0 }], r.state)
    expect(back.types).toEqual(['requestConsent'])
  })

  it('happy path: SDK → consent → one banner, space reserved only once it has a size', () => {
    const r = run([start(), sdkReady, info(consent('NOT_REQUIRED', true)), shown, { type: 'BANNER_SIZE', height: 50 }])
    expect(r.types).toEqual(['initSdk', 'requestConsent', 'createBanner', 'setAdHeight'])
    expect(r.effects.at(-1)).toEqual({ type: 'setAdHeight', px: 50 })
    expect(r.state.phase).toBe('ready')
  })

  it('does not create a banner on a screen that does not want one', () => {
    const r = run([start(true, false), sdkReady, info(consent('OBTAINED', true))])
    expect(r.types).not.toContain('createBanner')
    expect(r.state.phase).toBe('ready')
  })
})

describe('ad state machine: consent', () => {
  const statuses: ConsentStatus[] = ['REQUIRED', 'NOT_REQUIRED', 'OBTAINED', 'UNKNOWN']

  it('never requests an ad when canRequestAds is false, whatever the status', () => {
    for (const status of statuses) {
      for (const formAvailable of [true, false]) {
        const r = run([
          start(),
          sdkReady,
          info(consent(status, false, formAvailable)),
          // the form (if shown) comes back still refusing ads
          info(consent(status, false, formAvailable)),
          wants(false),
          wants(true),
          { type: 'ONLINE', now: T0 + RETRY_COOLDOWN_MS },
        ])
        expect(r.types, `${status} form=${formAvailable}`).not.toContain('createBanner')
      }
    }
  })

  it('REQUIRED with a form: shows it once, then follows the answer', () => {
    const r = run([start(), sdkReady, info(consent('REQUIRED', false, true))])
    expect(r.types.at(-1)).toBe('showConsentForm')
    expect(r.state.phase).toBe('consent_required')
    const accepted = run([info(consent('OBTAINED', true))], r.state)
    expect(accepted.types).toEqual(['createBanner'])
  })

  it('REQUIRED form answered without allowing ads: no second form, no ads', () => {
    const r = run([start(), sdkReady, info(consent('REQUIRED', false, true)), info(consent('REQUIRED', false, true))])
    expect(r.types.filter((t) => t === 'showConsentForm')).toHaveLength(1)
    expect(r.state.phase).toBe('consent_required')
  })

  it('REQUIRED without a form (form failed to load): failed, retried after the cooldown', () => {
    const r = run([start(), sdkReady, info(consent('REQUIRED', false, false))])
    expect(r.state.phase).toBe('failed')
    expect(run([wants(false, T0 + 1000), wants(true, T0 + 2000)], r.state).types).toEqual([])
    const later = run([wants(false, T0 + RETRY_COOLDOWN_MS), wants(true, T0 + RETRY_COOLDOWN_MS)], r.state)
    expect(later.types).toContain('requestConsent')
  })

  it.each(['OBTAINED', 'NOT_REQUIRED', 'UNKNOWN'] as const)('%s + canRequestAds → banner', (status) => {
    expect(run([start(), sdkReady, info(consent(status, true))]).types).toContain('createBanner')
  })

  it('consent error while online is a failure; while offline it just waits', () => {
    const online = run([start(), sdkReady, { type: 'CONSENT_ERROR', now: T0 }])
    expect(online.state.phase).toBe('failed')
    expect(online.state.failures).toBe(1)
    const offline = run([start(), sdkReady, { type: 'OFFLINE', now: T0 }, { type: 'CONSENT_ERROR', now: T0 }])
    expect(offline.state.phase).toBe('offline')
    expect(offline.state.failures).toBe(0)
    expect(run([{ type: 'ONLINE', now: T0 }], offline.state).types).toEqual(['requestConsent'])
  })

  it('privacy choices changed to "no ads" removes the banner; changed back brings it again', () => {
    const off = run([{ type: 'PRIVACY_CHANGED', info: consent('OBTAINED', false), now: T0 }], withBanner())
    expect(off.types).toEqual(['removeBanner', 'setAdHeight'])
    expect(off.state.phase).toBe('consent_required')
    const on = run(
      [
        { type: 'BANNER_REMOVED', now: T0 },
        { type: 'PRIVACY_CHANGED', info: consent('OBTAINED', true), now: T0 },
      ],
      off.state,
    )
    expect(on.types).toEqual(['createBanner'])
  })
})

describe('ad state machine: banner lifecycle', () => {
  it('route changes hide and resume the same banner; it is created once', () => {
    let state = withBanner()
    const types: string[] = []
    for (let i = 0; i < 20; i++) {
      const r = run([wants(i % 2 === 1)], state)
      state = r.state
      types.push(...r.types)
    }
    expect(types.filter((t) => t === 'createBanner')).toHaveLength(0)
    expect(types.filter((t) => t === 'hideBanner')).toHaveLength(10)
    expect(types.filter((t) => t === 'resumeBanner')).toHaveLength(10)
  })

  it('repeating the same screen state does nothing', () => {
    expect(run([wants(true), wants(true)], withBanner()).effects).toEqual([])
  })

  it('a late size report for a hidden banner reserves no space', () => {
    const r = run([start(), sdkReady, info(consent('OBTAINED', true)), shown, wants(false), { type: 'BANNER_SIZE', height: 50 }])
    expect(r.effects.at(-1)).toEqual({ type: 'setAdHeight', px: 0 })
  })

  it('going offline removes the banner and its space; coming back creates one banner', () => {
    const off = run([{ type: 'OFFLINE', now: T0 }], withBanner())
    expect(off.types).toEqual(['removeBanner', 'setAdHeight'])
    expect(off.effects[1]).toEqual({ type: 'setAdHeight', px: 0 })
    expect(off.state.phase).toBe('offline')
    const back = run(
      [{ type: 'BANNER_REMOVED', now: T0 }, { type: 'ONLINE', now: T0 }, { type: 'ONLINE', now: T0 }, { type: 'ONLINE', now: T0 }],
      off.state,
    )
    expect(back.types).toEqual(['createBanner'])
  })

  it('offline while a banner request is in flight removes it as soon as it lands', () => {
    const r = run([start(), sdkReady, info(consent('OBTAINED', true)), { type: 'OFFLINE', now: T0 }])
    expect(r.types).not.toContain('removeBanner')
    expect(run([shown], r.state).types).toEqual(['removeBanner', 'setAdHeight'])
  })

  it('a layout change (rotation) replaces the banner once', () => {
    const r = run([{ type: 'LAYOUT', key: '640x0', now: T0 }], withBanner())
    expect(r.types).toEqual(['removeBanner', 'setAdHeight'])
    expect(run([{ type: 'LAYOUT', key: '640x0', now: T0 }], r.state).types).toEqual([])
    expect(run([{ type: 'BANNER_REMOVED', now: T0 }], r.state).types).toEqual(['createBanner'])
  })
})

describe('ad state machine: failures', () => {
  it('ad-free fallback: a failed banner frees its space and the app goes on', () => {
    const r = run([{ type: 'BANNER_FAILED', now: T0 }], withBanner())
    expect(r.effects[0]).toEqual({ type: 'setAdHeight', px: 0 })
    expect(r.state).toMatchObject({ phase: 'failed', bannerCreated: false, bannerVisible: false, failures: 1 })
  })

  it('retries only after the cooldown, and gives up after MAX_FAILURES', () => {
    let state = withBanner()
    let now = T0
    for (let i = 1; i <= MAX_FAILURES; i++) {
      state = run([{ type: 'BANNER_FAILED', now }], state).state
      expect(state.failures).toBe(i)
      // within the cooldown: nothing
      expect(run([wants(false, now + 1), wants(true, now + 2)], state).types).toEqual([])
      now += RETRY_COOLDOWN_MS
      const retry = run([wants(false, now), wants(true, now)], state)
      if (i < MAX_FAILURES) {
        expect(retry.types).toEqual(['createBanner'])
        state = run([shown], retry.state).state
      } else {
        expect(retry.types).toEqual([])
        expect(retry.state.phase).toBe('failed')
      }
    }
  })

  it('a successful load resets the failure count', () => {
    const failed = run([{ type: 'BANNER_FAILED', now: T0 }], withBanner()).state
    const retried = run([wants(false, T0 + RETRY_COOLDOWN_MS), wants(true, T0 + RETRY_COOLDOWN_MS), shown, { type: 'BANNER_LOADED' }], failed)
    expect(retried.state.failures).toBe(0)
  })

  it('an offline load failure is not counted', () => {
    const s = run([{ type: 'OFFLINE', now: T0 }, { type: 'BANNER_REMOVED', now: T0 }], withBanner()).state
    const r = run([{ type: 'BANNER_FAILED', now: T0 }], s)
    expect(r.state.failures).toBe(0)
    expect(r.state.phase).toBe('offline')
  })

  it('SDK start failure is retried after the cooldown', () => {
    const r = run([start(), { type: 'SDK_FAILED', now: T0 }])
    expect(r.state.phase).toBe('failed')
    expect(run([{ type: 'FOREGROUND', online: true, now: T0 + RETRY_COOLDOWN_MS }], r.state).types).toEqual(['initSdk'])
  })
})
