import { buildSchedule, type Schedule } from './amortization'
import {
  ALL_GROUPS,
  FULL_INCLUDE,
  buildFlows,
  missingCoreData,
  resolveLoan,
  type FlowInclude,
  type InsufficientReason,
  type LoanContext,
  type NormalizedCharge,
} from './cashflows'
import { flatRateLoan } from './flat'
import { impliedAnnualRate } from './implied-rate'
import { annualize, irr, type AnnualizedRate, type CashFlow } from './irr'
import { reconcileEmi, type Reconciliation } from './reconcile'
import type { ChargeGroup, ContingentCharge, EngineMessage, LoanInput } from './types'
import { valueOf } from './types'

export interface AttributionStep {
  /** Translation key for the step, e.g. "quoted", "method", "group:processing". */
  key: string
  /** Contribution in percentage points (for the first step: the starting rate). */
  deltaPp: number
  /** Running rate after this step, % p.a. */
  ratePct: number
  /** ₹ amount behind the step, when it is a charge. */
  amount?: number
}

export interface CostTotals {
  /** Sum of all EMIs (including advance EMIs). */
  emiTotal: number
  totalInterest: number
  /** All upfront charges (incl. additional GST and unitemised deductions). */
  upfrontCharges: number
  upfrontByGroup: Record<ChargeGroup | 'unitemised', number>
  gstTotal: number
  recurringTotal: number
  /** Everything the borrower pays out, after receiving the net amount. */
  totalRepayment: number
  /** Interest + all charges = total repayment − net received. */
  totalCost: number
  /** Total cost as % of the net amount received. */
  costPctOfNet: number
  /** Charges only (no interest). */
  totalCharges: number
}

export interface LoanAnalysis {
  status: 'ok' | 'insufficient'
  missing: InsufficientReason[]
  context: LoanContext | null
  sanctioned: number
  principal: number
  netReceived: number
  netDerived: boolean
  emi: number
  emiDerived: boolean
  quotedRatePct: number | null
  rateMethod: LoanInput['rateMethod']
  /** Rate implied by the EMI on the loan principal (reducing balance), % p.a. */
  impliedRatePct: number | null
  /** For flat-rate loans: the equivalent reducing-balance rate of the quoted flat rate. */
  flatEquivalentPct: number | null
  /** Headline: estimated effective annualized cost from all known cash flows. */
  effective: AnnualizedRate | null
  /** Effective (APR-style) − quoted, percentage points. */
  differencePp: number | null
  totals: CostTotals
  charges: NormalizedCharge[]
  contingent: ContingentCharge[]
  reconciliation: Reconciliation | null
  attribution: AttributionStep[]
  schedule: Schedule | null
  scheduleRatePct: number | null
  scheduleBasis: 'quoted' | 'implied' | 'flat-equivalent' | null
  flows: CashFlow[]
  warnings: EngineMessage[]
  assumptions: EngineMessage[]
  unknowns: EngineMessage[]
}

const EMPTY_GROUPS: Record<ChargeGroup | 'unitemised', number> = {
  processing: 0,
  gst: 0,
  insurance: 0,
  'documentation-legal': 0,
  intermediary: 0,
  'interest-like': 0,
  other: 0,
  unitemised: 0,
}

function emptyTotals(): CostTotals {
  return {
    emiTotal: 0,
    totalInterest: 0,
    upfrontCharges: 0,
    upfrontByGroup: { ...EMPTY_GROUPS },
    gstTotal: 0,
    recurringTotal: 0,
    totalRepayment: 0,
    totalCost: 0,
    costPctOfNet: 0,
    totalCharges: 0,
  }
}

function effectiveFrom(ctx: LoanContext, include: FlowInclude): AnnualizedRate | null {
  const r = irr(buildFlows(ctx, include))
  return r === null ? null : annualize(r, ctx.periodsPerYear)
}

/** Order in which charge groups are added in the "why is it different" explanation. */
export const ATTRIBUTION_GROUP_ORDER: ChargeGroup[] = [
  'processing',
  'gst',
  'insurance',
  'documentation-legal',
  'intermediary',
  'interest-like',
  'other',
]

export function analyzeLoan(input: LoanInput): LoanAnalysis {
  const missing = missingCoreData(input)
  if (missing.length > 0) {
    return {
      status: 'insufficient',
      missing,
      context: null,
      sanctioned: input.sanctionedAmount,
      principal: input.sanctionedAmount,
      netReceived: 0,
      netDerived: true,
      emi: 0,
      emiDerived: false,
      quotedRatePct: valueOf(input.quotedRatePct) ?? null,
      rateMethod: input.rateMethod,
      impliedRatePct: null,
      flatEquivalentPct: null,
      effective: null,
      differencePp: null,
      totals: emptyTotals(),
      charges: [],
      contingent: input.contingent,
      reconciliation: null,
      attribution: [],
      schedule: null,
      scheduleRatePct: null,
      scheduleBasis: null,
      flows: [],
      warnings: [],
      assumptions: [],
      unknowns: [],
    }
  }

  const ctx = resolveLoan(input)
  const k = ctx.periodsPerYear
  const warnings: EngineMessage[] = []
  const quoted = ctx.quotedRatePct

  // --- Reverse-rate check ----------------------------------------------------
  const timingOpts = { periodsPerYear: k }
  const impliedRatePct = impliedAnnualRate(ctx.principal, ctx.emi, ctx.n, timingOpts)
  const flatEquivalentPct =
    input.rateMethod === 'flat' && quoted !== null ? flatRateLoan(ctx.principal, quoted, ctx.n, k).reducingEquivalentPct : null

  let reconciliation: Reconciliation | null = null
  if (!ctx.emiDerived && quoted !== null) {
    reconciliation = reconcileEmi({
      principal: ctx.principal,
      quotedRatePct: quoted,
      emi: ctx.emi,
      n: ctx.n,
      method: input.rateMethod,
      periodsPerYear: k,
    })
    if (reconciliation.status === 'mismatch') {
      warnings.push({
        code: 'emi-mismatch',
        params: { entered: ctx.emi, expected: reconciliation.expectedEmi, difference: reconciliation.difference },
      })
    } else if (reconciliation.status === 'matches-flat') {
      warnings.push({ code: 'emi-matches-flat', params: { rate: quoted } })
    }
  }

  // --- Headline effective cost ------------------------------------------------
  const flows = buildFlows(ctx, FULL_INCLUDE)
  const periodic = irr(flows)
  const effective = periodic === null ? null : annualize(periodic, k)

  // --- Attribution ("why is the cost different?") -------------------------------
  const attribution: AttributionStep[] = []
  const baseInclude: FlowInclude = {
    actualTiming: false,
    advance: false,
    groups: new Set<ChargeGroup>(),
    unitemised: false,
    recurring: false,
    documentedNet: false,
  }
  const base = effectiveFrom(ctx, baseInclude)
  if (base) {
    // `recorded` is the rate after the last step shown, so the deltas always add up
    // exactly to the effective cost even when tiny steps are folded into the next one.
    let recorded: number
    const push = (key: string, ratePct: number, amount?: number) => {
      attribution.push({ key, deltaPp: ratePct - recorded, ratePct, amount })
      recorded = ratePct
    }
    if (quoted !== null) {
      attribution.push({ key: 'quoted', deltaPp: quoted, ratePct: quoted })
      recorded = quoted
      if (flatEquivalentPct !== null) push('method-flat', flatEquivalentPct)
      if (Math.abs(base.aprStylePct - recorded) >= 0.005) push('emi-difference', base.aprStylePct)
    } else {
      attribution.push({ key: 'implied', deltaPp: base.aprStylePct, ratePct: base.aprStylePct })
      recorded = base.aprStylePct
    }

    const include: FlowInclude = { ...baseInclude, groups: new Set<ChargeGroup>() }
    const step = (key: string, mutate: () => void, amount?: number) => {
      mutate()
      const next = effectiveFrom(ctx, include)
      if (!next) return
      if (Math.abs(next.aprStylePct - recorded) >= 0.005 || (amount !== undefined && amount > 0)) {
        push(key, next.aprStylePct, amount)
      }
    }

    if (ctx.advanceCount > 0) step('advance-emi', () => (include.advance = true), ctx.advanceCount * ctx.emi)
    step('timing', () => (include.actualTiming = true))
    for (const group of ATTRIBUTION_GROUP_ORDER) {
      const amount = groupAmount(ctx.charges, group)
      if (amount <= 0) continue
      step(`group:${group}`, () => (include.groups as Set<ChargeGroup>).add(group), amount)
    }
    for (const g of ALL_GROUPS) (include.groups as Set<ChargeGroup>).add(g)
    if (ctx.unitemisedDeduction > 0) step('unitemised', () => (include.unitemised = true), ctx.unitemisedDeduction)
    else include.unitemised = true
    const recurringTotal = recurringAmount(ctx)
    if (recurringTotal > 0) step('recurring', () => (include.recurring = true), recurringTotal)
    else include.recurring = true
    if (effective && Math.abs(effective.aprStylePct - recorded!) > 1e-9) {
      if (Math.abs(effective.aprStylePct - recorded!) >= 0.005 || attribution.length === 1) {
        push('net-difference', effective.aprStylePct)
      } else {
        // Fold a sub-0.005 pp residual into the last step so the explanation adds up exactly.
        const lastStep = attribution[attribution.length - 1]
        lastStep.deltaPp += effective.aprStylePct - recorded!
        lastStep.ratePct = effective.aprStylePct
      }
    }
  }

  // --- Totals --------------------------------------------------------------------
  const totals = emptyTotals()
  totals.emiTotal = ctx.emi * ctx.n
  let inEmiCharges = 0
  for (const c of ctx.charges) {
    if (c.amount === null) continue
    const group = c.group
    totals.upfrontByGroup[group] += c.amount
    totals.upfrontByGroup.gst += c.gstAmount
    totals.gstTotal += c.gstAmount + (c.category === 'gst' ? c.amount : 0)
    if (c.payment === 'in-emi') inEmiCharges += c.amount + c.gstAmount
  }
  totals.upfrontByGroup.unitemised = ctx.unitemisedDeduction
  totals.upfrontCharges = Object.values(totals.upfrontByGroup).reduce((a, b) => a + b, 0)
  totals.recurringTotal = recurringAmount(ctx)
  const outflows = flows.filter((f) => f.amount < 0).reduce((s, f) => s - f.amount, 0)
  const t0Receipt = flows.find((f) => f.label === 'net-received')?.amount ?? ctx.netReceived
  totals.totalRepayment = outflows
  totals.totalCost = outflows - t0Receipt
  totals.totalInterest = totals.emiTotal - ctx.principal - (ctx.emiDerived ? 0 : inEmiCharges)
  totals.totalCharges = totals.upfrontCharges + totals.recurringTotal
  totals.costPctOfNet = t0Receipt > 0 ? (totals.totalCost / t0Receipt) * 100 : 0

  // --- Schedule ------------------------------------------------------------------
  let scheduleRatePct: number | null = null
  let scheduleBasis: LoanAnalysis['scheduleBasis'] = null
  if (ctx.emiDerived) {
    if (flatEquivalentPct !== null) {
      scheduleRatePct = flatEquivalentPct
      scheduleBasis = 'flat-equivalent'
    } else {
      scheduleRatePct = quoted ?? 0
      scheduleBasis = 'quoted'
    }
  } else if (reconciliation?.status === 'match' && input.rateMethod !== 'flat' && quoted !== null) {
    scheduleRatePct = quoted
    scheduleBasis = 'quoted'
  } else if (impliedRatePct !== null) {
    scheduleRatePct = impliedRatePct
    scheduleBasis = 'implied'
  }
  const schedule =
    scheduleRatePct === null
      ? null
      : buildSchedule({
          principal: ctx.principal,
          annualRatePct: scheduleRatePct,
          periods: ctx.n,
          periodsPerYear: k,
          emi: ctx.emiDerived && scheduleBasis === 'quoted' ? undefined : ctx.emi,
        })

  // --- Warnings ------------------------------------------------------------------
  const disbursed = valueOf(input.disbursedAmount)
  if (disbursed !== undefined && disbursed > 0 && disbursed < input.sanctionedAmount - 1) {
    warnings.push({ code: 'disbursed-below-sanctioned', params: { disbursed, sanctioned: input.sanctionedAmount } })
  }
  if (ctx.unitemisedDeduction > 0) warnings.push({ code: 'unitemised-deduction', params: { amount: ctx.unitemisedDeduction } })
  if (ctx.receivedAboveExpected > 0) warnings.push({ code: 'received-above-expected', params: { amount: ctx.receivedAboveExpected } })
  if (ctx.emi * ctx.n < ctx.principal - 1) warnings.push({ code: 'emi-total-below-principal' })
  if (schedule?.negativeAmortization) warnings.push({ code: 'negative-amortization' })
  if (ctx.irregularFirstEmi) warnings.push({ code: 'irregular-first-emi', params: { periods: round2(ctx.firstEmiOffset) } })
  if (input.documents.kfs) {
    for (const c of ctx.charges) {
      if (c.inKfs === 'no') warnings.push({ code: 'charge-not-in-kfs', params: { name: c.name } })
    }
  }
  for (const c of ctx.charges) {
    if (c.group === 'insurance' && c.mandatory === 'unknown') {
      warnings.push({ code: 'insurance-mandatory-unknown', params: { name: c.name } })
    }
  }
  const differencePp = effective && quoted !== null ? effective.aprStylePct - quoted : null
  if (differencePp !== null && differencePp < -0.05) warnings.push({ code: 'effective-below-quoted' })

  return {
    status: 'ok',
    missing: [],
    context: ctx,
    sanctioned: input.sanctionedAmount,
    principal: ctx.principal,
    netReceived: t0Receipt,
    netDerived: ctx.netDerived,
    emi: ctx.emi,
    emiDerived: ctx.emiDerived,
    quotedRatePct: quoted,
    rateMethod: input.rateMethod,
    impliedRatePct,
    flatEquivalentPct,
    effective,
    differencePp,
    totals,
    charges: ctx.charges,
    contingent: input.contingent,
    reconciliation,
    attribution,
    schedule,
    scheduleRatePct,
    scheduleBasis,
    flows,
    warnings,
    assumptions: ctx.assumptions,
    unknowns: ctx.unknowns,
  }
}

function groupAmount(charges: NormalizedCharge[], group: ChargeGroup): number {
  let sum = 0
  for (const c of charges) {
    if (c.amount === null) continue
    if (c.group === group) sum += c.amount
    if (group === 'gst') sum += c.gstAmount
  }
  return sum
}

function recurringAmount(ctx: LoanContext): number {
  const flows = buildFlows(ctx, { ...FULL_INCLUDE })
  return flows.filter((f) => f.label === 'recurring').reduce((s, f) => s - f.amount, 0)
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}
