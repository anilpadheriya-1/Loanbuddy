import { buildSchedule, type Schedule } from './amortization'
import { calculateEmi } from './emi'
import type { ChargeRate } from './types'

/**
 * Prepayment and savings scenarios on an outstanding reducing-balance loan.
 * All scenarios compare a "baseline" schedule with a "scenario" schedule
 * from the same starting point, so savings are like-for-like.
 */

export interface LoanState {
  /** Outstanding principal today, ₹. */
  outstanding: number
  annualRatePct: number
  /** Remaining number of EMIs. */
  remainingPeriods: number
  /** Current EMI; computed from rate and remaining tenure if omitted. */
  emi?: number
  periodsPerYear?: number
}

export function chargeAmount(rate: ChargeRate | null | undefined, base: number, gstPct = 0): { charge: number; gst: number; total: number } {
  if (!rate) return { charge: 0, gst: 0, total: 0 }
  const charge = rate.mode === 'percent' ? (base * rate.value) / 100 : rate.value
  const gst = (charge * gstPct) / 100
  return { charge, gst, total: charge + gst }
}

export function stateEmi(state: LoanState): number {
  return state.emi ?? calculateEmi(state.outstanding, state.annualRatePct, state.remainingPeriods, { periodsPerYear: state.periodsPerYear ?? 12 })
}

export function baselineSchedule(state: LoanState): Schedule {
  return buildSchedule({
    principal: state.outstanding,
    annualRatePct: state.annualRatePct,
    periods: state.remainingPeriods,
    periodsPerYear: state.periodsPerYear,
    emi: stateEmi(state),
  })
}

export interface ScenarioResult {
  baseline: Schedule
  scenario: Schedule
  /** Interest saved versus the baseline, ₹. */
  interestSaved: number
  /** Periods saved (tenure reduction). */
  periodsSaved: number
  newTenure: number
  /** EMI after the change (differs only when the EMI is reduced). */
  newEmi: number
  /** Charges + GST caused by the strategy (e.g. prepayment charge), ₹. */
  strategyCosts: number
  /** interestSaved − strategyCosts. */
  netSavings: number
  /** First period in which cumulative interest saved ≥ strategy costs; null if never; 0 if no cost. */
  breakEvenPeriod: number | null
}

function compare(baseline: Schedule, scenario: Schedule, strategyCosts: number): ScenarioResult {
  const interestSaved = baseline.totalInterest - scenario.totalInterest
  let breakEvenPeriod: number | null = strategyCosts <= 0 ? 0 : null
  if (strategyCosts > 0) {
    for (let i = 0; i < baseline.rows.length; i++) {
      const b = baseline.rows[i].cumulativeInterest
      const sCum = i < scenario.rows.length ? scenario.rows[i].cumulativeInterest : scenario.totalInterest
      if (b - sCum >= strategyCosts) {
        breakEvenPeriod = i + 1
        break
      }
    }
  }
  return {
    baseline,
    scenario,
    interestSaved,
    periodsSaved: baseline.periodsUsed - scenario.periodsUsed,
    newTenure: scenario.periodsUsed,
    newEmi: scenario.rows.length > 1 ? scenario.rows[Math.min(1, scenario.rows.length - 1)].emi : scenario.emi,
    strategyCosts,
    netSavings: interestSaved - strategyCosts,
    breakEvenPeriod,
  }
}

/** Pay a fixed extra amount with every EMI (tenure shortens, EMI unchanged). */
export function extraPaymentScenario(state: LoanState, extraPerPeriod: number): ScenarioResult {
  const baseline = baselineSchedule(state)
  const scenario = buildSchedule({
    principal: state.outstanding,
    annualRatePct: state.annualRatePct,
    periods: state.remainingPeriods,
    periodsPerYear: state.periodsPerYear,
    emi: stateEmi(state),
    extraPerPeriod: Math.max(0, extraPerPeriod),
  })
  return compare(baseline, scenario, 0)
}

export interface LumpSumOptions {
  amount: number
  /** Period (1 = with the next EMI) at which the prepayment is made. */
  atPeriod?: number
  recast: 'tenure' | 'emi'
  charge?: ChargeRate | null
  gstPct?: number
}

/** A one-time part-prepayment. */
export function lumpSumScenario(state: LoanState, options: LumpSumOptions): ScenarioResult {
  const baseline = baselineSchedule(state)
  const at = Math.max(1, Math.floor(options.atPeriod ?? 1))
  const amount = Math.max(0, options.amount)
  const scenario = buildSchedule({
    principal: state.outstanding,
    annualRatePct: state.annualRatePct,
    periods: state.remainingPeriods,
    periodsPerYear: state.periodsPerYear,
    emi: stateEmi(state),
    lumpSums: [{ period: at, amount }],
    recast: options.recast,
  })
  const actuallyPrepaid = scenario.totalExtra
  const costs = chargeAmount(options.charge, actuallyPrepaid, options.gstPct ?? 0).total
  const result = compare(baseline, scenario, costs)
  if (options.recast === 'emi') {
    const after = scenario.rows.find((r) => r.period === at + 1)
    result.newEmi = after ? after.emi : scenario.emi
  }
  return result
}

/** Pay a lump sum once every year (e.g. from an annual bonus). */
export function annualLumpSumScenario(
  state: LoanState,
  amount: number,
  options: { firstPeriod?: number; charge?: ChargeRate | null; gstPct?: number } = {},
): ScenarioResult {
  const k = state.periodsPerYear ?? 12
  const first = Math.max(1, options.firstPeriod ?? k)
  const lumpSums: { period: number; amount: number }[] = []
  for (let p = first; p <= state.remainingPeriods; p += k) lumpSums.push({ period: p, amount })
  const baseline = baselineSchedule(state)
  const scenario = buildSchedule({
    principal: state.outstanding,
    annualRatePct: state.annualRatePct,
    periods: state.remainingPeriods,
    periodsPerYear: k,
    emi: stateEmi(state),
    lumpSums,
  })
  const costs = chargeAmount(options.charge, scenario.totalExtra, options.gstPct ?? 0).total
  return compare(baseline, scenario, costs)
}

/** New interest rate (negotiation / repricing): keep EMI (shorter tenure) or keep tenure (lower EMI). */
export function rateChangeScenario(state: LoanState, newRatePct: number, keep: 'emi' | 'tenure', costs = 0): ScenarioResult {
  const baseline = baselineSchedule(state)
  const k = state.periodsPerYear ?? 12
  const scenario =
    keep === 'emi'
      ? buildSchedule({
          principal: state.outstanding,
          annualRatePct: newRatePct,
          periods: Math.max(state.remainingPeriods, 1200),
          periodsPerYear: k,
          emi: stateEmi(state),
        })
      : buildSchedule({ principal: state.outstanding, annualRatePct: newRatePct, periods: state.remainingPeriods, periodsPerYear: k })
  return compare(baseline, scenario, costs)
}

export interface ClosureResult {
  outstanding: number
  charge: number
  gst: number
  /** Amount needed to close today. */
  payoff: number
  /** Interest you would otherwise pay over the remaining tenure. */
  remainingInterest: number
  /** remainingInterest − closure charges. */
  netSavings: number
}

/** Close (foreclose) the loan today. */
export function closureToday(state: LoanState, charge?: ChargeRate | null, gstPct = 0, quotedPayoff?: number): ClosureResult {
  const baseline = baselineSchedule(state)
  const c = chargeAmount(charge, state.outstanding, gstPct)
  let payoff = state.outstanding + c.total
  let chargeTotal = c.charge
  let gst = c.gst
  if (quotedPayoff !== undefined && quotedPayoff > 0) {
    // A lender's foreclosure quote is the documented number: use it.
    payoff = quotedPayoff
    chargeTotal = Math.max(0, quotedPayoff - state.outstanding)
    gst = 0
  }
  return {
    outstanding: state.outstanding,
    charge: chargeTotal,
    gst,
    payoff,
    remainingInterest: baseline.totalInterest,
    netSavings: baseline.totalInterest - (payoff - state.outstanding),
  }
}

/**
 * For a FIXED prepayment charge, the smallest prepayment whose interest saving
 * covers the charge. Returns 0 when there is no fixed charge and null if even
 * prepaying everything never covers it.
 */
export function minimumWorthwhilePrepayment(state: LoanState, charge: ChargeRate | null | undefined, gstPct = 0): number | null {
  if (!charge || charge.mode === 'percent') return charge && charge.value > 0 ? null : 0
  const fixed = chargeAmount(charge, 0, gstPct).total
  if (fixed <= 0) return 0
  const saving = (amount: number) =>
    lumpSumScenario(state, { amount, recast: 'tenure', charge: null }).interestSaved - fixed
  if (saving(state.outstanding) < 0) return null
  let lo = 0
  let hi = state.outstanding
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (saving(mid) >= 0) hi = mid
    else lo = mid
  }
  return Math.ceil(hi)
}

/** Same prepayment, two choices: reduce EMI vs reduce tenure. */
export function tenureVsEmi(state: LoanState, amount: number, charge?: ChargeRate | null, gstPct = 0) {
  return {
    reduceEmi: lumpSumScenario(state, { amount, recast: 'emi', charge, gstPct }),
    reduceTenure: lumpSumScenario(state, { amount, recast: 'tenure', charge, gstPct }),
  }
}

/** Total cost of contingent events such as late payments or bounces. */
export function contingentCost(perEvent: number, events: number, gstPct = 0): number {
  return Math.max(0, perEvent) * Math.max(0, events) * (1 + gstPct / 100)
}
