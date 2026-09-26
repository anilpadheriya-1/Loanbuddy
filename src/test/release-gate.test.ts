import { describe, expect, it } from 'vitest'
import { appAdsLine, appAdsTxtAuthorises, publisherOf, validateAdmobIds, validateConfirmations } from '../../scripts/release-gate.mjs'

const APP = 'ca-app-pub-1234567890123456~1234567890'
const BANNER = 'ca-app-pub-1234567890123456/9876543210'

describe('release gate', () => {
  it('accepts real-format AdMob IDs from one account', () => {
    expect(validateAdmobIds(APP, BANNER)).toEqual([])
    expect(publisherOf(APP)).toBe('1234567890123456')
    expect(publisherOf(BANNER)).toBe('1234567890123456')
  })

  it("rejects Google's test IDs", () => {
    const errors = validateAdmobIds('ca-app-pub-3940256099942544~3347511713', 'ca-app-pub-3940256099942544/9214589741')
    expect(errors.join(' ')).toMatch(/test AdMob IDs/)
  })

  it('rejects missing, malformed, swapped and mismatched IDs', () => {
    expect(validateAdmobIds(undefined, undefined)).toHaveLength(2)
    expect(validateAdmobIds('', BANNER)[0]).toMatch(/ADMOB_APP_ID is not set/)
    expect(validateAdmobIds('pub-1234567890123456', BANNER)[0]).toMatch(/not an AdMob app ID/)
    expect(validateAdmobIds(BANNER, APP)).toHaveLength(2) // swapped
    expect(validateAdmobIds(APP, 'ca-app-pub-6543210987654321/9876543210').join(' ')).toMatch(/different AdMob accounts/)
  })

  it('checks app-ads.txt for the exact authorisation line', () => {
    expect(appAdsLine(APP)).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0')
    expect(appAdsTxtAuthorises('# ads\nGoogle.com,pub-1234567890123456,DIRECT,F08C47FEC0942FA0  # admob\n', APP)).toBe(true)
    expect(appAdsTxtAuthorises('google.com, pub-1234567890123456, RESELLER, f08c47fec0942fa0', APP)).toBe(false)
    expect(appAdsTxtAuthorises('google.com, pub-6543210987654321, DIRECT, f08c47fec0942fa0', APP)).toBe(false)
    expect(appAdsTxtAuthorises('anything', 'not-an-id')).toBe(false)
  })

  it('requires signing secrets and both human confirmations', () => {
    expect(validateConfirmations({ signing: 'true', dataSafety: 'true', consentTested: 'true' })).toEqual({ signing: [], dataSafety: [], consentTested: [] })
    const missing = validateConfirmations({ signing: 'false', dataSafety: 'false', consentTested: undefined })
    expect(missing.signing).toHaveLength(1)
    expect(missing.dataSafety).toHaveLength(1)
    expect(missing.consentTested).toHaveLength(1)
  })
})
