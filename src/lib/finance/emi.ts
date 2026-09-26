/**
 * EMI (equated periodic instalment) maths on a reducing-balance basis.
 *
 *   EMI = P × r × (1+r)^n / ((1+r)^n − 1)
 *
 * with r = annual rate / periods per year. Generalised to support advance EMIs
 * (paid at disbursement) and a moratorium (first EMI delayed), using
 *   P = EMI × (a + v^d × annuity(n − a, r)),   v = 1/(1+r)
 */

/** Present value of 1 per period for n periods at rate r (in arrears). */
export function annuityFactor(n: number, r: number): number {
  if (n <= 0) return 0
  if (Math.abs(r) < 1e-12) return n
  return (1 - Math.pow(1 + r, -n)) / r
}

export function periodicRate(annualRatePct: number, periodsPerYear = 12): number {
  return annualRatePct / 100 / periodsPerYear
}

export interface EmiOptions {
  periodsPerYear?: number
  /** Number of EMIs collected at disbursement (t = 0). Included in n. */
  advanceCount?: number
  /** Extra periods before the first regular EMI (moratorium). */
  deferPeriods?: number
}

/**
 * EMI for a loan of `principal` at `annualRatePct` over `n` instalments.
 * Handles zero and near-zero rates (EMI = P / n). Returns NaN for invalid input.
 */
export function calculateEmi(principal: number, annualRatePct: number, n: number, options: EmiOptions = {}): number {
  const k = options.periodsPerYear ?? 12
  const a = Math.max(0, Math.min(options.advanceCount ?? 0, n))
  const d = Math.max(0, options.deferPeriods ?? 0)
  if (!(principal > 0) || !(n > 0) || !Number.isFinite(annualRatePct)) return NaN
  const r = periodicRate(annualRatePct, k)
  if (Math.abs(r) < 1e-12) return principal / n
  const factor = a + Math.pow(1 + r, -d) * annuityFactor(n - a, r)
  return principal / factor
}

/** Total interest paid over the life of a standard reducing-balance loan. */
export function totalInterest(principal: number, annualRatePct: number, n: number, options: EmiOptions = {}): number {
  const emi = calculateEmi(principal, annualRatePct, n, options)
  return emi * n - principal
}

/**
 * Number of instalments needed to repay `balance` with instalment `emi`
 * (can be fractional; round up for a count). Returns Infinity if the EMI
 * does not even cover the interest.
 */
export function periodsToRepay(balance: number, annualRatePct: number, emi: number, periodsPerYear = 12): number {
  if (!(balance > 0)) return 0
  if (!(emi > 0)) return Infinity
  const r = periodicRate(annualRatePct, periodsPerYear)
  if (Math.abs(r) < 1e-12) return balance / emi
  const x = 1 - (r * balance) / emi
  if (x <= 0) return Infinity
  return -Math.log(x) / Math.log(1 + r)
}
