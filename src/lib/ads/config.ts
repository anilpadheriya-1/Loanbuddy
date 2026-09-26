/**
 * Ad configuration. Pure and plugin-free, so the website bundle can import it.
 *
 * Privacy rule: the ad request is built ONLY from the values below. Nothing
 * from the loan calculator (amounts, rates, lender names, saved loans) is ever
 * passed to the ad SDK — no keywords, content URLs or custom targeting.
 */

/** Google's published sample IDs. They always serve test ads. */
export const TEST_PUBLISHER_ID = '3940256099942544'
export const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713'
export const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/9214589741'

export function isTestAdId(id: string): boolean {
  return id.includes(TEST_PUBLISHER_ID)
}

export interface BannerAdUnit {
  adId: string
  isTesting: boolean
}

/** The release banner unit, or Google's test unit when none is configured. */
export function bannerAdUnit(configured: string | undefined = import.meta.env.VITE_ADMOB_BANNER_ID): BannerAdUnit {
  const id = configured?.trim()
  if (!id || isTestAdId(id)) return { adId: TEST_BANNER_ID, isTesting: true }
  return { adId: id, isTesting: false }
}

export interface ConsentDebug {
  /** Pretend the device is in the EEA, so Google's consent form is required. */
  eea: boolean
  /** Hashed device IDs that Google's consent SDK should treat as test devices. */
  testDevices: string[]
}

/** Test builds only: localStorage keys the Android emulator checks set. */
export const DEBUG_GEOGRAPHY_KEY = 'lri.debug.adsGeography'
export const DEBUG_TEST_DEVICES_KEY = 'lri.debug.adsTestDevices'

/**
 * Consent-testing overrides (debug geography, test devices), from the build
 * env or from localStorage. Honoured only while Google test ads are in use,
 * so a release build can never fake the user's region.
 */
export function consentDebug(
  unit: BannerAdUnit,
  configured: string | undefined = import.meta.env.VITE_ADS_DEBUG_GEOGRAPHY,
  stored: { geography?: string | null; testDevices?: string | null } = {},
): ConsentDebug | null {
  if (!unit.isTesting) return null
  const eea = (stored.geography ?? configured ?? '').trim().toUpperCase() === 'EEA'
  const testDevices = (stored.testDevices ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return eea || testDevices.length > 0 ? { eea, testDevices } : null
}

/**
 * Screens without a banner: the Check My Loan wizard and Ask Your Lender are
 * input forms with their own fixed bottom bars (Next/Back, live ROI). Keeping
 * ads away from them avoids covering controls and accidental taps.
 */
const NO_BANNER_ROUTES = new Set(['/check-loan', '/ask-lender'])

export function routeAllowsBanner(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return !NO_BANNER_ROUTES.has(path)
}

/** Exactly the options sent to showBanner — see the privacy rule above. */
export interface BannerRequest {
  adId: string
  adSize: 'ADAPTIVE_BANNER'
  position: 'BOTTOM_CENTER'
  margin: number
  isTesting: boolean
}

export function bannerOptions(unit: BannerAdUnit, bottomInsetDp: number): BannerRequest {
  return {
    adId: unit.adId,
    adSize: 'ADAPTIVE_BANNER',
    position: 'BOTTOM_CENTER',
    // Sits the banner just above the Android navigation/gesture bar.
    margin: Math.max(0, Math.round(bottomInsetDp)),
    isTesting: unit.isTesting,
  }
}

/** Parse a CSS length such as "48px" (Capacitor's injected safe-area value). */
export function parsePx(value: string | null | undefined): number {
  const n = Number.parseFloat(value ?? '')
  return Number.isFinite(n) && n > 0 ? n : 0
}
