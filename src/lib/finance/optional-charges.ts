import { analyzeLoan } from './analyze'
import type { LoanInput } from './types'

/**
 * "Remove / review optional add-ons": for each charge that is not known to be
 * mandatory, how much lower would the effective cost be without it?
 * Only a what-if — check your contract before declining anything.
 */
export interface OptionalChargeImpact {
  chargeId: string
  name: string
  mandatory: 'no' | 'unknown'
  /** Charge + known additional GST, ₹. */
  amount: number
  effectiveWith: number
  effectiveWithout: number
  /** Reduction in effective annualized cost, percentage points. */
  ppSaved: number
  /** Reduction in total cost of borrowing, ₹. */
  rupeesSaved: number
}

export function optionalChargeImpacts(input: LoanInput): OptionalChargeImpact[] {
  const base = analyzeLoan(input)
  if (base.status !== 'ok' || !base.effective) return []
  const out: OptionalChargeImpact[] = []
  for (const c of input.charges) {
    if (c.mandatory === 'yes' || c.amount.kind !== 'known' || c.amount.value <= 0) continue
    const netReceived =
      input.netReceived.kind === 'known' && c.payment !== 'separate' && c.payment !== 'in-emi'
        ? // If the documented net amount already had this charge deducted, you would have received more without it.
          { kind: 'known' as const, value: input.netReceived.value + c.amount.value + (c.gstAmount?.kind === 'known' ? c.gstAmount.value : 0) }
        : input.netReceived
    const without = analyzeLoan({ ...input, netReceived, charges: input.charges.filter((x) => x.id !== c.id) })
    if (without.status !== 'ok' || !without.effective) continue
    out.push({
      chargeId: c.id,
      name: c.name,
      mandatory: c.mandatory === 'no' ? 'no' : 'unknown',
      amount: c.amount.value + (c.gstAmount?.kind === 'known' ? c.gstAmount.value : 0),
      effectiveWith: base.effective.aprStylePct,
      effectiveWithout: without.effective.aprStylePct,
      ppSaved: base.effective.aprStylePct - without.effective.aprStylePct,
      rupeesSaved: base.totals.totalCost - without.totals.totalCost,
    })
  }
  return out.sort((a, b) => b.ppSaved - a.ppSaved)
}
