import { analyzeLoan } from '@/lib/finance'
import { draftToInput, emptyNum, type LoanDraft } from './draft'

/** EMI the engine would calculate from the rate (ignoring any EMI the user typed). */
export function suggestedEmi(draft: LoanDraft): number | null {
  if (draft.quotedRate.value === null || draft.quotedRate.unknown) return null
  const a = analyzeLoan(draftToInput({ ...draft, emi: emptyNum() }))
  return a.status === 'ok' && a.emiDerived && Number.isFinite(a.emi) ? Math.round(a.emi * 100) / 100 : null
}
