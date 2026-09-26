import type { LoanAnalysis } from './analyze'
import type { EngineMessage, LoanInput } from './types'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ConfidenceResult {
  level: ConfidenceLevel
  /** Reasons that lowered confidence (translation keys). */
  reasons: EngineMessage[]
  /** Things that support the level. */
  strengths: EngineMessage[]
}

/**
 * How much the result can be relied on, based on WHERE the numbers came from
 * and WHAT is missing. Never about the lender.
 *
 *  High   – KFS/sanction letter + schedule/statement, net amount documented,
 *           every charge amount and GST treatment known, all charges confirmed.
 *  Low    – core facts missing: net amount AND charge list uncertain, unknown
 *           charge amounts, or everything from memory with no documents.
 *  Medium – everything in between.
 */
export function assessConfidence(input: LoanInput, analysis: LoanAnalysis): ConfidenceResult {
  const reasons: EngineMessage[] = []
  const strengths: EngineMessage[] = []
  if (analysis.status !== 'ok') {
    return { level: 'low', reasons: [{ code: 'insufficient-data' }], strengths }
  }
  const d = input.documents
  const keyDoc = d.kfs || d.sanctionLetter
  const scheduleDoc = d.amortizationSchedule || d.statement
  const unknownAmounts = analysis.charges.filter((c) => c.amount === null).length
  const unknownGst = analysis.charges.filter((c) => c.gstUnknown).length
  const unknownRecurring = analysis.unknowns.filter((u) => u.code === 'recurring-amount').length
  const anyDoc = Object.values(d).some(Boolean)

  if (keyDoc) strengths.push({ code: d.kfs ? 'has-kfs' : 'has-sanction-letter' })
  else reasons.push({ code: 'no-kfs' })
  if (scheduleDoc) strengths.push({ code: 'has-schedule' })
  else reasons.push({ code: 'no-schedule' })
  if (analysis.netDerived) reasons.push({ code: 'net-not-entered' })
  else strengths.push({ code: 'net-entered' })
  if (analysis.emiDerived) reasons.push({ code: 'emi-not-entered' })
  if (unknownAmounts) reasons.push({ code: 'charge-amounts-unknown', params: { count: unknownAmounts } })
  if (unknownGst) reasons.push({ code: 'gst-unknown', params: { count: unknownGst } })
  if (unknownRecurring) reasons.push({ code: 'recurring-unknown', params: { count: unknownRecurring } })
  if (input.allChargesListed !== 'yes') reasons.push({ code: 'charges-not-confirmed' })
  else strengths.push({ code: 'charges-confirmed' })
  if (input.valuesSource === 'memory') reasons.push({ code: 'from-memory' })
  if (input.quotedRatePct.kind === 'unknown') reasons.push({ code: 'rate-unknown' })

  let level: ConfidenceLevel
  const low =
    unknownAmounts > 0 ||
    (analysis.netDerived && input.allChargesListed !== 'yes') ||
    (input.valuesSource === 'memory' && !anyDoc)
  const high =
    keyDoc &&
    scheduleDoc &&
    !analysis.netDerived &&
    !analysis.emiDerived &&
    unknownAmounts === 0 &&
    unknownGst === 0 &&
    unknownRecurring === 0 &&
    input.allChargesListed === 'yes' &&
    input.valuesSource === 'documents'
  if (low) level = 'low'
  else if (high) level = 'high'
  else level = 'medium'
  return { level, reasons, strengths }
}
