import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const ADS_DIR = join(__dirname, '..')
const ROOT = join(__dirname, '../../../..')

vi.mock('@capacitor-community/admob', () => {
  const AdMob = {
    initialize: vi.fn(async () => {}),
    requestConsentInfo: vi.fn(async () => ({})),
    showConsentForm: vi.fn(async () => ({})),
    showPrivacyOptionsForm: vi.fn(async () => {}),
    showBanner: vi.fn(async () => {}),
    hideBanner: vi.fn(async () => {}),
    resumeBanner: vi.fn(async () => {}),
    removeBanner: vi.fn(async () => {}),
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
  }
  return {
    AdMob,
    AdmobConsentDebugGeography: { EEA: 1 },
    BannerAdPluginEvents: { SizeChanged: 'bannerAdSizeChanged', Loaded: 'bannerAdLoaded', FailedToLoad: 'bannerAdFailedToLoad' },
    BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
    BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
    MaxAdContentRating: { ParentalGuidance: 'ParentalGuidance' },
  }
})

describe('no loan data reaches the ad SDK', () => {
  it('the ads code imports nothing from the calculator, drafts, storage or content', () => {
    const files = readdirSync(ADS_DIR).filter((f) => f.endsWith('.ts'))
    expect(files.length).toBeGreaterThan(3)
    for (const f of files) {
      const src = readFileSync(join(ADS_DIR, f), 'utf8')
      const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2])
      for (const spec of imports) {
        expect(spec, `${f} imports ${spec}`).not.toMatch(/finance|features|storage|content|i18n|pages|components/)
      }
    }
  })

  it('the native adapter forwards only the whitelisted banner fields', async () => {
    const { AdMob } = await import('@capacitor-community/admob')
    const { createAdMobNative } = await import('../native-admob')
    const native = createAdMobNative()
    await native.showBanner({ adId: 'unit', adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 24, isTesting: true })
    const sent = vi.mocked(AdMob.showBanner).mock.calls[0]![0]
    expect(sent).toEqual({ adId: 'unit', adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 24, isTesting: true })
    await native.initialize()
    expect(vi.mocked(AdMob.initialize).mock.calls[0]![0]).toEqual({ maxAdContentRating: 'ParentalGuidance' })
  })

  it('maps consent info safely', async () => {
    const { toConsentInfo } = await import('../native-admob')
    expect(
      toConsentInfo({ status: 'OBTAINED', isConsentFormAvailable: true, canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' } as never),
    ).toEqual({ status: 'OBTAINED', canRequestAds: true, formAvailable: true, privacyOptionsRequired: true })
    expect(toConsentInfo({ status: 'SOMETHING_NEW' } as never)).toEqual({
      status: 'UNKNOWN',
      canRequestAds: false,
      formAvailable: false,
      privacyOptionsRequired: false,
    })
  })

  it('the app loads no remote web content (no Capacitor server.url)', () => {
    const config = readFileSync(join(ROOT, 'capacitor.config.ts'), 'utf8')
    expect(config).not.toMatch(/server\s*:/)
    expect(config).not.toMatch(/\burl\s*:/)
  })
})
