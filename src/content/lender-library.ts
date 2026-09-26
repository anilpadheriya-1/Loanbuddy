/**
 * Verified lender/product library — data model only.
 *
 * We deliberately ship NO rates: published rates change often, and an
 * unverified or stale rate would mislead. An entry may only be shown as
 * "verified" when it has an official source URL, a source date and a
 * verification date. Compare your own offers in "Compare Loans" instead.
 */
export type LenderEntryStatus = 'verified' | 'user-entered' | 'unverified' | 'historical'

export interface LenderProductEntry {
  lender: string
  product: string
  loanType: string
  minRatePct: number | null
  maxRatePct: number | null
  rateMethod: 'reducing' | 'flat' | 'unknown'
  processingFee: string | null
  otherCharges: string | null
  sourceUrl: string | null
  sourceDate: string | null
  verifiedOn: string | null
  status: LenderEntryStatus
  notes?: string
}

export const LENDER_LIBRARY: LenderProductEntry[] = []

/** Guard used by the UI: only entries with full provenance can carry the "verified" label. */
export function isDisplayableAsVerified(e: LenderProductEntry): boolean {
  return e.status === 'verified' && !!e.sourceUrl && !!e.sourceDate && !!e.verifiedOn
}
