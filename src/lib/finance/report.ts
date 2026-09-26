import { analyzeLoan, type LoanAnalysis } from './analyze'
import { assessConfidence, type ConfidenceResult } from './confidence'
import { analyzeExistingLoan, type ExistingLoanResult } from './existing-loan'
import { lenderQuestions } from './lender-questions'
import { checkPrepaymentRules, type PrepaymentRuleResult } from './prepayment-rules'
import { extraPaymentScenario, lumpSumScenario, type LoanState, type ScenarioResult } from './prepayment'
import { scoreLoan, type LoanDealScore } from './score'
import { NO_DOCUMENTS, PERIODS_PER_YEAR, unknown, valueOf, type EngineMessage, type LoanInput } from './types'

/** Everything the Loan Cost Report needs, computed once from the user's input. */
export interface LoanReport {
  input: LoanInput
  analysis: LoanAnalysis
  confidence: ConfidenceResult
  score: LoanDealScore
  questions: EngineMessage[]
  prepaymentRule: PrepaymentRuleResult
  existing: ExistingLoanResult | null
  /** Quick "ways to save" previews (full versions live in the Savings Lab). */
  savingsPreview: {
    state: LoanState
    extraMonthly: { amount: number; result: ScenarioResult }
    lumpSum: { amount: number; result: ScenarioResult }
  } | null
}

export function buildReport(input: LoanInput): LoanReport {
  const analysis = analyzeLoan(input)
  const confidence = assessConfidence(input, analysis)
  const score = scoreLoan(input, analysis, confidence)
  const questions = lenderQuestions(input, analysis)
  const prepaymentRule = checkPrepaymentRules({
    sanctionDate: input.sanctionDate,
    lenderCategory: input.lenderCategory,
    nbfcLayer: input.nbfcLayer,
    coopTier: input.coopTier,
    borrowerType: input.borrowerType,
    purpose: input.purpose,
    rateType: input.rateType,
    sanctionedAmount: input.sanctionedAmount,
  })
  const existing = input.status === 'existing' && analysis.status === 'ok' ? analyzeExistingLoan(input, analysis) : null
  const state = savingsState(input, analysis, existing)
  let savingsPreview: LoanReport['savingsPreview'] = null
  if (state && state.outstanding > 0 && state.remainingPeriods > 1) {
    const extra = roundNice((state.emi ?? 0) * 0.1)
    const lump = roundNice(state.outstanding * 0.1)
    savingsPreview = {
      state,
      extraMonthly: { amount: extra, result: extraPaymentScenario(state, extra) },
      lumpSum: {
        amount: lump,
        result: lumpSumScenario(state, {
          amount: lump,
          recast: 'tenure',
          charge: valueOf(input.prepayment.partPrepaymentCharge) ?? null,
          gstPct: valueOf(input.prepayment.gstOnChargesPct) ?? 0,
        }),
      },
    }
  }
  return { input, analysis, confidence, score, questions, prepaymentRule, existing, savingsPreview }
}

/** The loan position to simulate savings from: today's position for existing loans, the start otherwise. */
export function savingsState(input: LoanInput, analysis: LoanAnalysis, existing: ExistingLoanResult | null): LoanState | null {
  if (existing?.status === 'ok' && existing.state) return existing.state
  if (analysis.status !== 'ok' || analysis.scheduleRatePct === null) return null
  return {
    outstanding: analysis.principal,
    annualRatePct: analysis.scheduleRatePct,
    remainingPeriods: input.tenurePeriods,
    emi: analysis.emi,
    periodsPerYear: PERIODS_PER_YEAR[input.frequency],
  }
}

/** Round to a "friendly" amount: ₹500 steps below ₹10,000, ₹1,000 steps below ₹1 lakh, else ₹5,000. */
export function roundNice(x: number): number {
  if (x <= 0) return 0
  const step = x < 10_000 ? 500 : x < 1_00_000 ? 1_000 : 5_000
  return Math.max(step, Math.round(x / step) * step)
}

/** A fully "unknown" loan input to start the wizard from. */
export function emptyLoanInput(): LoanInput {
  return {
    loanType: 'personal',
    lenderName: '',
    lenderCategory: 'unknown',
    nbfcLayer: 'unknown',
    coopTier: 'unknown',
    borrowerType: 'individual',
    purpose: 'personal',
    status: 'new',
    sanctionedAmount: 0,
    disbursedAmount: unknown,
    netReceived: unknown,
    tenurePeriods: 0,
    frequency: 'monthly',
    quotedRatePct: unknown,
    rateType: 'unknown',
    rateMethod: 'unknown',
    spreadPct: unknown,
    emi: unknown,
    advanceEmiCount: 0,
    advanceEmiPayment: 'deducted',
    moratoriumPeriods: 0,
    charges: [],
    allChargesListed: 'unsure',
    recurring: [],
    contingent: [],
    prepayment: {
      partPrepaymentAllowed: 'unknown',
      minPartPrepayment: unknown,
      partPrepaymentCharge: unknown,
      foreclosureCharge: unknown,
      gstOnChargesPct: unknown,
      lockInMonths: unknown,
      balanceTransferAvailable: 'unknown',
    },
    documents: { ...NO_DOCUMENTS },
    valuesSource: 'mixed',
  }
}
