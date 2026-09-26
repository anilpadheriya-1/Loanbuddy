import { impliedAnnualRate } from './implied-rate'

/**
 * Flat-rate loans charge interest on the ORIGINAL principal for the whole
 * tenure, even though the outstanding balance falls with every EMI:
 *
 *   total interest = P × flat rate × years,  EMI = (P + total interest) / n
 *
 * Because you keep paying interest on money already repaid, the equivalent
 * reducing-balance rate is much higher (roughly 1.8–1.9× for typical tenures).
 */
export interface FlatRateResult {
  emi: number
  totalInterest: number
  totalRepayment: number
  /** Reducing-balance (IRR-based) rate with the same EMI, % p.a. */
  reducingEquivalentPct: number | null
}

export function flatRateLoan(principal: number, flatRatePct: number, n: number, periodsPerYear = 12): FlatRateResult {
  const years = n / periodsPerYear
  const totalInterest = principal * (flatRatePct / 100) * years
  const totalRepayment = principal + totalInterest
  const emi = totalRepayment / n
  return {
    emi,
    totalInterest,
    totalRepayment,
    reducingEquivalentPct: impliedAnnualRate(principal, emi, n, { periodsPerYear }),
  }
}

export function flatEmi(principal: number, flatRatePct: number, n: number, periodsPerYear = 12): number {
  return flatRateLoan(principal, flatRatePct, n, periodsPerYear).emi
}
