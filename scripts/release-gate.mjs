#!/usr/bin/env node
/**
 * Release gate for a Play Store build. Run by .github/workflows/release.yml
 * before anything is built; exits 1 unless every check passes.
 *
 * Environment:
 *   ADMOB_APP_ID, ADMOB_BANNER_ID      real AdMob IDs (repository variables)
 *   PRIVACY_POLICY_URL, APP_ADS_TXT_URL deployed pages to check
 *   SIGNING_SECRETS_PRESENT            'true' when all four signing secrets are set
 *   DATA_SAFETY_COMPLETED              'true' (workflow input, confirmed by a person)
 *   CONSENT_TESTED_ON_REAL_PHONE       'true' (workflow input, confirmed by a person)
 */
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Google's sample publisher: its IDs only ever serve test ads. */
export const TEST_PUBLISHER = '3940256099942544'
/** Google's certification authority ID, the last field of every AdMob app-ads.txt line. */
export const GOOGLE_TAG_ID = 'f08c47fec0942fa0'

const APP_ID = /^ca-app-pub-(\d{16})~\d{8,12}$/
const AD_UNIT = /^ca-app-pub-(\d{16})\/\d{8,12}$/

export function publisherOf(id) {
  const m = APP_ID.exec(id ?? '') ?? AD_UNIT.exec(id ?? '')
  return m ? m[1] : null
}

/** Problems with the AdMob IDs; an empty list means they are fit for release. */
export function validateAdmobIds(appId, bannerId) {
  const errors = []
  const app = (appId ?? '').trim()
  const banner = (bannerId ?? '').trim()
  if (!app) errors.push('ADMOB_APP_ID is not set.')
  else if (!APP_ID.test(app)) errors.push(`ADMOB_APP_ID "${app}" is not an AdMob app ID (ca-app-pub-<16 digits>~<digits>).`)
  if (!banner) errors.push('ADMOB_BANNER_ID is not set.')
  else if (!AD_UNIT.test(banner)) errors.push(`ADMOB_BANNER_ID "${banner}" is not an AdMob ad unit ID (ca-app-pub-<16 digits>/<digits>).`)
  if (app.includes(TEST_PUBLISHER) || banner.includes(TEST_PUBLISHER)) errors.push("Google's test AdMob IDs cannot be used in a release.")
  const a = publisherOf(app)
  const b = publisherOf(banner)
  if (a && b && a !== b) errors.push(`The app ID (pub-${a}) and banner ID (pub-${b}) belong to different AdMob accounts.`)
  return errors
}

export function appAdsLine(appId) {
  const publisher = publisherOf(appId)
  return publisher ? `google.com, pub-${publisher}, DIRECT, ${GOOGLE_TAG_ID}` : null
}

/** True when app-ads.txt authorises this AdMob account (whitespace and case tolerant). */
export function appAdsTxtAuthorises(text, appId) {
  const line = appAdsLine(appId)
  if (!line) return false
  const norm = (s) => s.split('#')[0].replace(/\s+/g, '').toLowerCase()
  return (text ?? '').split(/\r?\n/).some((l) => norm(l) === norm(line))
}

/** Problems per confirmation; each list is empty when that item is confirmed. */
export function validateConfirmations({ signing, dataSafety, consentTested }) {
  return {
    signing:
      signing === 'true'
        ? []
        : ['Signing secrets are missing (ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD).'],
    dataSafety: dataSafety === 'true' ? [] : ['Confirm the Play Console Data safety form is complete (workflow input data_safety_completed).'],
    consentTested:
      consentTested === 'true' ? [] : ['Confirm the consent flow was tested on a real phone (workflow input consent_tested_on_real_phone).'],
  }
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) })
  return { status: res.status, text: await res.text() }
}

async function checkPage(label, url, check) {
  if (!url) return [`${label} is not set.`]
  if (!/^https:\/\//.test(url)) return [`${label} must be an https:// URL (got ${url}).`]
  try {
    const { status, text } = await fetchText(url)
    if (status !== 200) return [`${label} returned HTTP ${status} (${url}).`]
    return check(text)
  } catch (e) {
    return [`${label} could not be fetched (${url}): ${e.message}`]
  }
}

async function main() {
  const env = process.env
  const rows = []
  const add = (item, errors, evidence) => rows.push({ item, errors, evidence })

  add('Real ADMOB_APP_ID and ADMOB_BANNER_ID', validateAdmobIds(env.ADMOB_APP_ID, env.ADMOB_BANNER_ID), `publisher pub-${publisherOf(env.ADMOB_APP_ID) ?? '?'}`)
  const confirmed = validateConfirmations({
    signing: env.SIGNING_SECRETS_PRESENT,
    dataSafety: env.DATA_SAFETY_COMPLETED,
    consentTested: env.CONSENT_TESTED_ON_REAL_PHONE,
  })
  add('Signing secrets present (signed AAB)', confirmed.signing, 'all four secrets set')
  add(
    'Privacy policy deployed',
    await checkPage('PRIVACY_POLICY_URL', env.PRIVACY_POLICY_URL, (t) => (/AdMob/i.test(t) ? [] : ['The privacy policy does not mention AdMob ads.'])),
    env.PRIVACY_POLICY_URL,
  )
  add(
    'app-ads.txt deployed',
    await checkPage('APP_ADS_TXT_URL', env.APP_ADS_TXT_URL, (t) =>
      appAdsTxtAuthorises(t, env.ADMOB_APP_ID) ? [] : [`app-ads.txt does not contain "${appAdsLine(env.ADMOB_APP_ID) ?? 'google.com, pub-…, DIRECT, ' + GOOGLE_TAG_ID}".`],
    ),
    env.APP_ADS_TXT_URL,
  )
  add('Data safety form completed', confirmed.dataSafety, 'confirmed in the workflow run')
  add('Consent flow tested on a real phone', confirmed.consentTested, 'confirmed in the workflow run')

  const failed = rows.filter((r) => r.errors.length)
  const summary = [
    '## Release gate',
    '',
    '| Check | Result |',
    '|---|---|',
    ...rows.map((r) => `| ${r.item} | ${r.errors.length ? '❌ ' + r.errors.join(' ') : '✅ ' + (r.evidence ?? '')} |`),
    '',
    'Also required before the AAB is built (next jobs): all unit + e2e tests, the website build contains no AdMob code, and the Android emulator checks (offline, consent, no overlap, lifecycle).',
    '',
  ].join('\n')
  console.log(summary)
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, summary)
  if (failed.length) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
