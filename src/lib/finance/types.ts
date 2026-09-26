/**
 * Domain types for the loan-cost engine.
 *
 * Money is always in Indian Rupees (₹). Rates are annual percentages
 * (12 means 12% p.a.). Nothing in this folder touches the DOM or React.
 */

/** A value the user either knows (from a document or as an estimate) or explicitly doesn't know. */
export type Known<T> = { kind: 'known'; value: T; source?: 'document' | 'estimate' }
export type Unknown = { kind: 'unknown' }
export type Maybe<T> = Known<T> | Unknown

export const unknown: Unknown = { kind: 'unknown' }
export function known<T>(value: T, source: 'document' | 'estimate' = 'document'): Known<T> {
  return { kind: 'known', value, source }
}
export function isKnown<T>(m: Maybe<T> | undefined | null): m is Known<T> {
  return !!m && m.kind === 'known'
}
/** Read a known value or undefined. Never converts "unknown" into 0. */
export function valueOf<T>(m: Maybe<T> | undefined | null): T | undefined {
  return isKnown(m) ? m.value : undefined
}

export const LOAN_TYPES = [
  'personal',
  'home',
  'vehicle',
  'car',
  'two-wheeler',
  'education',
  'consumer-durable',
  'electronics-emi',
  'business',
  'lap',
  'gold',
  'other',
] as const
export type LoanType = (typeof LOAN_TYPES)[number]

export const LENDER_CATEGORIES = [
  'bank',
  'small-finance-bank',
  'regional-rural-bank',
  'cooperative-bank',
  'nbfc',
  'hfc',
  'other',
  'unknown',
] as const
export type LenderCategory = (typeof LENDER_CATEGORIES)[number]

/** RBI scale-based regulation layer for NBFCs/HFCs, if the borrower knows it. */
export type NbfcLayer = 'upper' | 'middle' | 'base' | 'unknown'
/** Type/tier of co-operative bank, if known. */
export type CoopTier = 'ucb-tier4' | 'ucb-tier3' | 'ucb-tier1-2' | 'state-or-central' | 'unknown'

export type BorrowerType = 'individual' | 'mse' | 'other' | 'unknown'
/** Non-business ("personal") vs business purpose. */
export type LoanPurpose = 'personal' | 'business' | 'unknown'
export type RateType = 'fixed' | 'floating' | 'hybrid' | 'unknown'
export type RateMethod = 'reducing' | 'flat' | 'daily-reducing' | 'monthly-reducing' | 'unknown'
export type Frequency = 'monthly' | 'quarterly' | 'fortnightly' | 'weekly'
export type YesNoUnknown = 'yes' | 'no' | 'unknown'

export const PERIODS_PER_YEAR: Record<Frequency, number> = {
  monthly: 12,
  quarterly: 4,
  fortnightly: 26,
  weekly: 52,
}

export const CHARGE_CATEGORIES = [
  'processing',
  'gst',
  'documentation',
  'administrative',
  'legal',
  'valuation',
  'stamp-duty',
  'mortgage',
  'hypothecation',
  'registration',
  'insurance',
  'credit-life-insurance',
  'loan-protection-insurance',
  'dealer',
  'broker-lsp',
  'pre-emi',
  'first-emi-adjustment',
  'other',
] as const
export type ChargeCategory = (typeof CHARGE_CATEGORIES)[number]

/** How an upfront charge was paid. "in-emi" = spread inside the EMI amount. */
export type ChargePayment = 'deducted' | 'separate' | 'in-emi' | 'unknown'
export type GstTreatment = 'included' | 'additional' | 'not-applicable' | 'unknown'
export type Recipient = 'lender' | 'insurer' | 'dealer' | 'broker-lsp' | 'government' | 'third-party' | 'unknown'

export interface UpfrontCharge {
  id: string
  category: ChargeCategory
  name: string
  /** Amount in ₹ (the UI converts "% of loan" entries to ₹ before calling the engine). */
  amount: Maybe<number>
  payment: ChargePayment
  gst: GstTreatment
  /** GST amount in ₹ when gst === 'additional'. */
  gstAmount?: Maybe<number>
  mandatory: YesNoUnknown
  recipient: Recipient
  /** Was this charge listed in the KFS / sanction letter? */
  inKfs?: YesNoUnknown
}

export type RecurringFrequency = 'monthly' | 'quarterly' | 'annual'
export interface RecurringCharge {
  id: string
  name: string
  amount: Maybe<number>
  frequency: RecurringFrequency
  /** 'in-emi' charges are already inside the EMI and are not added again. */
  payment: 'separate' | 'in-emi' | 'unknown'
}

export type ContingentKind = 'late-payment' | 'bounce' | 'penal' | 'collection' | 'other'
/** Charges payable only if something happens (late payment, bounce…). Never part of the base cost. */
export interface ContingentCharge {
  id: string
  kind: ContingentKind
  name: string
  /** ₹ per event. */
  amount: Maybe<number>
}

/** A charge expressed either as % of an amount or as a fixed ₹ amount. */
export type ChargeRate = { mode: 'percent'; value: number } | { mode: 'fixed'; value: number }

export interface PrepaymentTerms {
  partPrepaymentAllowed: YesNoUnknown
  minPartPrepayment: Maybe<number>
  partPrepaymentCharge: Maybe<ChargeRate>
  foreclosureCharge: Maybe<ChargeRate>
  /** GST % applied on top of prepayment/foreclosure charges, if applicable. */
  gstOnChargesPct: Maybe<number>
  lockInMonths: Maybe<number>
  balanceTransferAvailable: YesNoUnknown
}

export interface ExistingLoanInfo {
  emisPaid: Maybe<number>
  outstanding: Maybe<number>
  remainingEmis: Maybe<number>
  currentRatePct: Maybe<number>
  currentEmi: Maybe<number>
  /** Total foreclosure amount quoted by the lender (principal + charges), if any. */
  foreclosureQuote: Maybe<number>
}

export interface DocumentsHeld {
  kfs: boolean
  sanctionLetter: boolean
  loanAgreement: boolean
  amortizationSchedule: boolean
  statement: boolean
  foreclosureLetter: boolean
}

export const NO_DOCUMENTS: DocumentsHeld = {
  kfs: false,
  sanctionLetter: false,
  loanAgreement: false,
  amortizationSchedule: false,
  statement: false,
  foreclosureLetter: false,
}

export interface LoanInput {
  loanType: LoanType
  lenderName?: string
  lenderCategory: LenderCategory
  nbfcLayer?: NbfcLayer
  coopTier?: CoopTier
  borrowerType: BorrowerType
  purpose: LoanPurpose
  status: 'new' | 'existing'
  sanctionDate?: string
  disbursementDate?: string
  firstEmiDate?: string

  sanctionedAmount: number
  /** Loan amount disbursed by the lender before deductions (if different from sanctioned). */
  disbursedAmount: Maybe<number>
  /** Money actually received by the borrower (or paid to dealer/builder on their behalf) after deductions. */
  netReceived: Maybe<number>

  /** Total number of instalments, including any advance EMIs. */
  tenurePeriods: number
  frequency: Frequency

  quotedRatePct: Maybe<number>
  rateType: RateType
  rateMethod: RateMethod
  benchmark?: string
  spreadPct?: Maybe<number>

  emi: Maybe<number>
  /** EMIs collected at disbursement (common in vehicle loans). */
  advanceEmiCount: number
  advanceEmiPayment: 'deducted' | 'separate'
  /** Periods between disbursement and the first regular EMI beyond the normal one period (moratorium). */
  moratoriumPeriods: number

  charges: UpfrontCharge[]
  /** Has the user confirmed that all upfront charges are listed? */
  allChargesListed: 'yes' | 'unsure'
  recurring: RecurringCharge[]
  contingent: ContingentCharge[]
  prepayment: PrepaymentTerms
  existing?: ExistingLoanInfo
  documents: DocumentsHeld
  /** Where the numbers came from overall. */
  valuesSource: 'documents' | 'mixed' | 'memory'
}

/** Grouping used in cost breakdowns and the "why is the cost different" attribution. */
export type ChargeGroup =
  | 'processing'
  | 'gst'
  | 'insurance'
  | 'documentation-legal'
  | 'intermediary'
  | 'interest-like'
  | 'other'

export const CHARGE_GROUP_OF: Record<ChargeCategory, ChargeGroup> = {
  processing: 'processing',
  administrative: 'processing',
  gst: 'gst',
  documentation: 'documentation-legal',
  legal: 'documentation-legal',
  valuation: 'documentation-legal',
  'stamp-duty': 'documentation-legal',
  mortgage: 'documentation-legal',
  hypothecation: 'documentation-legal',
  registration: 'documentation-legal',
  insurance: 'insurance',
  'credit-life-insurance': 'insurance',
  'loan-protection-insurance': 'insurance',
  dealer: 'intermediary',
  'broker-lsp': 'intermediary',
  'pre-emi': 'interest-like',
  'first-emi-adjustment': 'interest-like',
  other: 'other',
}

/** A message produced by the engine: a translation key plus parameters. The UI renders it. */
export interface EngineMessage {
  code: string
  params?: Record<string, string | number>
}
