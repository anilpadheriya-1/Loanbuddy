import type { LoanAnalysis } from './analyze'
import type { ConfidenceResult } from './confidence'
import { valueOf, type EngineMessage, type LoanInput } from './types'

/**
 * Loan Deal Score (0–100).
 *
 * Measures the cost and transparency characteristics of THIS loan based ONLY
 * on the information entered. It is not a credit score, not a CIBIL score and
 * not a rating of the lender. Every point is explained.
 */

export type ScoreComponentKey = 'cost-gap' | 'fee-transparency' | 'net-disbursement' | 'prepayment' | 'emi-consistency' | 'documentation'

export interface ScoreComponent {
  key: ScoreComponentKey
  points: number
  max: number
  reason: EngineMessage
}

export type ScoreBand = 'strong' | 'review' | 'attention' | 'high-cost'

export interface LoanDealScore {
  /** null when core data is missing and the score is withheld. */
  total: number | null
  max: 100
  band: ScoreBand | null
  provisional: boolean
  withheldReason: EngineMessage | null
  components: ScoreComponent[]
}

export const SCORE_WEIGHTS: Record<ScoreComponentKey, number> = {
  'cost-gap': 35,
  'fee-transparency': 20,
  'net-disbursement': 15,
  prepayment: 10,
  'emi-consistency': 10,
  documentation: 10,
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const round1 = (x: number) => Math.round(x * 10) / 10

export function bandFor(total: number): ScoreBand {
  if (total >= 80) return 'strong'
  if (total >= 60) return 'review'
  if (total >= 40) return 'attention'
  return 'high-cost'
}

/** Effective-cost gap: ≤ 0.25 pp → full marks, falling linearly to 0 at ≥ 5 pp. */
export function costGapPoints(gapPp: number): number {
  const max = SCORE_WEIGHTS['cost-gap']
  if (gapPp <= 0.25) return max
  return round1(max * clamp01(1 - (gapPp - 0.25) / (5 - 0.25)))
}

/** Net disbursement: ≥ 99.5% of the loan received → full marks, 0 at ≤ 90%. */
export function netDisbursementPoints(ratio: number): number {
  const max = SCORE_WEIGHTS['net-disbursement']
  if (ratio >= 0.995) return max
  return round1(max * clamp01((ratio - 0.9) / (0.995 - 0.9)))
}

export function scoreLoan(input: LoanInput, analysis: LoanAnalysis, confidence: ConfidenceResult): LoanDealScore {
  const components: ScoreComponent[] = []

  if (analysis.status !== 'ok' || !analysis.effective) {
    return {
      total: null,
      max: 100,
      band: null,
      provisional: true,
      withheldReason: { code: 'score-withheld-core' },
      components,
    }
  }

  // 1. Effective cost vs quoted rate (35)
  if (analysis.differencePp !== null) {
    const gap = analysis.differencePp
    components.push({
      key: 'cost-gap',
      points: costGapPoints(gap),
      max: SCORE_WEIGHTS['cost-gap'],
      reason: { code: gap <= 0.25 ? 'cost-gap-small' : 'cost-gap', params: { gap: round2(gap) } },
    })
  } else {
    // Without a quoted rate we cannot measure the gap: no points, and say why.
    components.push({ key: 'cost-gap', points: 0, max: SCORE_WEIGHTS['cost-gap'], reason: { code: 'cost-gap-no-quote' } })
  }

  // 2. Fee transparency (20): share of charge attributes known + confirmation that all charges are listed.
  const charges = analysis.charges
  let knownAttrs = 0
  let totalAttrs = 0
  for (const c of charges) {
    totalAttrs += 4
    if (c.amount !== null) knownAttrs++
    if (!c.gstUnknown) knownAttrs++
    if (c.mandatory !== 'unknown') knownAttrs++
    if (c.recipient !== 'unknown') knownAttrs++
  }
  const attrShare = totalAttrs === 0 ? 1 : knownAttrs / totalAttrs
  const confirmed = input.allChargesListed === 'yes'
  const feePoints = round1(14 * attrShare + (confirmed ? 6 : 0))
  components.push({
    key: 'fee-transparency',
    points: feePoints,
    max: SCORE_WEIGHTS['fee-transparency'],
    reason: {
      code: charges.length === 0 ? (confirmed ? 'fees-none-confirmed' : 'fees-none-unsure') : confirmed ? 'fees-known' : 'fees-known-unsure',
      params: { known: knownAttrs, total: totalAttrs, count: charges.length },
    },
  })

  // 3. Net-disbursement efficiency (15)
  const ratio = analysis.principal > 0 ? analysis.netReceived / analysis.principal : 0
  components.push({
    key: 'net-disbursement',
    points: netDisbursementPoints(ratio),
    max: SCORE_WEIGHTS['net-disbursement'],
    reason: {
      code: analysis.netDerived ? 'net-derived' : 'net-documented',
      params: { pct: round2(ratio * 100), received: Math.round(analysis.netReceived), principal: Math.round(analysis.principal) },
    },
  })

  // 4. Prepayment flexibility (10): part-prepay allowed 4, no/zero foreclosure charge 4, no lock-in 2.
  const p = input.prepayment
  let prePoints = 0
  const unknownBits: string[] = []
  if (p.partPrepaymentAllowed === 'yes') prePoints += 4
  else if (p.partPrepaymentAllowed === 'unknown') unknownBits.push('part')
  const fc = valueOf(p.foreclosureCharge)
  if (fc !== undefined) {
    if (fc.value === 0) prePoints += 4
    else if (fc.mode === 'percent' && fc.value <= 2) prePoints += 2
  } else unknownBits.push('foreclosure')
  const lock = valueOf(p.lockInMonths)
  if (lock !== undefined) {
    if (lock === 0) prePoints += 2
  } else unknownBits.push('lockin')
  components.push({
    key: 'prepayment',
    points: prePoints,
    max: SCORE_WEIGHTS.prepayment,
    reason: { code: unknownBits.length ? 'prepay-unknown' : 'prepay-known', params: { unknown: unknownBits.join(',') } },
  })

  // 5. EMI & schedule consistency (10)
  const rec = analysis.reconciliation
  let emiPoints: number
  let emiReason: EngineMessage
  if (!rec) {
    emiPoints = analysis.emiDerived ? 5 : 0
    emiReason = { code: analysis.emiDerived ? 'emi-derived' : 'emi-no-quote' }
  } else if (rec.status === 'match') {
    emiPoints = 10
    emiReason = { code: 'emi-match' }
  } else if (rec.status === 'matches-flat') {
    emiPoints = 4
    emiReason = { code: 'emi-flat', params: { rate: analysis.quotedRatePct ?? 0 } }
  } else {
    const gap = Math.abs(rec.rateGapPp ?? 5)
    emiPoints = gap <= 0.25 ? 7 : round1(7 * clamp01(1 - (gap - 0.25) / 2.75))
    emiReason = { code: 'emi-mismatch', params: { gap: round2(rec.rateGapPp ?? 0), difference: Math.round(rec.difference) } }
  }
  components.push({ key: 'emi-consistency', points: emiPoints, max: SCORE_WEIGHTS['emi-consistency'], reason: emiReason })

  // 6. Documentation (10)
  const d = input.documents
  const docPoints = (d.kfs ? 4 : 0) + (d.sanctionLetter ? 2 : 0) + (d.amortizationSchedule ? 2 : 0) + (d.statement ? 1 : 0) + (d.loanAgreement ? 1 : 0)
  components.push({
    key: 'documentation',
    points: docPoints,
    max: SCORE_WEIGHTS.documentation,
    reason: { code: 'docs', params: { count: Object.values(d).filter(Boolean).length } },
  })

  const total = Math.round(components.reduce((s, c) => s + c.points, 0))
  return {
    total,
    max: 100,
    band: bandFor(total),
    provisional: confidence.level === 'low',
    withheldReason: null,
    components,
  }
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}
