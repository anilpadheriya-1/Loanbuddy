import { findRoot } from './solver'
import { parseIsoDate, daysBetween } from './dates'

export interface DatedCashFlow {
  /** ISO date YYYY-MM-DD */
  date: string
  amount: number
}

/**
 * Excel-compatible XIRR: the annual effective rate x such that
 *   Σ amount_i / (1 + x)^(days_i / 365) = 0.
 * Returns the rate as a decimal, or null if it cannot be solved.
 */
export function xirr(flows: DatedCashFlow[]): number | null {
  if (flows.length < 2) return null
  const parsed = flows.map((f) => ({ date: parseIsoDate(f.date), amount: f.amount }))
  if (parsed.some((f) => f.date === null)) return null
  const t0 = parsed.reduce((min, f) => (f.date!.getTime() < min.getTime() ? f.date! : min), parsed[0].date!)
  const items = parsed.map((f) => ({ years: daysBetween(t0, f.date!) / 365, amount: f.amount }))
  if (!items.some((i) => i.amount > 0) || !items.some((i) => i.amount < 0)) return null
  const f = (x: number) => items.reduce((s, i) => s + i.amount / Math.pow(1 + x, i.years), 0)
  const result = findRoot(f, -0.99, 5)
  return result.ok ? result.root : null
}
