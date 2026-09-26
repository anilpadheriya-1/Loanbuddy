import { emptyNum, newCharge, num, tenurePeriods, type ChargeDraft, type LoanDraft, type NumField } from '@/features/check-loan/draft'
import { uid } from '@/lib/utils'
import { findCharge } from './items'

/**
 * Pure draft updaters for the quick form on the Ask Your Lender page.
 * They write into the same draft as Check My Loan, so both stay in sync.
 */

const isEmpty = (f: NumField) => !f.unknown && f.value === null

/** Create, update or (when the amount is cleared) remove the first charge of a category. */
export function setCharge(d: LoanDraft, category: ChargeDraft['category'], name: string, patch: Partial<ChargeDraft>): LoanDraft {
  const existing = findCharge(d, category)
  const cleared = !!patch.amount && isEmpty(patch.amount)
  if (existing) {
    if (cleared) return { ...d, charges: d.charges.filter((c) => c.id !== existing.id) }
    return { ...d, charges: d.charges.map((c) => (c.id === existing.id ? { ...c, ...patch } : c)) }
  }
  if (cleared || !patch.amount) return d
  return { ...d, charges: [...d.charges, { ...newCharge(category, name), amountMode: 'rupees', ...patch }] }
}

/** Number of EMIs as shown in the quick form (from whatever tenure unit the draft uses). */
export function emiCountField(d: LoanDraft): NumField {
  if (d.tenureUnit === 'emis') return d.tenureValue
  const n = tenurePeriods(d)
  return n > 0 ? num(n) : d.tenureValue.unknown ? { value: null, unknown: true } : emptyNum()
}

export function setEmiCount(d: LoanDraft, f: NumField): LoanDraft {
  return { ...d, tenureValue: f, tenureUnit: 'emis' }
}

/** Bounce / late-payment charge per event (a contingent charge, never part of the base cost). */
export function penalField(d: LoanDraft): NumField {
  return d.contingent.find((c) => c.kind === 'bounce' || c.kind === 'late-payment' || c.kind === 'penal')?.amount ?? emptyNum()
}

export function setPenal(d: LoanDraft, f: NumField, name: string): LoanDraft {
  const existing = d.contingent.find((c) => c.kind === 'bounce' || c.kind === 'late-payment' || c.kind === 'penal')
  if (existing) {
    if (isEmpty(f)) return { ...d, contingent: d.contingent.filter((c) => c.id !== existing.id) }
    return { ...d, contingent: d.contingent.map((c) => (c.id === existing.id ? { ...c, amount: f } : c)) }
  }
  if (isEmpty(f)) return d
  return { ...d, contingent: [...d.contingent, { id: uid('con'), kind: 'bounce', name, amount: f }] }
}

type ListKey = 'asked' | 'refused' | 'received'

/** Add or remove an item id in one of the request-tracking lists. */
export function toggleRequest(d: LoanDraft, list: ListKey, id: string, on: boolean): LoanDraft {
  const r = { asked: [], refused: [], received: [], ...d.requests } as Required<NonNullable<LoanDraft['requests']>>
  const current = new Set(r[list] ?? [])
  if (on) current.add(id)
  else current.delete(id)
  const next = { ...r, [list]: [...current] }
  // "Asked" and "not shared" are mutually exclusive states for the same item.
  if (on && list === 'refused') next.asked = next.asked.filter((x) => x !== id)
  if (on && list === 'asked') next.refused = next.refused.filter((x) => x !== id)
  return { ...d, requests: next }
}

export function markManyAsked(d: LoanDraft, ids: string[]): LoanDraft {
  return ids.reduce((acc, id) => toggleRequest(acc, 'asked', id, true), d)
}
