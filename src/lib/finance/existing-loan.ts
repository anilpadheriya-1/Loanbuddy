import type { LoanAnalysis } from './analyze'
import { calculateEmi, periodsToRepay } from './emi'
import { closureToday, lumpSumScenario, type ClosureResult, type LoanState, type ScenarioResult } from './prepayment'
import { PERIODS_PER_YEAR, valueOf, type LoanInput } from './types'

/**
 * "I already have this loan": work out where the loan stands today and what
 * continuing, closing or part-prepaying would cost from here.
 */
export interface ExistingLoanResult {
  status: 'ok' | 'insufficient'
  missing: string[]
  state: LoanState | null
  outstandingDerived: boolean
  remainingDerived: boolean
  remainingInterest: number
  remainingOutflow: number
  closure: ClosureResult | null
  /** Example: prepaying 10% of the outstanding now, reduce-tenure option. */
  samplePrepayment: ScenarioResult | null
  sampleAmount: number
}

export function analyzeExistingLoan(input: LoanInput, analysis: LoanAnalysis): ExistingLoanResult {
  const empty: ExistingLoanResult = {
    status: 'insufficient',
    missing: [],
    state: null,
    outstandingDerived: false,
    remainingDerived: false,
    remainingInterest: 0,
    remainingOutflow: 0,
    closure: null,
    samplePrepayment: null,
    sampleAmount: 0,
  }
  const ex = input.existing
  if (!ex || input.status !== 'existing') return { ...empty, missing: ['existing'] }
  const k = PERIODS_PER_YEAR[input.frequency]

  const rate = valueOf(ex.currentRatePct) ?? analysis.scheduleRatePct ?? analysis.quotedRatePct ?? undefined
  if (rate === undefined) return { ...empty, missing: ['currentRate'] }
  const emisPaid = valueOf(ex.emisPaid)
  let outstanding = valueOf(ex.outstanding)
  let remaining = valueOf(ex.remainingEmis)
  let emi = valueOf(ex.currentEmi) ?? (analysis.status === 'ok' ? analysis.emi : undefined)
  let outstandingDerived = false
  let remainingDerived = false

  if (outstanding === undefined && emisPaid !== undefined && analysis.schedule) {
    const row = analysis.schedule.rows[Math.min(emisPaid, analysis.schedule.rows.length) - 1]
    outstanding = emisPaid === 0 ? analysis.principal : row?.closing
    outstandingDerived = outstanding !== undefined
  }
  if (outstanding === undefined) return { ...empty, missing: ['outstanding'] }

  if (remaining === undefined && emisPaid !== undefined) {
    remaining = Math.max(0, input.tenurePeriods - emisPaid)
    remainingDerived = true
  }
  if (remaining === undefined && emi !== undefined) {
    const p = periodsToRepay(outstanding, rate, emi, k)
    if (Number.isFinite(p)) {
      remaining = Math.ceil(p - 1e-9)
      remainingDerived = true
    }
  }
  if (remaining === undefined || remaining <= 0) return { ...empty, missing: ['remainingEmis'] }
  if (emi === undefined) emi = calculateEmi(outstanding, rate, remaining, { periodsPerYear: k })

  const state: LoanState = { outstanding, annualRatePct: rate, remainingPeriods: remaining, emi, periodsPerYear: k }
  const gst = valueOf(input.prepayment.gstOnChargesPct) ?? 0
  const closure = closureToday(state, valueOf(input.prepayment.foreclosureCharge) ?? null, gst, valueOf(ex.foreclosureQuote))
  const sampleAmount = Math.round(outstanding * 0.1)
  const samplePrepayment = lumpSumScenario(state, {
    amount: sampleAmount,
    recast: 'tenure',
    charge: valueOf(input.prepayment.partPrepaymentCharge) ?? null,
    gstPct: gst,
  })
  return {
    status: 'ok',
    missing: [],
    state,
    outstandingDerived,
    remainingDerived,
    remainingInterest: closure.remainingInterest,
    remainingOutflow: closure.remainingInterest + outstanding,
    closure,
    samplePrepayment,
    sampleAmount,
  }
}
