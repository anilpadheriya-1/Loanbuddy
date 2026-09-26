import type { LoanAnalysis } from './analyze'
import type { EngineMessage, LoanInput } from './types'
import { valueOf } from './types'

/**
 * Personalised, polite questions for the lender, generated from gaps and
 * flags in the user's data. Each is a translation key + params.
 */
export function lenderQuestions(input: LoanInput, analysis: LoanAnalysis): EngineMessage[] {
  const q: EngineMessage[] = []
  const rate = valueOf(input.quotedRatePct)
  if (input.rateMethod === 'unknown' && rate !== undefined) q.push({ code: 'q-flat-or-reducing', params: { rate } })
  if (analysis.reconciliation?.status === 'matches-flat') q.push({ code: 'q-flat-or-reducing', params: { rate: rate ?? 0 } })
  if (!input.documents.kfs) q.push({ code: 'q-kfs' })
  q.push({ code: 'q-apr-sheet' })
  if (analysis.status === 'ok') {
    const deducted = analysis.principal - analysis.netReceived
    if (deducted > 1) q.push({ code: 'q-explain-deduction', params: { amount: Math.round(deducted) } })
    if (analysis.totals.upfrontByGroup.unitemised > 0) {
      q.push({ code: 'q-unitemised', params: { amount: Math.round(analysis.totals.upfrontByGroup.unitemised) } })
    }
    if (analysis.reconciliation?.status === 'mismatch') {
      q.push({
        code: 'q-emi-mismatch',
        params: { emi: Math.round(analysis.emi), expected: Math.round(analysis.reconciliation.expectedEmi) },
      })
    }
    for (const c of analysis.charges) {
      if (c.group === 'insurance' && c.mandatory !== 'no') q.push({ code: 'q-insurance-mandatory', params: { name: c.name } })
      if (c.gstUnknown) q.push({ code: 'q-gst', params: { name: c.name } })
      if (c.inKfs === 'no') q.push({ code: 'q-not-in-kfs', params: { name: c.name } })
    }
  }
  if (!input.documents.amortizationSchedule) q.push({ code: 'q-schedule' })
  if (input.prepayment.foreclosureCharge.kind === 'unknown' || input.prepayment.partPrepaymentAllowed === 'unknown') {
    q.push({ code: 'q-prepayment' })
  }
  if (input.rateType === 'floating' || input.rateType === 'hybrid') q.push({ code: 'q-benchmark-reset' })
  if (input.allChargesListed !== 'yes') q.push({ code: 'q-all-charges' })
  q.push({ code: 'q-penal' })
  // De-duplicate by code+params.
  const seen = new Set<string>()
  return q.filter((m) => {
    const key = m.code + JSON.stringify(m.params ?? {})
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
