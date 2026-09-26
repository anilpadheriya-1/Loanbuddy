import type { LoanAnalysis } from './analyze'
import type { ConfidenceLevel } from './confidence'
import type { LoanDealScore } from './score'
import type { ChargeRate, LoanInput, RateType } from './types'
import { valueOf } from './types'

/**
 * Side-by-side comparison of 2–3 offers. We normalise every offer to the same
 * metrics and let the user sort. We never declare a "best" offer: the right
 * choice depends on cash flow, flexibility and risk as well as cost.
 */
export interface ComparisonRow {
  id: string
  label: string
  quotedRatePct: number | null
  rateType: RateType
  emi: number
  tenurePeriods: number
  netReceived: number
  processingFees: number
  insurance: number
  totalCharges: number
  totalInterest: number
  totalRepayment: number
  totalCost: number
  effectivePct: number | null
  prepaymentCharge: ChargeRate | null
  prepaymentKnown: boolean
  score: number | null
  confidence: ConfidenceLevel
}

export type CompareSortKey = 'effective' | 'repayment' | 'emi' | 'tenure' | 'cost'

export function toComparisonRow(
  id: string,
  label: string,
  input: LoanInput,
  analysis: LoanAnalysis,
  score: LoanDealScore,
  confidence: ConfidenceLevel,
): ComparisonRow {
  const t = analysis.totals
  return {
    id,
    label,
    quotedRatePct: analysis.quotedRatePct,
    rateType: input.rateType,
    emi: analysis.emi,
    tenurePeriods: input.tenurePeriods,
    netReceived: analysis.netReceived,
    processingFees: t.upfrontByGroup.processing,
    insurance: t.upfrontByGroup.insurance,
    totalCharges: t.totalCharges,
    totalInterest: t.totalInterest,
    totalRepayment: t.totalRepayment,
    totalCost: t.totalCost,
    effectivePct: analysis.effective?.aprStylePct ?? null,
    prepaymentCharge: valueOf(input.prepayment.foreclosureCharge) ?? null,
    prepaymentKnown: input.prepayment.foreclosureCharge.kind === 'known',
    score: score.total,
    confidence,
  }
}

export function sortComparison(rows: ComparisonRow[], key: CompareSortKey): ComparisonRow[] {
  const val = (r: ComparisonRow): number => {
    switch (key) {
      case 'effective':
        return r.effectivePct ?? Infinity
      case 'repayment':
        return r.totalRepayment
      case 'emi':
        return r.emi
      case 'tenure':
        return r.tenurePeriods
      case 'cost':
        return r.totalCost
    }
  }
  return [...rows].sort((a, b) => val(a) - val(b))
}

/** For each numeric metric, the ₹/pp difference vs the lowest value among the offers. */
export function differenceFromLowest(rows: ComparisonRow[], metric: keyof ComparisonRow): Map<string, number> {
  const values = rows.map((r) => r[metric]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const min = values.length ? Math.min(...values) : 0
  const out = new Map<string, number>()
  for (const r of rows) {
    const v = r[metric]
    if (typeof v === 'number' && Number.isFinite(v)) out.set(r.id, v - min)
  }
  return out
}
