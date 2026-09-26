import { irr, type CashFlow } from './irr'

export interface ImpliedRateOptions {
  periodsPerYear?: number
  advanceCount?: number
  deferPeriods?: number
}

/**
 * Reverse EMI check: the annual rate (reducing balance, % p.a.) that makes
 * `n` instalments of `emi` exactly repay `principal`.
 *
 * Returns null if it cannot be solved (e.g. EMI × n is not larger than zero).
 * A negative result means the instalments add up to less than the principal.
 */
export function impliedAnnualRate(principal: number, emi: number, n: number, options: ImpliedRateOptions = {}): number | null {
  const k = options.periodsPerYear ?? 12
  const a = Math.max(0, Math.min(options.advanceCount ?? 0, n))
  const d = Math.max(0, options.deferPeriods ?? 0)
  if (!(principal > 0) || !(emi > 0) || !(n > 0)) return null
  const flows: CashFlow[] = [{ t: 0, amount: principal - emi * a }]
  for (let i = 1; i <= n - a; i++) flows.push({ t: i + d, amount: -emi })
  if (Math.abs(emi * n - principal) < 1e-9) return 0
  const r = irr(flows)
  return r === null ? null : r * k * 100
}
