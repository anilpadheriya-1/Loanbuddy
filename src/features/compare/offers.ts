import { z } from 'zod/mini'
import { createDraft, draftToInput, newCharge, num, NumFieldSchema, type LoanDraft } from '@/features/check-loan/draft'
import { uid } from '@/lib/utils'

/** A quick offer entered on the Compare page (fewer fields than the full wizard). */
export const QuickOfferSchema = z.object({
  id: z.string(),
  kind: z.enum(['quick', 'saved']),
  savedId: z.string(),
  label: z.string(),
  amount: NumFieldSchema,
  rate: NumFieldSchema,
  method: z.enum(['reducing', 'flat']),
  rateType: z.enum(['fixed', 'floating', 'unknown']),
  months: NumFieldSchema,
  emi: NumFieldSchema,
  processing: NumFieldSchema,
  insurance: NumFieldSchema,
  other: NumFieldSchema,
  foreclosurePct: NumFieldSchema,
})
export type QuickOffer = z.infer<typeof QuickOfferSchema>

export function newOffer(label: string, partial: Partial<QuickOffer> = {}): QuickOffer {
  return {
    id: uid('offer'),
    kind: 'quick',
    savedId: '',
    label,
    amount: num(5_00_000),
    rate: num(12),
    method: 'reducing',
    rateType: 'fixed',
    months: num(36),
    emi: { value: null, unknown: false },
    processing: num(0),
    insurance: num(0),
    other: num(0),
    foreclosurePct: { value: null, unknown: false },
    ...partial,
  }
}

/** Build a wizard draft from a quick offer so the same engine and scoring apply. */
export function offerToDraft(o: QuickOffer): LoanDraft {
  const d = createDraft()
  const charges = [
    { ...newCharge('processing', 'Processing fee'), amount: o.processing, gst: 'included' as const, mandatory: 'yes' as const },
    { ...newCharge('insurance', 'Insurance'), amount: o.insurance, gst: 'included' as const },
    { ...newCharge('other', 'Other charges'), amount: o.other, gst: 'included' as const },
  ].filter((c) => c.amount.unknown || (c.amount.value ?? 0) > 0)
  return {
    ...d,
    id: o.id,
    label: o.label,
    sanctionedAmount: o.amount,
    tenureValue: o.months,
    tenureUnit: 'months',
    quotedRate: o.rate,
    rateMethod: o.method,
    rateType: o.rateType,
    emi: o.emi,
    charges,
    allChargesListed: 'yes',
    prepayment: { ...d.prepayment, foreclosure: { mode: 'percent', value: o.foreclosurePct } },
  }
}

export function offerInput(o: QuickOffer) {
  return draftToInput(offerToDraft(o))
}
