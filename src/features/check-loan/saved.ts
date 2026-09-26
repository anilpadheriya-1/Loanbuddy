import type { LoanReport } from '@/lib/finance'
import type { SavedLoan } from '@/lib/storage'
import type { LoanDraft } from './draft'

/** Snapshot a draft + its report for the My Loans list. Recalculated when opened. */
export function toSavedLoan(draft: LoanDraft, report: LoanReport, fallbackLabel: string): SavedLoan {
  const a = report.analysis
  const preview = report.savingsPreview
  return {
    id: draft.id,
    label: draft.label.trim() || draft.lenderName.trim() || fallbackLabel,
    savedAt: new Date().toISOString(),
    draft,
    summary: {
      effectivePct: a.effective?.aprStylePct ?? null,
      quotedPct: a.quotedRatePct,
      emi: a.emi,
      tenurePeriods: report.input.tenurePeriods,
      totalInterest: a.totals.totalInterest,
      totalCost: a.totals.totalCost,
      potentialSavings: preview ? preview.extraMonthly.result.interestSaved : null,
      score: report.score.total,
      confidence: report.confidence.level,
    },
  }
}
