import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SOURCES } from '@/content/sources'
import { ARTICLES, articleBySlug } from '@/content/articles'
import { LENDER_LIBRARY, isDisplayableAsVerified } from '@/content/lender-library'
import { en } from '@/lib/i18n/en'
import { hi } from '@/lib/i18n/hi'
import { checkPrepaymentRules } from '@/lib/finance'

const SRC = join(__dirname, '..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) return f === '__tests__' || f === 'test' ? [] : walk(p)
    return /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : []
  })
}
const FILES = walk(SRC)

describe('regulatory sources', () => {
  it('every source has an official https URL, dates, status and summary', () => {
    const ids = new Set<string>()
    for (const s of SOURCES) {
      expect(ids.has(s.id), `duplicate ${s.id}`).toBe(false)
      ids.add(s.id)
      expect(s.url, s.id).toMatch(/^https:\/\//)
      expect(s.date, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(s.lastVerified, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(['current', 'consolidated', 'historical', 'verify']).toContain(s.status)
      expect(s.summary.length, s.id).toBeGreaterThan(40)
    }
  })
  it('historical sources are clearly marked as not current', () => {
    for (const s of SOURCES.filter((x) => x.status === 'historical')) {
      expect(s.statusNote ?? '').toMatch(/HISTORICAL — NOT CURRENT RULE/)
    }
  })
  it('every source id referenced by articles and rules exists', () => {
    const ids = new Set(SOURCES.map((s) => s.id))
    for (const a of ARTICLES) for (const id of a.sourceIds ?? []) expect(ids.has(id), `${a.slug} → ${id}`).toBe(true)
    const r = checkPrepaymentRules({ lenderCategory: 'bank', borrowerType: 'individual', purpose: 'personal', rateType: 'floating', sanctionedAmount: 1, sanctionDate: '2026-02-01' })
    for (const id of r.sourceIds) expect(ids.has(id)).toBe(true)
    for (const id of ['rbi-foreclosure-2019', 'rbi-rbc-banks-2025', 'rbi-penal-2023', 'cbic-exemption-2017', 'rbi-ios-2026']) expect(ids.has(id)).toBe(true)
  })
})

describe('articles', () => {
  it('have unique slugs, questions, and valid related links', () => {
    const slugs = ARTICLES.map((a) => a.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(ARTICLES.length).toBeGreaterThanOrEqual(20)
    for (const a of ARTICLES) {
      expect(a.questions.length, a.slug).toBeGreaterThan(0)
      for (const r of a.related ?? []) expect(articleBySlug(r), `${a.slug} → ${r}`).toBeDefined()
    }
  })
})

describe('lender library', () => {
  it('ships no invented rates', () => {
    expect(LENDER_LIBRARY).toHaveLength(0)
    expect(
      isDisplayableAsVerified({
        lender: 'X', product: 'Y', loanType: 'personal', minRatePct: 10, maxRatePct: 12, rateMethod: 'reducing',
        processingFee: null, otherCharges: null, sourceUrl: null, sourceDate: null, verifiedOn: null, status: 'verified',
      }),
    ).toBe(false)
  })
})

describe('copy rules', () => {
  // The app must never label a lender with these words based on calculations.
  const BANNED_EN = /\b(fraud\w*|fake|cheat\w*|scam\w*|illegal\w*|hidden)\b/i
  const BANNED_HI = /(धोखा|धोखाधड़ी|फ़र्ज़ी|फर्जी|घोटाला|अवैध|छिपा|छुपा)/
  // Strip code that is not user-visible text (class names, aria attributes, CSS utilities).
  const visible = (line: string) =>
    line
      .replace(/className=("[^"]*"|\{[^}]*\}|`[^`]*`)/g, '')
      .replace(/aria-hidden/g, '')
      .replace(/[\w-]+:hidden|[\w]+-hidden/g, '')
      .replace(/'(hidden|block|flex)'/g, '')
  it('no accusatory words in UI copy, content or dictionaries', () => {
    const offenders: string[] = []
    for (const f of FILES) {
      const text = readFileSync(f, 'utf8')
      text.split('\n').forEach((line, i) => {
        const v = visible(line)
        if (BANNED_EN.test(v) || BANNED_HI.test(v)) offenders.push(`${f.replace(SRC, 'src')}:${i + 1}: ${line.trim()}`)
      })
    }
    expect(offenders).toEqual([])
  })
  it('rupees only: no dollar amounts, USD or en-US number formatting', () => {
    const offenders: string[] = []
    for (const f of FILES) {
      const text = readFileSync(f, 'utf8')
      text.split('\n').forEach((line, i) => {
        if (/\$\s?\d|\bUSD\b|\bdollars?\b|en-US/i.test(line)) offenders.push(`${f.replace(SRC, 'src')}:${i + 1}: ${line.trim()}`)
      })
    }
    expect(offenders).toEqual([])
  })
  it('no "Apply Now" call to action or invented social proof', () => {
    for (const f of FILES) {
      const lines = readFileSync(f, 'utf8').split('\n')
      for (const line of lines) {
        expect(line, f).not.toMatch(/partner lenders|customers served|crore disbursed|loans disbursed/i)
        // "Apply Now" may only appear when saying we DON'T have it.
        if (/apply now/i.test(line)) expect(line, f).toMatch(/\bno\b|there is no/i)
      }
    }
  })
})

describe('i18n', () => {
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  it('Hindi uses the same placeholders as English', () => {
    for (const [k, v] of Object.entries(hi)) {
      const base = (en as Record<string, string>)[k]
      expect(base, `unknown key ${k}`).toBeDefined()
      expect(placeholders(v!), k).toBe(placeholders(base))
    }
  })
  it('Hindi covers the whole core flow', () => {
    const missing = Object.keys(en).filter((k) => !(k in hi))
    expect(missing).toEqual([])
  })
})
