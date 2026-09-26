import { describe, expect, it } from 'vitest'
import { analyzeLoan } from '../analyze'
import { toComparisonRow, sortComparison, differenceFromLowest } from '../compare'
import { assessConfidence } from '../confidence'
import { lenderQuestions } from '../lender-questions'
import { checkPrepaymentRules, type PrepaymentRuleInput } from '../prepayment-rules'
import { buildReport, emptyLoanInput } from '../report'
import { bandFor, costGapPoints, netDisbursementPoints, scoreLoan } from '../score'
import { known, unknown } from '../types'
import { charge, homeExample, rbiKfsExample } from './fixtures'

const baseRule: PrepaymentRuleInput = {
  sanctionDate: '2026-03-01',
  lenderCategory: 'bank',
  borrowerType: 'individual',
  purpose: 'personal',
  rateType: 'floating',
  sanctionedAmount: 30_00_000,
}

describe('RBI pre-payment rules (informational)', () => {
  const cases: [Partial<PrepaymentRuleInput>, string, string][] = [
    [{}, 'likely-no-charge', 'floating-individual-new'],
    [{ sanctionDate: '2024-06-01' }, 'likely-no-charge', 'floating-individual-old'],
    [{ sanctionDate: undefined }, 'likely-no-charge', 'floating-individual-any-date'],
    [{ lenderCategory: 'nbfc' }, 'likely-no-charge', 'floating-individual-new'],
    [{ rateType: 'fixed' }, 'lender-policy', 'fixed-rate'],
    [{ rateType: 'hybrid' }, 'cannot-determine', 'hybrid-depends'],
    [{ rateType: 'unknown' }, 'cannot-determine', 'missing-facts'],
    [{ lenderCategory: 'unknown' }, 'cannot-determine', 'lender-type-unknown'],
    [{ purpose: 'business' }, 'likely-no-charge', 'business-bank'],
    [{ purpose: 'business', borrowerType: 'mse', lenderCategory: 'small-finance-bank' }, 'likely-no-charge', 'business-upto-50l'],
    [{ purpose: 'business', lenderCategory: 'small-finance-bank', sanctionedAmount: 75_00_000 }, 'lender-policy', 'business-above-50l'],
    [{ purpose: 'business', lenderCategory: 'nbfc', nbfcLayer: 'upper' }, 'likely-no-charge', 'business-nbfc-ul'],
    [{ purpose: 'business', lenderCategory: 'nbfc', nbfcLayer: 'middle' }, 'likely-no-charge', 'business-upto-50l'],
    [{ purpose: 'business', lenderCategory: 'nbfc', nbfcLayer: 'base' }, 'lender-policy', 'business-nbfc-bl'],
    [{ purpose: 'business', lenderCategory: 'nbfc' }, 'cannot-determine', 'business-nbfc-layer'],
    [{ purpose: 'business', lenderCategory: 'cooperative-bank', coopTier: 'ucb-tier4' }, 'likely-no-charge', 'business-bank'],
    [{ purpose: 'business', lenderCategory: 'cooperative-bank' }, 'cannot-determine', 'business-coop-tier'],
    [{ purpose: 'business', sanctionDate: '2025-06-01' }, 'lender-policy', 'business-old'],
    [{ purpose: 'business', sanctionDate: undefined }, 'cannot-determine', 'business-date-needed'],
    [{ borrowerType: 'other', purpose: 'business' }, 'lender-policy', 'other-borrower'],
  ]
  it.each(cases)('%o → %s (%s)', (patch, status, reason) => {
    const r = checkPrepaymentRules({ ...baseRule, ...patch })
    expect(r.status).toBe(status)
    expect(r.reason).toBe(reason)
    expect(r.sourceIds.length).toBeGreaterThan(0)
  })
  it('lender-initiated prepayment under the 2025 directions', () => {
    expect(checkPrepaymentRules({ ...baseRule, rateType: 'fixed', initiatedByLender: true }).status).toBe('likely-no-charge')
  })
})

describe('data confidence', () => {
  it('RBI KFS example with documents is high', () => {
    const input = rbiKfsExample()
    expect(assessConfidence(input, analyzeLoan(input)).level).toBe('high')
  })
  it('home example (no documents, derived net) is medium', () => {
    const input = homeExample()
    expect(assessConfidence(input, analyzeLoan(input)).level).toBe('medium')
  })
  it('unknown charge amounts make it low', () => {
    const input = { ...homeExample(), charges: [charge({ category: 'legal', amount: unknown })] }
    const c = assessConfidence(input, analyzeLoan(input))
    expect(c.level).toBe('low')
    expect(c.reasons.map((r) => r.code)).toContain('charge-amounts-unknown')
  })
})

describe('Loan Deal Score', () => {
  it('component formulas', () => {
    expect(costGapPoints(0.1)).toBe(35)
    expect(costGapPoints(5)).toBe(0)
    expect(costGapPoints(2.625)).toBeCloseTo(17.5, 1)
    expect(netDisbursementPoints(1)).toBe(15)
    expect(netDisbursementPoints(0.9)).toBe(0)
    expect(bandFor(85)).toBe('strong')
    expect(bandFor(65)).toBe('review')
    expect(bandFor(45)).toBe('attention')
    expect(bandFor(10)).toBe('high-cost')
  })
  it('explains every component and sums to the total', () => {
    const input = rbiKfsExample()
    const a = analyzeLoan(input)
    const s = scoreLoan(input, a, assessConfidence(input, a))
    expect(s.components.map((c) => c.key)).toEqual(['cost-gap', 'fee-transparency', 'net-disbursement', 'prepayment', 'emi-consistency', 'documentation'])
    expect(s.components.reduce((t, c) => t + c.max, 0)).toBe(100)
    expect(s.total).toBe(Math.round(s.components.reduce((t, c) => t + c.points, 0)))
    for (const c of s.components) {
      expect(c.points).toBeGreaterThanOrEqual(0)
      expect(c.points).toBeLessThanOrEqual(c.max)
      expect(c.reason.code).toBeTruthy()
    }
    expect(s.provisional).toBe(false)
  })
  it('withholds the score when core data is missing', () => {
    const input = { ...emptyLoanInput(), sanctionedAmount: 1_00_000 }
    const a = analyzeLoan(input)
    const s = scoreLoan(input, a, assessConfidence(input, a))
    expect(s.total).toBeNull()
    expect(s.withheldReason).toEqual({ code: 'score-withheld-core' })
  })
  it('marks the score provisional when confidence is low', () => {
    const input = { ...homeExample(), charges: [charge({ category: 'legal', amount: unknown })] }
    const a = analyzeLoan(input)
    expect(scoreLoan(input, a, assessConfidence(input, a)).provisional).toBe(true)
  })
})

describe('lender questions', () => {
  it('asks about deductions, insurance and method', () => {
    const input = { ...homeExample(), rateMethod: 'unknown' as const }
    const codes = lenderQuestions(input, analyzeLoan(input)).map((q) => q.code)
    expect(codes).toEqual(expect.arrayContaining(['q-flat-or-reducing', 'q-kfs', 'q-explain-deduction', 'q-insurance-mandatory', 'q-prepayment']))
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('comparison', () => {
  it('sorts by effective cost without picking a winner', () => {
    const a = buildReport(homeExample())
    const b = buildReport({ ...homeExample(), charges: [], quotedRatePct: known(13) })
    const rows = [
      toComparisonRow('a', 'Offer A', a.input, a.analysis, a.score, a.confidence.level),
      toComparisonRow('b', 'Offer B', b.input, b.analysis, b.score, b.confidence.level),
    ]
    const sorted = sortComparison(rows, 'effective')
    expect(sorted[0].id).toBe('b') // 13% with no fees < 12% with ₹20,000 of fees
    expect(sortComparison(rows, 'emi')[0].id).toBe('a')
    expect(differenceFromLowest(rows, 'totalRepayment').get('a')).toBeGreaterThanOrEqual(0)
  })
})

describe('full report', () => {
  it('builds everything for the home example', () => {
    const r = buildReport(homeExample())
    expect(r.analysis.status).toBe('ok')
    expect(r.score.total).not.toBeNull()
    expect(r.savingsPreview!.extraMonthly.result.interestSaved).toBeGreaterThan(0)
    expect(r.prepaymentRule.status).toBe('cannot-determine')
  })
})
