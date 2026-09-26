import { parseIsoDate } from './dates'
import type { BorrowerType, CoopTier, LenderCategory, LoanPurpose, NbfcLayer, RateType } from './types'

/**
 * Informational check of whether RBI's pre-payment charge rules APPEAR to rule
 * out a pre-payment / foreclosure charge for this loan.
 *
 * Encodes:
 *  - RBI (Pre-payment Charges on Loans) Directions, 2025 (2 July 2025),
 *    applicable to loans sanctioned or renewed on or after 1 January 2026.
 *  - For older loans: RBI's earlier instructions (2012/2014/2019 for banks, and
 *    corresponding NBFC/HFC/co-operative bank provisions) that barred
 *    foreclosure charges on floating-rate term loans to individuals for
 *    non-business purposes.
 *
 * This is never a legal conclusion. The loan agreement, KFS and the lender's
 * current RBI directions decide. Missing facts → "cannot-determine".
 */

export type PrepaymentRuleStatus = 'likely-no-charge' | 'lender-policy' | 'cannot-determine'

export interface PrepaymentRuleInput {
  sanctionDate?: string
  lenderCategory: LenderCategory
  nbfcLayer?: NbfcLayer
  coopTier?: CoopTier
  borrowerType: BorrowerType
  purpose: LoanPurpose
  rateType: RateType
  sanctionedAmount: number
  initiatedByLender?: boolean
}

export interface PrepaymentRuleResult {
  status: PrepaymentRuleStatus
  /** Translation key explaining the result. */
  reason: string
  /** Facts we still need to say more. */
  missing: string[]
  /** Ids of entries in content/sources.ts. */
  sourceIds: string[]
}

export const PREPAYMENT_DIRECTIONS_EFFECTIVE = '2026-01-01'
const FIFTY_LAKH = 50_00_000
const NEW_RULES = 'rbi-prepayment-2025'
const OLD_RULES = 'rbi-foreclosure-2019'
const KFS = 'rbi-rbc-banks-2025'

const REGULATED: LenderCategory[] = ['bank', 'small-finance-bank', 'regional-rural-bank', 'cooperative-bank', 'nbfc', 'hfc']

export function checkPrepaymentRules(input: PrepaymentRuleInput): PrepaymentRuleResult {
  const missing: string[] = []
  const sanction = parseIsoDate(input.sanctionDate)
  const isNewRegime = sanction ? sanction.getTime() >= parseIsoDate(PREPAYMENT_DIRECTIONS_EFFECTIVE)!.getTime() : null

  if (input.lenderCategory === 'unknown' || input.lenderCategory === 'other') {
    return { status: 'cannot-determine', reason: 'lender-type-unknown', missing: ['lenderCategory'], sourceIds: [NEW_RULES] }
  }
  if (!REGULATED.includes(input.lenderCategory)) {
    return { status: 'cannot-determine', reason: 'lender-type-unknown', missing: ['lenderCategory'], sourceIds: [NEW_RULES] }
  }
  if (input.initiatedByLender && isNewRegime) {
    return { status: 'likely-no-charge', reason: 'lender-initiated', missing: [], sourceIds: [NEW_RULES] }
  }
  if (input.rateType === 'unknown') missing.push('rateType')
  if (input.purpose === 'unknown') missing.push('purpose')
  if (input.borrowerType === 'unknown') missing.push('borrowerType')
  if (missing.length) return { status: 'cannot-determine', reason: 'missing-facts', missing, sourceIds: [NEW_RULES] }

  if (input.rateType === 'hybrid') {
    return { status: 'cannot-determine', reason: 'hybrid-depends', missing: ['currentRateType'], sourceIds: [NEW_RULES] }
  }
  if (input.rateType === 'fixed') {
    return { status: 'lender-policy', reason: 'fixed-rate', missing: [], sourceIds: [NEW_RULES, KFS] }
  }

  // Floating rate from here on.
  if (input.purpose === 'personal' && input.borrowerType === 'individual') {
    if (isNewRegime === null) {
      // Both the new directions and the older instructions bar charges here.
      return { status: 'likely-no-charge', reason: 'floating-individual-any-date', missing: [], sourceIds: [NEW_RULES, OLD_RULES] }
    }
    return {
      status: 'likely-no-charge',
      reason: isNewRegime ? 'floating-individual-new' : 'floating-individual-old',
      missing: [],
      sourceIds: isNewRegime ? [NEW_RULES] : [OLD_RULES],
    }
  }

  const businessBorrower = input.borrowerType === 'individual' || input.borrowerType === 'mse'
  if (input.purpose === 'business' && businessBorrower) {
    if (isNewRegime === null) {
      return { status: 'cannot-determine', reason: 'business-date-needed', missing: ['sanctionDate'], sourceIds: [NEW_RULES] }
    }
    if (!isNewRegime) return { status: 'lender-policy', reason: 'business-old', missing: [], sourceIds: [OLD_RULES] }
    const upTo50L = input.sanctionedAmount <= FIFTY_LAKH
    switch (input.lenderCategory) {
      case 'bank':
        return { status: 'likely-no-charge', reason: 'business-bank', missing: [], sourceIds: [NEW_RULES] }
      case 'small-finance-bank':
      case 'regional-rural-bank':
        return upTo50L
          ? { status: 'likely-no-charge', reason: 'business-upto-50l', missing: [], sourceIds: [NEW_RULES] }
          : { status: 'lender-policy', reason: 'business-above-50l', missing: [], sourceIds: [NEW_RULES] }
      case 'nbfc':
      case 'hfc': {
        const layer = input.nbfcLayer ?? 'unknown'
        if (layer === 'upper') return { status: 'likely-no-charge', reason: 'business-nbfc-ul', missing: [], sourceIds: [NEW_RULES] }
        if (layer === 'middle')
          return upTo50L
            ? { status: 'likely-no-charge', reason: 'business-upto-50l', missing: [], sourceIds: [NEW_RULES] }
            : { status: 'lender-policy', reason: 'business-above-50l', missing: [], sourceIds: [NEW_RULES] }
        if (layer === 'base') return { status: 'lender-policy', reason: 'business-nbfc-bl', missing: [], sourceIds: [NEW_RULES] }
        return { status: 'cannot-determine', reason: 'business-nbfc-layer', missing: ['nbfcLayer'], sourceIds: [NEW_RULES] }
      }
      case 'cooperative-bank': {
        const tier = input.coopTier ?? 'unknown'
        if (tier === 'ucb-tier4') return { status: 'likely-no-charge', reason: 'business-bank', missing: [], sourceIds: [NEW_RULES] }
        if (tier === 'ucb-tier3' || tier === 'state-or-central')
          return upTo50L
            ? { status: 'likely-no-charge', reason: 'business-upto-50l', missing: [], sourceIds: [NEW_RULES] }
            : { status: 'lender-policy', reason: 'business-above-50l', missing: [], sourceIds: [NEW_RULES] }
        if (tier === 'ucb-tier1-2') return { status: 'lender-policy', reason: 'business-coop-small', missing: [], sourceIds: [NEW_RULES] }
        return { status: 'cannot-determine', reason: 'business-coop-tier', missing: ['coopTier'], sourceIds: [NEW_RULES] }
      }
    }
  }
  return { status: 'lender-policy', reason: 'other-borrower', missing: [], sourceIds: [NEW_RULES] }
}
