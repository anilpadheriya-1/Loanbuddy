import { describe, expect, it } from 'vitest'
import { buildSchedule, groupByYear } from '../amortization'
import { addMonths, parseIsoDate, periodsBetween } from '../dates'
import { calculateEmi, periodsToRepay, totalInterest } from '../emi'
import { flatRateLoan } from '../flat'
import { impliedAnnualRate } from '../implied-rate'
import { annualize, irr } from '../irr'
import { reconcileEmi } from '../reconcile'
import { findRoot } from '../solver'
import { xirr } from '../xirr'

describe('solver', () => {
  it('finds a simple root', () => {
    const r = findRoot((x) => x * x - 2, 0, 2)
    expect(r.ok && r.root).toBeCloseTo(Math.SQRT2, 10)
  })
  it('reports failure instead of inventing a number', () => {
    const r = findRoot((x) => x * x + 1, -1, 1)
    expect(r.ok).toBe(false)
  })
})

describe('EMI', () => {
  it('matches the RBI KFS illustration (₹20,000, 15%, 24 months → ₹969.73)', () => {
    expect(calculateEmi(20_000, 15, 24)).toBeCloseTo(969.73, 2)
  })
  it('handles zero interest (EMI = P / n)', () => {
    expect(calculateEmi(12_000, 0, 12)).toBe(1_000)
    expect(totalInterest(12_000, 0, 12)).toBe(0)
  })
  it('handles very small rates without blowing up', () => {
    expect(calculateEmi(12_000, 1e-10, 12)).toBeCloseTo(1_000, 6)
  })
  it('handles long tenures (30-year home loan)', () => {
    const emi = calculateEmi(50_00_000, 8.5, 360)
    expect(emi).toBeCloseTo(38_445.68, 1)
  })
  it('returns NaN for invalid input', () => {
    expect(calculateEmi(0, 10, 12)).toBeNaN()
    expect(calculateEmi(10_000, 10, 0)).toBeNaN()
  })
  it('supports advance EMIs and moratorium', () => {
    const regular = calculateEmi(1_00_000, 12, 24)
    const advance = calculateEmi(1_00_000, 12, 24, { advanceCount: 2 })
    const deferred = calculateEmi(1_00_000, 12, 24, { deferPeriods: 3 })
    expect(advance).toBeLessThan(regular)
    expect(deferred).toBeGreaterThan(regular)
  })
  it('periodsToRepay inverts the EMI formula', () => {
    const emi = calculateEmi(3_00_000, 10, 60)
    expect(periodsToRepay(3_00_000, 10, emi)).toBeCloseTo(60, 6)
    expect(periodsToRepay(3_00_000, 10, 100)).toBe(Infinity)
  })
})

describe('IRR / annualisation', () => {
  it('reproduces RBI KFS APR of 17.07% (monthly IRR × 12 on net disbursed ₹19,600)', () => {
    const emi = calculateEmi(20_000, 15, 24)
    const flows = [{ t: 0, amount: 19_600 }, ...Array.from({ length: 24 }, (_, i) => ({ t: i + 1, amount: -emi }))]
    const r = irr(flows)!
    expect(annualize(r).aprStylePct).toBeCloseTo(17.07, 2)
    expect(annualize(r).effectiveAnnualPct).toBeCloseTo(18.47, 1)
  })
  it('returns null when there is nothing to solve', () => {
    expect(irr([{ t: 0, amount: 100 }])).toBeNull()
  })
})

describe('implied rate (reverse EMI check)', () => {
  it('round-trips with the EMI formula', () => {
    for (const rate of [0, 6.5, 10.99, 24, 36]) {
      const emi = calculateEmi(2_50_000, rate, 48)
      expect(impliedAnnualRate(2_50_000, emi, 48)).toBeCloseTo(rate, 6)
    }
  })
})

describe('flat rate', () => {
  it('10% flat for 3 years ≈ 17.92% reducing-balance equivalent', () => {
    const f = flatRateLoan(1_00_000, 10, 36)
    expect(f.totalInterest).toBe(30_000)
    expect(f.emi).toBeCloseTo(3_611.11, 2)
    // Cross-checked with an independent Python IRR: 17.9177%
    expect(f.reducingEquivalentPct).toBeCloseTo(17.9177, 3)
  })
})

describe('reconciliation', () => {
  it('treats ₹0.27 rounding as a match', () => {
    const r = reconcileEmi({ principal: 20_000, quotedRatePct: 15, emi: 970, n: 24, method: 'reducing' })
    expect(r.status).toBe('match')
  })
  it('detects an EMI that matches a flat-rate calculation', () => {
    const r = reconcileEmi({ principal: 1_00_000, quotedRatePct: 10, emi: 3_611, n: 36, method: 'unknown' })
    expect(r.status).toBe('matches-flat')
    expect(r.possibleReasons).toContain('flat-method')
  })
  it('flags a mismatch with neutral possible reasons', () => {
    const r = reconcileEmi({ principal: 5_00_000, quotedRatePct: 12, emi: 17_200, n: 36, method: 'reducing' })
    expect(r.status).toBe('mismatch')
    expect(r.difference).toBeGreaterThan(500)
    expect(r.impliedRatePct!).toBeGreaterThan(12)
    expect(r.possibleReasons).toEqual(expect.arrayContaining(['insurance-in-emi', 'rate-reset']))
  })
})

describe('amortisation', () => {
  it('closes exactly to ₹0 and totals reconcile', () => {
    const s = buildSchedule({ principal: 5_00_000, annualRatePct: 12, periods: 44 })
    const last = s.rows[s.rows.length - 1]
    expect(last.closing).toBe(0)
    expect(s.rows).toHaveLength(44)
    const principalSum = s.rows.reduce((a, r) => a + r.principal, 0)
    expect(principalSum).toBeCloseTo(5_00_000, 2)
    expect(s.totalPaid).toBeCloseTo(5_00_000 + s.totalInterest, 2)
  })
  it('zero-interest schedule has no interest', () => {
    const s = buildSchedule({ principal: 12_000, annualRatePct: 0, periods: 12 })
    expect(s.totalInterest).toBe(0)
    expect(s.rows.every((r) => r.emi === 1_000)).toBe(true)
  })
  it('extra payments shorten the tenure', () => {
    const base = buildSchedule({ principal: 20_00_000, annualRatePct: 9, periods: 240 })
    const extra = buildSchedule({ principal: 20_00_000, annualRatePct: 9, periods: 240, extraPerPeriod: 5_000 })
    expect(extra.periodsUsed).toBeLessThan(base.periodsUsed)
    expect(extra.totalInterest).toBeLessThan(base.totalInterest)
    expect(extra.rows[extra.rows.length - 1].closing).toBe(0)
  })
  it('groups rows by year', () => {
    const s = buildSchedule({ principal: 1_00_000, annualRatePct: 10, periods: 30 })
    const years = groupByYear(s.rows)
    expect(years).toHaveLength(3)
    expect(years[2].closing).toBe(0)
    expect(years.reduce((a, y) => a + y.interest, 0)).toBeCloseTo(s.totalInterest, 1)
  })
})

describe('dates & XIRR', () => {
  it('clamps month ends', () => {
    expect(addMonths(parseIsoDate('2026-01-31')!, 1).toISOString().slice(0, 10)).toBe('2026-02-28')
  })
  it('measures a regular first EMI as exactly one period', () => {
    expect(periodsBetween(parseIsoDate('2026-01-05')!, parseIsoDate('2026-02-05')!, 12)).toBe(1)
    expect(periodsBetween(parseIsoDate('2026-01-05')!, parseIsoDate('2026-02-20')!, 12)).toBeCloseTo(1 + 15 / (365 / 12), 6)
  })
  it('XIRR of regular monthly flows ≈ compounded effective annual rate', () => {
    const emi = calculateEmi(1_00_000, 12, 12)
    const flows = [{ date: '2026-01-01', amount: 1_00_000 }]
    for (let i = 1; i <= 12; i++) flows.push({ date: addMonths(parseIsoDate('2026-01-01')!, i).toISOString().slice(0, 10), amount: -emi })
    const x = xirr(flows)!
    expect(x * 100).toBeCloseTo(12.68, 0)
  })
  it('XIRR rejects invalid dates', () => {
    expect(xirr([{ date: 'not-a-date', amount: 1 }, { date: '2026-01-01', amount: -2 }])).toBeNull()
  })
})
