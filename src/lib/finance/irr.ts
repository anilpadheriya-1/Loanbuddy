import { findRoot } from './solver'

/** A cash flow at time `t`, measured in loan periods (t may be fractional). Positive = money to the borrower. */
export interface CashFlow {
  t: number
  amount: number
  /** Optional label for methodology display (e.g. "emi", "processing"). */
  label?: string
}

export function npv(ratePerPeriod: number, flows: CashFlow[]): number {
  let sum = 0
  for (const f of flows) sum += f.amount / Math.pow(1 + ratePerPeriod, f.t)
  return sum
}

/**
 * Internal rate of return per period for borrower cash flows.
 * Returns null when there is no sign change (nothing to solve) or no convergence.
 */
export function irr(flows: CashFlow[]): number | null {
  const hasPositive = flows.some((f) => f.amount > 0)
  const hasNegative = flows.some((f) => f.amount < 0)
  if (!hasPositive || !hasNegative) return null
  // Search between −50% and +100% per period (expanded automatically if needed).
  const result = findRoot((r) => npv(r, flows), -0.5, 1)
  return result.ok ? result.root : null
}

export interface AnnualizedRate {
  /** Periodic rate as a decimal (0.0125 = 1.25% per month). */
  periodic: number
  /**
   * Periodic rate × periods per year, in %. This is the convention RBI's KFS
   * illustration uses for APR ("IRR approach, reducing balance method"), so it is
   * directly comparable with an APR shown in a KFS.
   */
  aprStylePct: number
  /** Compounded effective annual rate, (1 + r)^k − 1, in %. */
  effectiveAnnualPct: number
}

export function annualize(periodicRate: number, periodsPerYear = 12): AnnualizedRate {
  return {
    periodic: periodicRate,
    aprStylePct: periodicRate * periodsPerYear * 100,
    effectiveAnnualPct: (Math.pow(1 + periodicRate, periodsPerYear) - 1) * 100,
  }
}
