/**
 * Public ad API for the app. Plugin-free: the AdMob plugin and controller are
 * only loaded in the Android build (`vite build --mode android`) and only on
 * a device. In the website build ADS_BUILD is the constant `false`, so the
 * bundler drops the dynamic imports and no AdMob code ships to the web.
 */
import { isNativeApp } from '@/lib/native'
import type { AdController } from './controller'
import type { AdState } from './state'

export { reportOverlay } from './signals'
export type { AdState } from './state'

const ADS_BUILD = import.meta.env.MODE === 'android'

let controller: Promise<AdController | null> | null = null

const load: () => Promise<AdController | null> = ADS_BUILD
  ? () =>
      (controller ??= isNativeApp()
        ? Promise.all([import('./controller'), import('./native-admob')])
            .then(([c, n]) => c.createAdController({ native: n.createAdMobNative() }))
            .catch(() => null)
        : Promise.resolve(null))
  : () => Promise.resolve(null)

export function startAds(): void {
  void load().then((c) => c?.start())
}

export function setAdRoute(pathname: string): void {
  void load().then((c) => c?.setRoute(pathname))
}

/** Subscribe to the ad state (Android app only). Returns an unsubscribe function. */
export function onAdState(fn: (state: AdState) => void): () => void {
  let cancelled = false
  let unsubscribe = () => {}
  void load().then((c) => {
    if (c && !cancelled) unsubscribe = c.subscribe(fn)
  })
  return () => {
    cancelled = true
    unsubscribe()
  }
}

/** Opens Google's ad privacy options form. Resolves false if it could not open. */
export function showAdPrivacyOptions(): Promise<boolean> {
  return load().then((c) => (c ? c.showPrivacyOptions() : false))
}
