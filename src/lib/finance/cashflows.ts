import { calculateEmi } from './emi'
import { flatEmi } from './flat'
import { parseIsoDate, periodsBetween } from './dates'
import type { CashFlow } from './irr'
import {
  CHARGE_GROUP_OF,
  PERIODS_PER_YEAR,
  valueOf,
  type ChargeCategory,
  type ChargeGroup,
  type ChargePayment,
  type EngineMessage,
  type LoanInput,
  type Recipient,
  type RecurringFrequency,
  type YesNoUnknown,
} from './types'

/**
 * Turns the user's loan description into borrower cash flows:
 *
 *   t = 0          + net amount actually received
 *   t = 0          − charges paid separately (and advance EMIs paid separately)
 *   t = 1, 2, …    − EMIs (shifted for a moratorium or an irregular first EMI date)
 *   t = k, 2k, …   − known recurring charges (annual/quarterly/monthly)
 *
 * Contingent charges (late payment, bounce, penal, collection) are never
 * included: they only arise if something goes wrong, and RBI's APR concept is
 * about the contracted cost of credit.
 */

export interface NormalizedCharge {
  id: string
  name: string
  category: ChargeCategory
  group: ChargeGroup
  /** ₹, or null when the user doesn't know the amount. */
  amount: number | null
  /** Additional GST in ₹ (0 if included / not applicable / unknown). */
  gstAmount: number
  gstUnknown: boolean
  payment: Exclude<ChargePayment, 'unknown'>
  paymentAssumed: boolean
  mandatory: YesNoUnknown
  recipient: Recipient
  inKfs: YesNoUnknown
}

export interface NormalizedRecurring {
  id: string
  name: string
  amount: number | null
  frequency: RecurringFrequency
  /** true if it is inside the EMI the user entered (so not added again). */
  insideEnteredEmi: boolean
  paymentAssumed: boolean
}

export interface LoanContext {
  periodsPerYear: number
  n: number
  advanceCount: number
  advanceDeducted: boolean
  principal: number
  emi: number
  emiDerived: boolean
  quotedRatePct: number | null
  /** Time (in periods) of the first regular EMI after disbursement. */
  firstEmiOffset: number
  irregularFirstEmi: boolean
  charges: NormalizedCharge[]
  recurring: NormalizedRecurring[]
  /** Principal − deducted charges (+GST) − advance EMIs deducted. */
  expectedNet: number
  /** Net amount used in the cash flows (documented value if entered). */
  netReceived: number
  netDerived: boolean
  /** Money missing from the amount received that no listed charge explains. */
  unitemisedDeduction: number
  /** Amount received above what the listed deductions imply. */
  receivedAboveExpected: number
  assumptions: EngineMessage[]
  unknowns: EngineMessage[]
}

export type InsufficientReason = 'sanctioned-amount' | 'tenure' | 'emi-or-rate'

export function missingCoreData(input: LoanInput): InsufficientReason[] {
  const missing: InsufficientReason[] = []
  if (!(input.sanctionedAmount > 0)) missing.push('sanctioned-amount')
  if (!(input.tenurePeriods > 0)) missing.push('tenure')
  const emi = valueOf(input.emi)
  const rate = valueOf(input.quotedRatePct)
  if (!(emi !== undefined && emi > 0) && !(rate !== undefined && rate >= 0)) missing.push('emi-or-rate')
  return missing
}

const NET_TOLERANCE = 1

/** Resolve user input into a consistent loan context. Call missingCoreData first. */
export function resolveLoan(input: LoanInput): LoanContext {
  const k = PERIODS_PER_YEAR[input.frequency]
  const n = Math.floor(input.tenurePeriods)
  const advanceCount = Math.max(0, Math.min(Math.floor(input.advanceEmiCount || 0), n - 1))
  const deferPeriods = Math.max(0, Math.floor(input.moratoriumPeriods || 0))
  const assumptions: EngineMessage[] = []
  const unknowns: EngineMessage[] = []

  const disbursed = valueOf(input.disbursedAmount)
  const principal = disbursed !== undefined && disbursed > 0 ? disbursed : input.sanctionedAmount
  const quotedRatePct = valueOf(input.quotedRatePct) ?? null

  // --- EMI -----------------------------------------------------------------
  let emi = valueOf(input.emi)
  let emiDerived = false
  if (!(emi !== undefined && emi > 0)) {
    const rate = quotedRatePct ?? 0
    if (input.rateMethod === 'flat') {
      emi = flatEmi(principal, rate, n, k)
    } else {
      emi = calculateEmi(principal, rate, n, { periodsPerYear: k, advanceCount, deferPeriods })
    }
    emiDerived = true
    assumptions.push({ code: 'emi-derived', params: { method: input.rateMethod === 'flat' ? 'flat' : 'reducing' } })
  }
  if (quotedRatePct === null) unknowns.push({ code: 'quoted-rate' })
  if (input.rateMethod === 'unknown') {
    assumptions.push({ code: 'method-assumed-reducing' })
    unknowns.push({ code: 'rate-method' })
  }
  if (input.rateMethod === 'daily-reducing') assumptions.push({ code: 'daily-reducing-approx' })
  if (input.rateType === 'floating' || input.rateType === 'hybrid') assumptions.push({ code: 'floating-rate-constant' })

  // --- First EMI timing ----------------------------------------------------
  let firstEmiOffset = 1 + deferPeriods
  let irregularFirstEmi = false
  const d0 = parseIsoDate(input.disbursementDate)
  const d1 = parseIsoDate(input.firstEmiDate)
  if (d0 && d1 && d1.getTime() > d0.getTime()) {
    const offset = periodsBetween(d0, d1, k)
    if (Math.abs(offset - firstEmiOffset) > 0.02) irregularFirstEmi = true
    firstEmiOffset = offset
  }

  // --- Upfront charges -----------------------------------------------------
  const charges: NormalizedCharge[] = input.charges.map((c) => {
    const amount = valueOf(c.amount)
    if (amount === undefined) unknowns.push({ code: 'charge-amount', params: { name: c.name } })
    let gstAmount = 0
    let gstUnknown = false
    if (c.gst === 'additional') {
      const g = valueOf(c.gstAmount)
      if (g === undefined) {
        gstUnknown = true
        unknowns.push({ code: 'charge-gst-amount', params: { name: c.name } })
      } else gstAmount = g
    } else if (c.gst === 'unknown' && c.category !== 'gst') {
      gstUnknown = true
      unknowns.push({ code: 'charge-gst-treatment', params: { name: c.name } })
    }
    let payment: NormalizedCharge['payment']
    let paymentAssumed = false
    if (c.payment === 'unknown') {
      payment = 'deducted'
      paymentAssumed = true
      assumptions.push({ code: 'payment-assumed-deducted', params: { name: c.name } })
    } else payment = c.payment
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      group: CHARGE_GROUP_OF[c.category],
      amount: amount ?? null,
      gstAmount,
      gstUnknown,
      payment,
      paymentAssumed,
      mandatory: c.mandatory,
      recipient: c.recipient,
      inKfs: c.inKfs ?? 'unknown',
    }
  })
  if (input.allChargesListed !== 'yes') unknowns.push({ code: 'all-charges' })

  // --- Recurring charges ---------------------------------------------------
  const recurring: NormalizedRecurring[] = input.recurring.map((r) => {
    const amount = valueOf(r.amount)
    if (amount === undefined) unknowns.push({ code: 'recurring-amount', params: { name: r.name } })
    const paymentAssumed = r.payment === 'unknown'
    if (paymentAssumed) assumptions.push({ code: 'recurring-assumed-separate', params: { name: r.name } })
    return {
      id: r.id,
      name: r.name,
      amount: amount ?? null,
      frequency: r.frequency,
      insideEnteredEmi: r.payment === 'in-emi' && !emiDerived,
      paymentAssumed,
    }
  })
  if (recurring.some((r) => r.frequency === 'annual' && r.amount !== null && !r.insideEnteredEmi)) {
    assumptions.push({ code: 'annual-fee-timing' })
  }

  // --- Net amount received -------------------------------------------------
  const advanceDeducted = advanceCount > 0 && input.advanceEmiPayment !== 'separate'
  let deducted = 0
  for (const c of charges) {
    if (c.payment === 'deducted' && c.amount !== null) deducted += c.amount + c.gstAmount
  }
  const expectedNet = principal - deducted - (advanceDeducted ? advanceCount * emi : 0)
  const netEntered = valueOf(input.netReceived)
  let netReceived: number
  let netDerived: boolean
  let unitemisedDeduction = 0
  let receivedAboveExpected = 0
  if (netEntered !== undefined && netEntered > 0) {
    netReceived = netEntered
    netDerived = false
    const gap = expectedNet - netEntered
    if (gap > NET_TOLERANCE) unitemisedDeduction = gap
    else if (gap < -NET_TOLERANCE) receivedAboveExpected = -gap
  } else {
    netReceived = expectedNet
    netDerived = true
    assumptions.push({ code: 'net-derived' })
    unknowns.push({ code: 'net-received' })
  }

  return {
    periodsPerYear: k,
    n,
    advanceCount,
    advanceDeducted,
    principal,
    emi,
    emiDerived,
    quotedRatePct,
    firstEmiOffset,
    irregularFirstEmi,
    charges,
    recurring,
    expectedNet,
    netReceived,
    netDerived,
    unitemisedDeduction,
    receivedAboveExpected,
    assumptions,
    unknowns,
  }
}

/** What to include when building flows (used for step-by-step attribution). */
export interface FlowInclude {
  /** Use the actual first-EMI timing (moratorium / irregular date) instead of t = 1. */
  actualTiming: boolean
  /** Model advance EMIs at t = 0 instead of as regular EMIs. */
  advance: boolean
  groups: ReadonlySet<ChargeGroup>
  unitemised: boolean
  recurring: boolean
  /** Use the documented net amount instead of principal − listed items (only for the full calculation). */
  documentedNet: boolean
}

export const ALL_GROUPS: ReadonlySet<ChargeGroup> = new Set<ChargeGroup>([
  'processing',
  'gst',
  'insurance',
  'documentation-legal',
  'intermediary',
  'interest-like',
  'other',
])

export const FULL_INCLUDE: FlowInclude = {
  actualTiming: true,
  advance: true,
  groups: ALL_GROUPS,
  unitemised: true,
  recurring: true,
  documentedNet: true,
}

/** Times (in periods) at which regular EMIs fall. */
export function emiTimes(ctx: LoanContext, include: Pick<FlowInclude, 'actualTiming' | 'advance'>): number[] {
  const count = include.advance ? ctx.n - ctx.advanceCount : ctx.n
  const first = include.actualTiming ? ctx.firstEmiOffset : 1
  return Array.from({ length: count }, (_, i) => first + i)
}

export function buildFlows(ctx: LoanContext, include: FlowInclude = FULL_INCLUDE): CashFlow[] {
  const flows: CashFlow[] = []
  const times = emiTimes(ctx, include)
  const lastT = times.length ? times[times.length - 1] : 0

  // t = 0 receipt
  let t0 = ctx.principal
  if (include.advance && ctx.advanceCount > 0) {
    if (ctx.advanceDeducted) t0 -= ctx.advanceCount * ctx.emi
    else flows.push({ t: 0, amount: -ctx.advanceCount * ctx.emi, label: 'advance-emi' })
  }
  const inEmiExtra: number[] = []
  for (const c of ctx.charges) {
    if (c.amount === null) continue
    const chargeOn = include.groups.has(c.group)
    // Additional GST is attributed to the GST group so it shows as its own step.
    const gst = include.groups.has('gst') ? c.gstAmount : 0
    const amount = chargeOn ? c.amount : 0
    if (amount + gst <= 0) continue
    if (c.payment === 'in-emi') {
      // Already inside an EMI the user entered; spread it only when we derived the EMI ourselves.
      if (ctx.emiDerived) inEmiExtra.push((amount + gst) / Math.max(1, times.length))
      continue
    }
    if (c.payment === 'deducted') t0 -= amount + gst
    else {
      if (amount > 0) flows.push({ t: 0, amount: -amount, label: c.group })
      if (gst > 0) flows.push({ t: 0, amount: -gst, label: 'gst' })
    }
  }
  if (include.unitemised && ctx.unitemisedDeduction > 0) t0 -= ctx.unitemisedDeduction

  if (
    include.documentedNet &&
    !ctx.netDerived &&
    include.advance &&
    include.unitemised &&
    include.groups.size === ALL_GROUPS.size
  ) {
    // Full calculation: the documented net amount wins over our reconstruction.
    // Separately paid items are already separate flows, so only the deducted part is replaced.
    t0 = ctx.netReceived
  }
  flows.unshift({ t: 0, amount: t0, label: 'net-received' })

  const extraPerEmi = inEmiExtra.reduce((a, b) => a + b, 0)
  for (const t of times) flows.push({ t, amount: -(ctx.emi + extraPerEmi), label: 'emi' })

  if (include.recurring) {
    const k = ctx.periodsPerYear
    for (const r of ctx.recurring) {
      if (r.amount === null || r.insideEnteredEmi) continue
      if (r.frequency === 'monthly') {
        const step = k / 12
        for (let t = step; t <= lastT + 1e-9; t += step) flows.push({ t, amount: -r.amount, label: 'recurring' })
      } else {
        const step = r.frequency === 'quarterly' ? k / 4 : k
        for (let t = step; t <= lastT + 1e-9; t += step) flows.push({ t, amount: -r.amount, label: 'recurring' })
      }
    }
  }
  return flows
}
