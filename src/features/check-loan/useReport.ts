import { useMemo } from 'react'
import { buildReport, type LoanReport } from '@/lib/finance'
import { draftToInput, type LoanDraft } from './draft'

/** Memoised full report for a draft. All maths lives in lib/finance. */
export function useReport(draft: LoanDraft | null): LoanReport | null {
  return useMemo(() => (draft ? buildReport(draftToInput(draft)) : null), [draft])
}
