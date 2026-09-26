import type { TKey } from '@/lib/i18n'
import { tenurePeriods, type LoanDraft } from './draft'

export type StepKey = 'loan' | 'interest' | 'charges' | 'repayment' | 'prepayment'
export type FieldErrors = Partial<Record<string, TKey>>

const MAX_AMOUNT = 1_000_00_00_000 // ₹1,000 crore — a sanity limit, not a product limit.

function dateBefore(a: string, b: string): boolean {
  return !!a && !!b && a < b
}

/** Blocking errors (prevent moving on) for each step. Most fields are optional by design. */
export function validateStep(step: StepKey, d: LoanDraft): FieldErrors {
  const e: FieldErrors = {}
  if (step === 'loan') {
    const s = d.sanctionedAmount.value
    if (s === null) e.sanctionedAmount = 'error.required'
    else if (s <= 0) e.sanctionedAmount = 'error.positive'
    else if (s > MAX_AMOUNT) e.sanctionedAmount = 'error.tooLarge'
    const periods = tenurePeriods(d)
    if (d.tenureValue.value === null) e.tenureValue = 'error.required'
    else if (periods < 1 || (d.frequency === 'monthly' && periods > 600)) e.tenureValue = 'error.tenureRange'
    if (s && d.netReceived.value !== null && d.netReceived.value > s * 1.0001) e.netReceived = 'error.netAboveLoan'
    if (s && d.disbursedAmount.value !== null && d.disbursedAmount.value > s * 1.0001) e.disbursedAmount = 'error.disbursedAboveSanctioned'
    if (dateBefore(d.disbursementDate, d.sanctionDate)) e.disbursementDate = 'error.dateOrder'
  }
  if (step === 'interest') {
    const r = d.quotedRate.value
    if (r !== null && (r < 0 || r > 60)) e.quotedRate = 'error.rateRange'
  }
  if (step === 'repayment') {
    if (d.emi.value !== null && d.emi.value <= 0) e.emi = 'error.positive'
    if (dateBefore(d.firstEmiDate, d.disbursementDate)) e.firstEmiDate = 'error.dateOrder'
    if (dateBefore(d.lastEmiDate, d.firstEmiDate)) e.lastEmiDate = 'error.dateOrder'
  }
  if (step === 'prepayment' && d.status === 'existing') {
    const r = d.existing.currentRate.value
    if (r !== null && (r < 0 || r > 60)) e.currentRate = 'error.rateRange'
  }
  return e
}
