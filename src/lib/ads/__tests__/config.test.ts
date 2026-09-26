import { describe, expect, it } from 'vitest'
import { TEST_BANNER_ID, bannerAdUnit, bannerOptions, consentDebug, isTestAdId, parsePx, routeAllowsBanner } from '../config'

describe('ad config', () => {
  it('uses Google test ads unless a real banner unit is configured', () => {
    expect(bannerAdUnit(undefined)).toEqual({ adId: TEST_BANNER_ID, isTesting: true })
    expect(bannerAdUnit('  ')).toEqual({ adId: TEST_BANNER_ID, isTesting: true })
    expect(bannerAdUnit('ca-app-pub-3940256099942544/6300978111').isTesting).toBe(true)
    expect(bannerAdUnit('ca-app-pub-1234567890123456/1234567890')).toEqual({
      adId: 'ca-app-pub-1234567890123456/1234567890',
      isTesting: false,
    })
  })

  it('honours consent-debug overrides only with test ads', () => {
    const test = bannerAdUnit(undefined)
    const real = bannerAdUnit('ca-app-pub-1234567890123456/1234567890')
    expect(consentDebug(test, 'eea')).toEqual({ eea: true, testDevices: [] })
    expect(consentDebug(test, undefined, { geography: 'EEA', testDevices: 'ABC, DEF,' })).toEqual({ eea: true, testDevices: ['ABC', 'DEF'] })
    expect(consentDebug(test, 'EEA', { geography: '' })).toBeNull()
    expect(consentDebug(real, 'EEA', { geography: 'EEA', testDevices: 'ABC' })).toBeNull()
    expect(consentDebug(test, undefined)).toBeNull()
  })

  it('keeps banners off the wizard and Ask Your Lender forms only', () => {
    expect(routeAllowsBanner('/check-loan')).toBe(false)
    expect(routeAllowsBanner('/check-loan/')).toBe(false)
    expect(routeAllowsBanner('/ask-lender')).toBe(false)
    for (const p of ['/', '/check-loan/results', '/savings', '/compare', '/learn', '/learn/apr', '/rules', '/privacy', '/my-loans']) {
      expect(routeAllowsBanner(p), p).toBe(true)
    }
  })

  it('builds exactly the whitelisted request', () => {
    expect(bannerOptions({ adId: 'x', isTesting: false }, 47.6)).toEqual({
      adId: 'x',
      adSize: 'ADAPTIVE_BANNER',
      position: 'BOTTOM_CENTER',
      margin: 48,
      isTesting: false,
    })
    expect(bannerOptions({ adId: 'x', isTesting: true }, -3).margin).toBe(0)
  })

  it('parses injected inset values', () => {
    expect(parsePx('48px')).toBe(48)
    expect(parsePx(' 0px')).toBe(0)
    expect(parsePx('')).toBe(0)
    expect(parsePx(undefined)).toBe(0)
    expect(isTestAdId('ca-app-pub-3940256099942544~3347511713')).toBe(true)
  })
})
