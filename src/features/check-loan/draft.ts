import { z } from 'zod/mini'
import {
  CHARGE_CATEGORIES,
  LENDER_CATEGORIES,
  LOAN_TYPES,
  PERIODS_PER_YEAR,
  known,
  unknown,
  type ChargeRate,
  type LoanInput,
  type Maybe,
} from '@/lib/finance'
import { uid } from '@/lib/utils'

/**
 * The wizard's editable state ("draft"). It is stored in localStorage and
 * converted to the engine's LoanInput by `draftToInput`.
 *
 * Every number is a NumField: an empty value or an "I don't know" tick both
 * become `unknown` for the engine — never zero.
 */

export const NumFieldSchema = z.object({
  value: z.nullable(z.number()),
  unknown: z.boolean(),
  /** true when the user marked the value as an estimate rather than from a document. */
  estimate: z.optional(z.boolean()),
})
export type NumField = z.infer<typeof NumFieldSchema>
export const emptyNum = (): NumField => ({ value: null, unknown: false })
export const num = (value: number, estimate = false): NumField => ({ value, unknown: false, estimate })

const YNU = z.enum(['yes', 'no', 'unknown'])

export const ChargeDraftSchema = z.object({
  id: z.string(),
  category: z.enum(CHARGE_CATEGORIES),
  name: z.string(),
  amountMode: z.enum(['rupees', 'percent']),
  amount: NumFieldSchema,
  payment: z.enum(['deducted', 'separate', 'in-emi', 'unknown']),
  gst: z.enum(['included', 'additional', 'not-applicable', 'unknown']),
  gstAmount: NumFieldSchema,
  mandatory: YNU,
  recipient: z.enum(['lender', 'insurer', 'dealer', 'broker-lsp', 'government', 'third-party', 'unknown']),
  inKfs: YNU,
})
export type ChargeDraft = z.infer<typeof ChargeDraftSchema>

export const RecurringDraftSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: NumFieldSchema,
  frequency: z.enum(['monthly', 'quarterly', 'annual']),
  payment: z.enum(['separate', 'in-emi', 'unknown']),
})
export type RecurringDraft = z.infer<typeof RecurringDraftSchema>

export const ContingentDraftSchema = z.object({
  id: z.string(),
  kind: z.enum(['late-payment', 'bounce', 'penal', 'collection', 'other']),
  name: z.string(),
  amount: NumFieldSchema,
})
export type ContingentDraft = z.infer<typeof ContingentDraftSchema>

const ChargeRateDraftSchema = z.object({ mode: z.enum(['percent', 'fixed']), value: NumFieldSchema })
export type ChargeRateDraft = z.infer<typeof ChargeRateDraftSchema>

export const LoanDraftSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  label: z.string(),
  loanType: z.enum(LOAN_TYPES),
  lenderName: z.string(),
  lenderCategory: z.enum(LENDER_CATEGORIES),
  nbfcLayer: z.enum(['upper', 'middle', 'base', 'unknown']),
  coopTier: z.enum(['ucb-tier4', 'ucb-tier3', 'ucb-tier1-2', 'state-or-central', 'unknown']),
  borrowerType: z.enum(['individual', 'mse', 'other', 'unknown']),
  purpose: z.enum(['personal', 'business', 'unknown']),
  purposeNote: z.string(),
  status: z.enum(['new', 'existing']),
  sanctionDate: z.string(),
  disbursementDate: z.string(),
  firstEmiDate: z.string(),
  lastEmiDate: z.string(),
  sanctionedAmount: NumFieldSchema,
  disbursedAmount: NumFieldSchema,
  netReceived: NumFieldSchema,
  tenureValue: NumFieldSchema,
  tenureUnit: z.enum(['months', 'years', 'emis']),
  frequency: z.enum(['monthly', 'quarterly', 'fortnightly', 'weekly']),
  quotedRate: NumFieldSchema,
  rateType: z.enum(['fixed', 'floating', 'hybrid', 'unknown']),
  rateMethod: z.enum(['reducing', 'flat', 'daily-reducing', 'monthly-reducing', 'unknown']),
  benchmark: z.string(),
  spread: NumFieldSchema,
  resetFrequency: z.string(),
  emi: NumFieldSchema,
  advanceEmiCount: z.int().check(z.minimum(0)),
  advanceEmiPayment: z.enum(['deducted', 'separate']),
  moratoriumMonths: z.int().check(z.minimum(0)),
  charges: z.array(ChargeDraftSchema),
  allChargesListed: z.enum(['yes', 'unsure']),
  recurring: z.array(RecurringDraftSchema),
  contingent: z.array(ContingentDraftSchema),
  prepayment: z.object({
    partAllowed: YNU,
    minPart: NumFieldSchema,
    partCharge: ChargeRateDraftSchema,
    foreclosure: ChargeRateDraftSchema,
    gstPct: NumFieldSchema,
    lockInMonths: NumFieldSchema,
    btAvailable: YNU,
  }),
  existing: z.object({
    emisPaid: NumFieldSchema,
    outstanding: NumFieldSchema,
    remainingEmis: NumFieldSchema,
    currentRate: NumFieldSchema,
    currentEmi: NumFieldSchema,
    foreclosureQuote: NumFieldSchema,
  }),
  documents: z.object({
    kfs: z.boolean(),
    sanctionLetter: z.boolean(),
    loanAgreement: z.boolean(),
    amortizationSchedule: z.boolean(),
    statement: z.boolean(),
    foreclosureLetter: z.boolean(),
  }),
  valuesSource: z.enum(['documents', 'mixed', 'memory']),
  updatedAt: z.string(),
})
export type LoanDraft = z.infer<typeof LoanDraftSchema>

export function createDraft(): LoanDraft {
  return {
    version: 1,
    id: uid('loan'),
    label: '',
    loanType: 'personal',
    lenderName: '',
    lenderCategory: 'unknown',
    nbfcLayer: 'unknown',
    coopTier: 'unknown',
    borrowerType: 'individual',
    purpose: 'personal',
    purposeNote: '',
    status: 'new',
    sanctionDate: '',
    disbursementDate: '',
    firstEmiDate: '',
    lastEmiDate: '',
    sanctionedAmount: emptyNum(),
    disbursedAmount: emptyNum(),
    netReceived: emptyNum(),
    tenureValue: emptyNum(),
    tenureUnit: 'months',
    frequency: 'monthly',
    quotedRate: emptyNum(),
    rateType: 'unknown',
    rateMethod: 'unknown',
    benchmark: '',
    spread: emptyNum(),
    resetFrequency: '',
    emi: emptyNum(),
    advanceEmiCount: 0,
    advanceEmiPayment: 'deducted',
    moratoriumMonths: 0,
    charges: [],
    allChargesListed: 'unsure',
    recurring: [],
    contingent: [],
    prepayment: {
      partAllowed: 'unknown',
      minPart: emptyNum(),
      partCharge: { mode: 'percent', value: emptyNum() },
      foreclosure: { mode: 'percent', value: emptyNum() },
      gstPct: emptyNum(),
      lockInMonths: emptyNum(),
      btAvailable: 'unknown',
    },
    existing: {
      emisPaid: emptyNum(),
      outstanding: emptyNum(),
      remainingEmis: emptyNum(),
      currentRate: emptyNum(),
      currentEmi: emptyNum(),
      foreclosureQuote: emptyNum(),
    },
    documents: { kfs: false, sanctionLetter: false, loanAgreement: false, amortizationSchedule: false, statement: false, foreclosureLetter: false },
    valuesSource: 'mixed',
    updatedAt: new Date().toISOString(),
  }
}

export function newCharge(category: ChargeDraft['category'], name: string): ChargeDraft {
  const insurance = category === 'insurance' || category === 'credit-life-insurance' || category === 'loan-protection-insurance'
  return {
    id: uid('chg'),
    category,
    name,
    amountMode: 'rupees',
    amount: emptyNum(),
    payment: 'deducted',
    gst: category === 'gst' || category === 'stamp-duty' ? 'not-applicable' : 'unknown',
    gstAmount: emptyNum(),
    mandatory: 'unknown',
    recipient: insurance ? 'insurer' : category === 'stamp-duty' || category === 'registration' ? 'government' : category === 'dealer' ? 'dealer' : category === 'broker-lsp' ? 'broker-lsp' : 'lender',
    inKfs: 'unknown',
  }
}

/** A NumField the engine can use: empty or "don't know" → unknown. */
export function toMaybe(field: NumField): Maybe<number> {
  if (field.unknown || field.value === null || !Number.isFinite(field.value)) return unknown
  return known(field.value, field.estimate ? 'estimate' : 'document')
}

export function tenurePeriods(draft: Pick<LoanDraft, 'tenureValue' | 'tenureUnit' | 'frequency'>): number {
  const v = draft.tenureValue.value
  if (draft.tenureValue.unknown || v === null || !(v > 0)) return 0
  const k = PERIODS_PER_YEAR[draft.frequency]
  if (draft.tenureUnit === 'emis') return Math.round(v)
  if (draft.tenureUnit === 'years') return Math.round(v * k)
  return Math.round((v * k) / 12)
}

/** Loan principal used to convert "% of loan" charges into ₹. */
export function chargeBase(draft: LoanDraft): number {
  const d = draft.disbursedAmount
  if (!d.unknown && d.value && d.value > 0) return d.value
  return draft.sanctionedAmount.value ?? 0
}

/** ₹ amount of a charge (converts % of loan). null if unknown. */
export function chargeRupees(c: ChargeDraft, base: number): number | null {
  if (c.amount.unknown || c.amount.value === null) return null
  return c.amountMode === 'percent' ? (base * c.amount.value) / 100 : c.amount.value
}

function toChargeRate(d: ChargeRateDraft): Maybe<ChargeRate> {
  const v = d.value
  if (v.unknown || v.value === null) return unknown
  return known({ mode: d.mode, value: v.value } as ChargeRate)
}

export function draftToInput(draft: LoanDraft): LoanInput {
  const base = chargeBase(draft)
  return {
    loanType: draft.loanType,
    lenderName: draft.lenderName,
    lenderCategory: draft.lenderCategory,
    nbfcLayer: draft.nbfcLayer,
    coopTier: draft.coopTier,
    borrowerType: draft.borrowerType,
    purpose: draft.purpose,
    status: draft.status,
    sanctionDate: draft.sanctionDate || undefined,
    disbursementDate: draft.disbursementDate || undefined,
    firstEmiDate: draft.firstEmiDate || undefined,
    sanctionedAmount: draft.sanctionedAmount.value ?? 0,
    disbursedAmount: toMaybe(draft.disbursedAmount),
    netReceived: toMaybe(draft.netReceived),
    tenurePeriods: tenurePeriods(draft),
    frequency: draft.frequency,
    quotedRatePct: toMaybe(draft.quotedRate),
    rateType: draft.rateType,
    rateMethod: draft.rateMethod,
    benchmark: draft.benchmark || undefined,
    spreadPct: toMaybe(draft.spread),
    emi: toMaybe(draft.emi),
    advanceEmiCount: draft.advanceEmiCount,
    advanceEmiPayment: draft.advanceEmiPayment,
    moratoriumPeriods: Math.round((draft.moratoriumMonths * PERIODS_PER_YEAR[draft.frequency]) / 12),
    charges: draft.charges.map((c) => {
      const rupees = chargeRupees(c, base)
      return {
        id: c.id,
        category: c.category,
        name: c.name,
        amount: rupees === null ? unknown : known(rupees, c.amount.estimate ? 'estimate' : 'document'),
        payment: c.payment,
        gst: c.gst,
        gstAmount: toMaybe(c.gstAmount),
        mandatory: c.mandatory,
        recipient: c.recipient,
        inKfs: c.inKfs,
      }
    }),
    allChargesListed: draft.allChargesListed,
    recurring: draft.recurring.map((r) => ({ id: r.id, name: r.name, amount: toMaybe(r.amount), frequency: r.frequency, payment: r.payment })),
    contingent: draft.contingent.map((c) => ({ id: c.id, kind: c.kind, name: c.name, amount: toMaybe(c.amount) })),
    prepayment: {
      partPrepaymentAllowed: draft.prepayment.partAllowed,
      minPartPrepayment: toMaybe(draft.prepayment.minPart),
      partPrepaymentCharge: toChargeRate(draft.prepayment.partCharge),
      foreclosureCharge: toChargeRate(draft.prepayment.foreclosure),
      gstOnChargesPct: toMaybe(draft.prepayment.gstPct),
      lockInMonths: toMaybe(draft.prepayment.lockInMonths),
      balanceTransferAvailable: draft.prepayment.btAvailable,
    },
    existing:
      draft.status === 'existing'
        ? {
            emisPaid: toMaybe(draft.existing.emisPaid),
            outstanding: toMaybe(draft.existing.outstanding),
            remainingEmis: toMaybe(draft.existing.remainingEmis),
            currentRatePct: toMaybe(draft.existing.currentRate),
            currentEmi: toMaybe(draft.existing.currentEmi),
            foreclosureQuote: toMaybe(draft.existing.foreclosureQuote),
          }
        : undefined,
    documents: draft.documents,
    valuesSource: draft.valuesSource,
  }
}

/** Illustrative example used on the home page and "try an example" — NOT a real lender offer. */
export function exampleDraft(): LoanDraft {
  const d = createDraft()
  const processing = { ...newCharge('processing', 'Processing fee'), amount: num(12_000), gst: 'included' as const, mandatory: 'yes' as const, inKfs: 'yes' as const }
  const insurance = {
    ...newCharge('loan-protection-insurance', 'Loan protection insurance'),
    amount: num(8_000),
    gst: 'included' as const,
    mandatory: 'unknown' as const,
    inKfs: 'yes' as const,
  }
  return {
    ...d,
    label: 'Illustrative example',
    loanType: 'personal',
    lenderName: 'Example lender (illustrative)',
    lenderCategory: 'bank',
    sanctionedAmount: num(5_00_000),
    netReceived: num(4_80_000),
    tenureValue: num(44),
    tenureUnit: 'emis',
    quotedRate: num(12),
    rateType: 'fixed',
    rateMethod: 'reducing',
    charges: [processing, insurance],
    allChargesListed: 'yes',
  }
}
