import { describe, expect, it } from 'vitest'
import { balanceTransfer } from '../balance-transfer'
import { analyzeLoan } from '../analyze'
import { analyzeExistingLoan } from '../existing-loan'
import {
  annualLumpSumScenario,
  chargeAmount,
  closureToday,
  contingentCost,
  extraPaymentScenario,
  lumpSumScenario,
  minimumWorthwhilePrepayment,
  rateChangeScenario,
  tenureVsEmi,
  type LoanState,
} from '../prepayment'
import { emptyLoanInput } from '../report'
import { known } from '../types'

const home: LoanState = { outstanding: 40_00_000, annualRatePct: 8.75, remainingPeriods: 240 }

describe('extra monthly payment', () => {
  it('₹5,000 extra per month shortens tenure and saves interest', () => {
    const r = extraPaymentScenario(home, 5_000)
    expect(r.periodsSaved).toBeGreaterThan(30)
    expect(r.interestSaved).toBeGreaterThan(5_00_000)
    expect(r.netSavings).toBe(r.interestSaved)
    expect(r.breakEvenPeriod).toBe(0)
  })
  it('₹0 extra changes nothing', () => {
    const r = extraPaymentScenario(home, 0)
    expect(r.interestSaved).toBe(0)
    expect(r.periodsSaved).toBe(0)
  })
})

describe('one-time prepayment', () => {
  it('reduce tenure saves more interest than reduce EMI for the same amount', () => {
    const { reduceEmi, reduceTenure } = tenureVsEmi(home, 5_00_000)
    expect(reduceTenure.interestSaved).toBeGreaterThan(reduceEmi.interestSaved)
    expect(reduceTenure.newTenure).toBeLessThan(240)
    expect(reduceEmi.newTenure).toBe(240)
    expect(reduceEmi.newEmi).toBeLessThan(reduceTenure.newEmi)
  })
  it('subtracts prepayment charges (+GST) and finds the break-even month', () => {
    const r = lumpSumScenario(home, { amount: 2_00_000, recast: 'tenure', charge: { mode: 'percent', value: 2 }, gstPct: 18 })
    expect(r.strategyCosts).toBeCloseTo(4_720, 2)
    expect(r.netSavings).toBeCloseTo(r.interestSaved - 4_720, 2)
    expect(r.breakEvenPeriod).toBeGreaterThan(0)
  })
  it('annual lump sums save interest', () => {
    const r = annualLumpSumScenario(home, 1_00_000)
    expect(r.interestSaved).toBeGreaterThan(0)
    expect(r.newTenure).toBeLessThan(240)
  })
  it('minimum worthwhile prepayment with a fixed charge', () => {
    const state: LoanState = { outstanding: 3_00_000, annualRatePct: 14, remainingPeriods: 12 }
    const min = minimumWorthwhilePrepayment(state, { mode: 'fixed', value: 1_000 })!
    expect(min).toBeGreaterThan(0)
    const at = lumpSumScenario(state, { amount: min, recast: 'tenure', charge: { mode: 'fixed', value: 1_000 } })
    expect(at.netSavings).toBeGreaterThanOrEqual(-1)
    expect(minimumWorthwhilePrepayment(state, null)).toBe(0)
  })
})

describe('rate change / negotiation', () => {
  it('a lower rate keeping EMI shortens tenure; keeping tenure lowers EMI', () => {
    const keepEmi = rateChangeScenario(home, 8.25, 'emi')
    const keepTenure = rateChangeScenario(home, 8.25, 'tenure')
    expect(keepEmi.newTenure).toBeLessThan(240)
    expect(keepTenure.newTenure).toBe(240)
    expect(keepEmi.interestSaved).toBeGreaterThan(keepTenure.interestSaved)
  })
})

describe('closure & contingent costs', () => {
  it('closing today saves remaining interest minus charges', () => {
    const state: LoanState = { outstanding: 1_00_000, annualRatePct: 16, remainingPeriods: 12 }
    const c = closureToday(state, { mode: 'percent', value: 4 }, 18)
    expect(c.charge).toBe(4_000)
    expect(c.gst).toBeCloseTo(720, 6)
    expect(c.payoff).toBeCloseTo(1_04_720, 6)
    expect(c.netSavings).toBeCloseTo(c.remainingInterest - 4_720, 6)
  })
  it('a lender foreclosure quote overrides the formula', () => {
    const state: LoanState = { outstanding: 1_00_000, annualRatePct: 16, remainingPeriods: 12 }
    expect(closureToday(state, { mode: 'percent', value: 4 }, 18, 1_03_000).charge).toBe(3_000)
  })
  it('contingent cost = per event × events (+GST)', () => {
    expect(contingentCost(500, 3)).toBe(1_500)
    expect(chargeAmount({ mode: 'fixed', value: 500 }, 0, 18).total).toBeCloseTo(590, 6)
  })
})

describe('balance transfer', () => {
  it('a lower rate can still lose money after costs', () => {
    const r = balanceTransfer({
      current: { outstanding: 3_00_000, annualRatePct: 10, remainingPeriods: 12 },
      newRatePct: 9.5,
      newProcessingFee: 3_000,
      legalValuationFees: 2_000,
      otherCosts: 0,
      gstPct: 18,
    })
    expect(r.netSavings).toBeLessThan(0)
    expect(r.worthConsidering).toBe(false)
    expect(r.breakEvenPeriod).toBeNull()
  })
  it('a large rate cut on a long loan saves money and breaks even', () => {
    const r = balanceTransfer({
      current: { outstanding: 40_00_000, annualRatePct: 9.5, remainingPeriods: 216 },
      newRatePct: 8.4,
      newProcessingFee: 10_000,
      legalValuationFees: 5_000,
      otherCosts: 2_000,
      gstPct: 18,
    })
    expect(r.netSavings).toBeGreaterThan(2_00_000)
    expect(r.breakEvenPeriod).toBeGreaterThan(0)
    expect(r.breakEvenPeriod!).toBeLessThan(12)
    expect(r.newEmi).toBeLessThan(r.currentEmi)
  })
})

describe('existing loan', () => {
  it('derives outstanding from EMIs paid and computes closure savings', () => {
    const input = {
      ...emptyLoanInput(),
      status: 'existing' as const,
      sanctionedAmount: 5_00_000,
      tenurePeriods: 36,
      quotedRatePct: known(12),
      rateType: 'fixed' as const,
      rateMethod: 'reducing' as const,
      allChargesListed: 'yes' as const,
      prepayment: { ...emptyLoanInput().prepayment, foreclosureCharge: known({ mode: 'percent' as const, value: 3 }), gstOnChargesPct: known(18) },
      existing: {
        emisPaid: known(12),
        outstanding: { kind: 'unknown' as const },
        remainingEmis: { kind: 'unknown' as const },
        currentRatePct: { kind: 'unknown' as const },
        currentEmi: { kind: 'unknown' as const },
        foreclosureQuote: { kind: 'unknown' as const },
      },
    }
    const a = analyzeLoan(input)
    const e = analyzeExistingLoan(input, a)
    expect(e.status).toBe('ok')
    expect(e.outstandingDerived).toBe(true)
    expect(e.state!.remainingPeriods).toBe(24)
    expect(e.state!.outstanding).toBeCloseTo(a.schedule!.rows[11].closing, 2)
    expect(e.closure!.netSavings).toBeCloseTo(e.remainingInterest - e.state!.outstanding * 0.03 * 1.18, 0)
    expect(e.samplePrepayment!.interestSaved).toBeGreaterThan(0)
  })
})

describe('optional charges review', () => {
  it('shows how much an optional insurance premium adds', async () => {
    const { optionalChargeImpacts } = await import('../optional-charges')
    const { homeExample } = await import('./fixtures')
    const impacts = optionalChargeImpacts(homeExample())
    expect(impacts).toHaveLength(1) // processing is mandatory; insurance is "unknown"
    expect(impacts[0].name).toBe('Loan protection insurance')
    expect(impacts[0].rupeesSaved).toBeCloseTo(8_000, 0)
    expect(impacts[0].ppSaved).toBeGreaterThan(0.5)
  })
})
