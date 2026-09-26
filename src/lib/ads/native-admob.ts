/**
 * Adapter from the @capacitor-community/admob plugin to the controller's
 * AdsNative interface. Only loaded in the Android build (see ./index.ts).
 */
import {
  AdMob,
  AdmobConsentDebugGeography,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  MaxAdContentRating,
  type AdmobConsentInfo,
} from '@capacitor-community/admob'
import type { AdsNative } from './controller'
import type { ConsentInfo, ConsentStatus } from './state'

const STATUSES: ConsentStatus[] = ['REQUIRED', 'NOT_REQUIRED', 'OBTAINED', 'UNKNOWN']

export function toConsentInfo(info: AdmobConsentInfo): ConsentInfo {
  const status = STATUSES.includes(info.status as ConsentStatus) ? (info.status as ConsentStatus) : 'UNKNOWN'
  return {
    status,
    canRequestAds: info.canRequestAds === true,
    formAvailable: info.isConsentFormAvailable === true,
    // PrivacyOptionsRequirementStatus is not exported by the plugin; its value is 'REQUIRED'.
    privacyOptionsRequired: String(info.privacyOptionsRequirementStatus) === 'REQUIRED',
  }
}

export function createAdMobNative(): AdsNative {
  return {
    initialize: () => AdMob.initialize({ maxAdContentRating: MaxAdContentRating.ParentalGuidance }),
    requestConsentInfo: async (debug) =>
      toConsentInfo(
        await AdMob.requestConsentInfo(
          debug
            ? {
                ...(debug.eea ? { debugGeography: AdmobConsentDebugGeography.EEA } : {}),
                ...(debug.testDevices.length ? { testDeviceIdentifiers: debug.testDevices } : {}),
              }
            : undefined,
        ),
      ),
    showConsentForm: async () => toConsentInfo(await AdMob.showConsentForm()),
    showPrivacyOptionsForm: () => AdMob.showPrivacyOptionsForm(),
    // Only the whitelisted request fields are forwarded (see config.ts).
    showBanner: (request) =>
      AdMob.showBanner({
        adId: request.adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: request.margin,
        isTesting: request.isTesting,
      }),
    hideBanner: () => AdMob.hideBanner(),
    resumeBanner: () => AdMob.resumeBanner(),
    removeBanner: () => AdMob.removeBanner(),
    onBannerSize: (fn) => AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => fn(size.height)),
    onBannerLoaded: (fn) => AdMob.addListener(BannerAdPluginEvents.Loaded, () => fn()),
    onBannerFailed: (fn) => AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => fn()),
  }
}
