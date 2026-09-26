import type { TKey } from '@/lib/i18n'
import { chargeRupees, chargeBase, tenurePeriods, type ChargeDraft, type LoanDraft } from '@/features/check-loan/draft'

/**
 * The details a borrower should get from the lender (most are in the KFS).
 * `received` decides the status chip automatically from what the user filled in.
 */
export type RequestGroup = 'money' | 'charges' | 'prepayment' | 'documents'

export interface RequestItem {
  id: string
  group: RequestGroup
  /** Short label shown in the checklist. */
  label: TKey
  /** Why it matters for the real cost. */
  why: TKey
  /** Where it is usually found. */
  where: TKey
  /** The line used in the request message. */
  ask: TKey
  received: (d: LoanDraft) => boolean
}

const hasNum = (f: { value: number | null; unknown: boolean } | undefined) => !!f && !f.unknown && f.value !== null
export const findCharge = (d: LoanDraft, category: ChargeDraft['category']) => d.charges.find((c) => c.category === category)
const chargeKnown = (d: LoanDraft, category: ChargeDraft['category']) => {
  const c = findCharge(d, category)
  return !!c && chargeRupees(c, chargeBase(d)) !== null
}

export const REQUEST_ITEMS: RequestItem[] = [
  { id: 'kfs', group: 'documents', label: 'ask.item.kfs', why: 'ask.why.kfs', where: 'ask.where.kfs', ask: 'ask.line.kfs', received: (d) => d.documents.kfs },
  {
    id: 'sanctioned',
    group: 'money',
    label: 'ask.item.sanctioned',
    why: 'ask.why.sanctioned',
    where: 'ask.where.kfs',
    ask: 'ask.line.sanctioned',
    received: (d) => hasNum(d.sanctionedAmount),
  },
  { id: 'net', group: 'money', label: 'ask.item.net', why: 'ask.why.net', where: 'ask.where.kfsNet', ask: 'ask.line.net', received: (d) => hasNum(d.netReceived) },
  {
    id: 'rate',
    group: 'money',
    label: 'ask.item.rate',
    why: 'ask.why.rate',
    where: 'ask.where.kfs',
    ask: 'ask.line.rate',
    received: (d) => hasNum(d.quotedRate) && d.rateMethod !== 'unknown' && d.rateType !== 'unknown',
  },
  {
    id: 'emi',
    group: 'money',
    label: 'ask.item.emi',
    why: 'ask.why.emi',
    where: 'ask.where.kfs',
    ask: 'ask.line.emi',
    received: (d) => hasNum(d.emi) && tenurePeriods(d) > 0,
  },
  { id: 'apr', group: 'money', label: 'ask.item.apr', why: 'ask.why.apr', where: 'ask.where.kfs', ask: 'ask.line.apr', received: (d) => hasNum(d.lenderApr) },
  {
    id: 'processing',
    group: 'charges',
    label: 'ask.item.processing',
    why: 'ask.why.processing',
    where: 'ask.where.kfsCharges',
    ask: 'ask.line.processing',
    received: (d) => chargeKnown(d, 'processing'),
  },
  {
    id: 'insurance',
    group: 'charges',
    label: 'ask.item.insurance',
    why: 'ask.why.insurance',
    where: 'ask.where.kfsCharges',
    ask: 'ask.line.insurance',
    received: (d) => chargeKnown(d, 'insurance') && findCharge(d, 'insurance')!.mandatory !== 'unknown',
  },
  {
    id: 'other',
    group: 'charges',
    label: 'ask.item.other',
    why: 'ask.why.other',
    where: 'ask.where.kfsCharges',
    ask: 'ask.line.other',
    received: (d) => chargeKnown(d, 'other') || d.allChargesListed === 'yes',
  },
  {
    id: 'penal',
    group: 'charges',
    label: 'ask.item.penal',
    why: 'ask.why.penal',
    where: 'ask.where.kfs',
    ask: 'ask.line.penal',
    received: (d) => d.contingent.some((c) => hasNum(c.amount)),
  },
  {
    id: 'prepayment',
    group: 'prepayment',
    label: 'ask.item.prepayment',
    why: 'ask.why.prepayment',
    where: 'ask.where.kfsAgreement',
    ask: 'ask.line.prepayment',
    received: (d) => d.prepayment.partAllowed !== 'unknown' && hasNum(d.prepayment.partCharge.value),
  },
  {
    id: 'foreclosure',
    group: 'prepayment',
    label: 'ask.item.foreclosure',
    why: 'ask.why.foreclosure',
    where: 'ask.where.kfsAgreement',
    ask: 'ask.line.foreclosure',
    received: (d) => hasNum(d.prepayment.foreclosure.value) && hasNum(d.prepayment.lockInMonths),
  },
  {
    id: 'schedule',
    group: 'documents',
    label: 'ask.item.schedule',
    why: 'ask.why.schedule',
    where: 'ask.where.schedule',
    ask: 'ask.line.schedule',
    received: (d) => d.documents.amortizationSchedule,
  },
  {
    id: 'grievance',
    group: 'documents',
    label: 'ask.item.grievance',
    why: 'ask.why.grievance',
    where: 'ask.where.kfs',
    ask: 'ask.line.grievance',
    received: (d) => (d.requests?.received ?? []).includes('grievance'),
  },
]

export type ItemStatus = 'received' | 'refused' | 'asked' | 'todo'

export function itemStatus(d: LoanDraft, item: RequestItem): ItemStatus {
  if (item.received(d)) return 'received'
  if (d.requests?.refused.includes(item.id)) return 'refused'
  if (d.requests?.asked.includes(item.id)) return 'asked'
  return 'todo'
}

export const GROUP_ORDER: RequestGroup[] = ['money', 'charges', 'prepayment', 'documents']
