/**
 * Banner-ad state machine. Pure: `next(state, event)` returns the new state and
 * the side effects to run; the controller runs them and reports back with
 * events. Keeping every decision here makes the lifecycle testable without a
 * phone: no duplicate banners, no ad requests without consent, no reserved
 * space when there is no ad, and no retry storms.
 */

export type AdPhase =
  | 'disabled' // website, or ads not available
  | 'idle' // not started yet
  | 'loading' // SDK start, consent check or banner request in flight
  | 'consent_required' // consent form showing, or consent does not allow ad requests
  | 'ready' // ads may be requested (banner shown or paused per screen)
  | 'offline'
  | 'failed' // waiting for the retry cooldown, or given up for this session

export type ConsentStatus = 'REQUIRED' | 'NOT_REQUIRED' | 'OBTAINED' | 'UNKNOWN'

export interface ConsentInfo {
  status: ConsentStatus
  canRequestAds: boolean
  formAvailable: boolean
  privacyOptionsRequired: boolean
}

type Pending = 'sdk' | 'consent' | 'form' | 'banner' | 'remove' | null

export interface AdState {
  phase: AdPhase
  /** The one native operation in flight; nothing else starts until it settles. */
  pending: Pending
  online: boolean
  sdkReady: boolean
  /** null = not checked yet this session. */
  consent: ConsentInfo | null
  consentFormShown: boolean
  /** Screen allows a banner, no dialog or keyboard is open, app is in front. */
  wantsBanner: boolean
  bannerCreated: boolean
  bannerVisible: boolean
  /** Viewport width + bottom inset; a change needs a new adaptive banner. */
  layoutKey: string
  bannerLayoutKey: string | null
  /** Consecutive failures; reset by any success. */
  failures: number
  lastFailureAt: number | null
}

export type AdEvent =
  | { type: 'START'; online: boolean; wantsBanner: boolean; layoutKey: string; now: number }
  | { type: 'SDK_READY'; now: number }
  | { type: 'SDK_FAILED'; now: number }
  | { type: 'CONSENT_INFO'; info: ConsentInfo; now: number }
  | { type: 'CONSENT_ERROR'; now: number }
  | { type: 'PRIVACY_CHANGED'; info: ConsentInfo; now: number }
  | { type: 'ONLINE'; now: number }
  | { type: 'OFFLINE'; now: number }
  | { type: 'FOREGROUND'; online: boolean; now: number }
  | { type: 'WANTS_BANNER'; wants: boolean; now: number }
  | { type: 'LAYOUT'; key: string; now: number }
  | { type: 'BANNER_SHOWN'; now: number }
  | { type: 'BANNER_SIZE'; height: number }
  | { type: 'BANNER_LOADED' }
  | { type: 'BANNER_FAILED'; now: number }
  | { type: 'BANNER_REMOVED'; now: number }

export type AdEffect =
  | { type: 'initSdk' }
  | { type: 'requestConsent' }
  | { type: 'showConsentForm' }
  | { type: 'createBanner' }
  | { type: 'hideBanner' }
  | { type: 'resumeBanner' }
  | { type: 'removeBanner' }
  | { type: 'setAdHeight'; px: number }

export interface Transition {
  state: AdState
  effects: AdEffect[]
}

export const RETRY_COOLDOWN_MS = 60_000
export const MAX_FAILURES = 3

export function initialAdState(enabled: boolean): AdState {
  return {
    phase: enabled ? 'idle' : 'disabled',
    pending: null,
    online: true,
    sdkReady: false,
    consent: null,
    consentFormShown: false,
    wantsBanner: false,
    bannerCreated: false,
    bannerVisible: false,
    layoutKey: '',
    bannerLayoutKey: null,
    failures: 0,
    lastFailureAt: null,
  }
}

export function canRetry(s: AdState, now: number): boolean {
  if (s.failures >= MAX_FAILURES) return false
  return s.lastFailureAt === null || now - s.lastFailureAt >= RETRY_COOLDOWN_MS
}

function fail(s: AdState, now: number): AdState {
  return { ...s, phase: 'failed', failures: s.failures + 1, lastFailureAt: now }
}

function succeed(s: AdState): AdState {
  return { ...s, failures: 0, lastFailureAt: null }
}

function removeBannerNow(s: AdState, phase: AdPhase): Transition {
  return {
    state: { ...s, phase, pending: 'remove', bannerCreated: false, bannerVisible: false, bannerLayoutKey: null },
    effects: [{ type: 'removeBanner' }, { type: 'setAdHeight', px: 0 }],
  }
}

/** Decide the next native step from the current state. */
export function advance(s: AdState, now: number): Transition {
  const stay: Transition = { state: s, effects: [] }
  if (s.phase === 'disabled' || s.phase === 'idle' || s.pending) return stay

  // 1. Start the SDK. This works without internet, so it runs regardless.
  if (!s.sdkReady) {
    if (s.failures > 0 && !canRetry(s, now)) return { state: { ...s, phase: 'failed' }, effects: [] }
    return { state: { ...s, phase: 'loading', pending: 'sdk' }, effects: [{ type: 'initSdk' }] }
  }

  // 2. Offline: never request anything, never keep a banner (or its space).
  if (!s.online) {
    if (s.bannerCreated) return removeBannerNow(s, 'offline')
    return { state: { ...s, phase: 'offline' }, effects: [] }
  }

  // 3. Consent, checked once per launch as Google's UMP SDK recommends.
  if (s.consent === null) {
    if (s.failures > 0 && !canRetry(s, now)) return { state: { ...s, phase: 'failed' }, effects: [] }
    return { state: { ...s, phase: 'loading', pending: 'consent' }, effects: [{ type: 'requestConsent' }] }
  }
  if (s.consent.status === 'REQUIRED' && !s.consent.canRequestAds && s.consent.formAvailable && !s.consentFormShown) {
    return {
      state: { ...s, phase: 'consent_required', pending: 'form', consentFormShown: true },
      effects: [{ type: 'showConsentForm' }],
    }
  }

  // 4. The final gate: no ad request unless consent allows it.
  if (!s.consent.canRequestAds) {
    if (s.bannerCreated) return removeBannerNow(s, 'consent_required')
    return { state: { ...s, phase: 'consent_required' }, effects: [] }
  }

  // 5. Banner.
  if (s.failures > 0 && !canRetry(s, now)) return { state: { ...s, phase: 'failed' }, effects: [] }
  const ready: AdState = { ...s, phase: 'ready' }
  if (ready.bannerCreated && ready.bannerLayoutKey !== ready.layoutKey) return removeBannerNow(ready, 'ready')
  if (ready.wantsBanner) {
    if (!ready.bannerCreated) {
      return {
        state: { ...ready, pending: 'banner', bannerLayoutKey: ready.layoutKey },
        effects: [{ type: 'createBanner' }],
      }
    }
    if (!ready.bannerVisible) return { state: { ...ready, bannerVisible: true }, effects: [{ type: 'resumeBanner' }] }
    return { state: ready, effects: [] }
  }
  if (ready.bannerCreated && ready.bannerVisible) {
    return {
      state: { ...ready, bannerVisible: false },
      effects: [{ type: 'hideBanner' }, { type: 'setAdHeight', px: 0 }],
    }
  }
  return { state: ready, effects: [] }
}

function settle(s: AdState, kind: Exclude<Pending, null>): AdState {
  return s.pending === kind ? { ...s, pending: null } : s
}

function withEffects(first: AdEffect[], t: Transition): Transition {
  return { state: t.state, effects: [...first, ...t.effects] }
}

export function next(s: AdState, e: AdEvent): Transition {
  if (s.phase === 'disabled') return { state: s, effects: [] }

  switch (e.type) {
    case 'START': {
      if (s.phase !== 'idle') return { state: s, effects: [] } // idempotent
      const started: AdState = {
        ...s,
        phase: 'loading',
        online: e.online,
        wantsBanner: e.wantsBanner,
        layoutKey: e.layoutKey,
      }
      return advance(started, e.now)
    }
    case 'SDK_READY':
      return advance(succeed({ ...settle(s, 'sdk'), sdkReady: true }), e.now)
    case 'SDK_FAILED':
      return advance(fail(settle(s, 'sdk'), e.now), e.now)
    case 'CONSENT_INFO': {
      const settled = settle(settle(s, 'consent'), 'form')
      // Consent is needed but the form could not be loaded (usually a network
      // problem): treat as a failure and ask again after the cooldown.
      if (e.info.status === 'REQUIRED' && !e.info.canRequestAds && !e.info.formAvailable) {
        return advance(fail({ ...settled, consent: null }, e.now), e.now)
      }
      return advance(succeed({ ...settled, consent: e.info }), e.now)
    }
    case 'PRIVACY_CHANGED':
      return advance({ ...s, consent: e.info }, e.now)
    case 'CONSENT_ERROR': {
      const settled = settle(settle(s, 'consent'), 'form')
      // Offline is expected, not a failure: retry when the connection is back.
      const after = settled.online ? fail(settled, e.now) : { ...settled, phase: 'offline' as const }
      return advance(after, e.now)
    }
    case 'ONLINE':
      return advance({ ...s, online: true }, e.now)
    case 'OFFLINE':
      return advance({ ...s, online: false, phase: s.phase === 'idle' ? s.phase : 'offline' }, e.now)
    case 'FOREGROUND':
      return advance({ ...s, online: e.online }, e.now)
    case 'WANTS_BANNER':
      if (s.wantsBanner === e.wants) return { state: s, effects: [] }
      return advance({ ...s, wantsBanner: e.wants }, e.now)
    case 'LAYOUT':
      if (s.layoutKey === e.key) return { state: s, effects: [] }
      return advance({ ...s, layoutKey: e.key }, e.now)
    case 'BANNER_SHOWN':
      return advance({ ...settle(s, 'banner'), bannerCreated: true, bannerVisible: true }, e.now)
    case 'BANNER_SIZE':
      // The SDK can report a size after we hid the banner (late load): only a
      // visible banner may reserve space.
      return {
        state: s,
        effects: [{ type: 'setAdHeight', px: s.bannerCreated && s.bannerVisible ? Math.max(0, e.height) : 0 }],
      }
    case 'BANNER_LOADED':
      return { state: succeed(s), effects: [] }
    case 'BANNER_FAILED': {
      // The plugin has already removed the failed banner view.
      const cleared: AdState = {
        ...settle(s, 'banner'),
        bannerCreated: false,
        bannerVisible: false,
        bannerLayoutKey: null,
      }
      const after = cleared.online ? fail(cleared, e.now) : { ...cleared, phase: 'offline' as const }
      return withEffects([{ type: 'setAdHeight', px: 0 }], advance(after, e.now))
    }
    case 'BANNER_REMOVED':
      return advance(settle(s, 'remove'), e.now)
  }
}
