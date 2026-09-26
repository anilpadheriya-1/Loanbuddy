import { buildSchedule } from './amortization'
import { baselineSchedule, chargeAmount, stateEmi, type LoanState } from './prepayment'
import type { ChargeRate } from './types'

/**
 * Balance transfer / refinance: move the outstanding balance to a new lender.
 * A lower rate does NOT automatically save money: processing, legal and
 * valuation fees, any foreclosure charge on the old loan, and a longer new
 * tenure can wipe out the benefit.
 */
export interface BalanceTransferInput {
  current: LoanState
  newRatePct: number
  /** New tenure in periods (defaults to the remaining tenure). */
  newTenurePeriods?: number
  newProcessingFee: number
  legalValuationFees: number
  otherCosts: number
  /** Foreclosure charge on the existing loan, if any. */
  currentForeclosureCharge?: ChargeRate | null
  gstPct?: number
}

export interface BalanceTransferResult {
  currentEmi: number
  newEmi: number
  /** Interest still payable if you stay. */
  currentRemainingInterest: number
  /** Interest payable on the new loan. */
  newInterest: number
  transferCosts: number
  /** Total outflow staying vs switching (principal + interest + costs). */
  currentTotalOutflow: number
  newTotalOutflow: number
  netSavings: number
  /** Month in which cumulative EMI savings first exceed transfer costs; null if never. */
  breakEvenPeriod: number | null
  worthConsidering: boolean
}

export function balanceTransfer(input: BalanceTransferInput): BalanceTransferResult {
  const k = input.current.periodsPerYear ?? 12
  const baseline = baselineSchedule(input.current)
  const newTenure = Math.max(1, Math.floor(input.newTenurePeriods ?? input.current.remainingPeriods))
  const next = buildSchedule({
    principal: input.current.outstanding,
    annualRatePct: input.newRatePct,
    periods: newTenure,
    periodsPerYear: k,
  })
  const gstPct = input.gstPct ?? 0
  const foreclosure = chargeAmount(input.currentForeclosureCharge, input.current.outstanding, gstPct).total
  const feesGst = ((input.newProcessingFee + input.legalValuationFees) * gstPct) / 100
  const transferCosts = input.newProcessingFee + input.legalValuationFees + input.otherCosts + feesGst + foreclosure

  const currentTotalOutflow = baseline.totalPaid
  const newTotalOutflow = next.totalPaid + transferCosts
  const netSavings = currentTotalOutflow - newTotalOutflow

  // Break-even: first month in which interest saved so far covers the transfer costs.
  let breakEvenPeriod: number | null = null
  const len = Math.max(baseline.rows.length, next.rows.length)
  for (let i = 0; i < len; i++) {
    const oldInt = baseline.rows[Math.min(i, baseline.rows.length - 1)].cumulativeInterest
    const newInt = next.rows[Math.min(i, next.rows.length - 1)].cumulativeInterest
    if (oldInt - newInt >= transferCosts) {
      breakEvenPeriod = i + 1
      break
    }
  }
  return {
    currentEmi: stateEmi(input.current),
    newEmi: next.emi,
    currentRemainingInterest: baseline.totalInterest,
    newInterest: next.totalInterest,
    transferCosts,
    currentTotalOutflow,
    newTotalOutflow,
    netSavings,
    breakEvenPeriod: netSavings > 0 ? breakEvenPeriod : null,
    worthConsidering: netSavings > 0,
  }
}
