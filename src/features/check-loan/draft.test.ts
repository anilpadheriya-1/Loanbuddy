import { describe, expect, it } from 'vitest'
import { analyzeLoan } from '@/lib/finance'
import { createDraft, draftToInput, emptyNum, exampleDraft, LoanDraftSchema, newCharge, num, tenurePeriods } from './draft'
import { validateStep } from './validation'

describe('draft → engine input', () => {
  it('empty fields and "I don\'t know" become unknown, never zero', () => {
    const d = { ...createDraft(), sanctionedAmount: num(100000), netReceived: { value: null, unknown: true } }
    const input = draftToInput(d)
    expect(input.netReceived).toEqual({ kind: 'unknown' })
    expect(input.quotedRatePct).toEqual({ kind: 'unknown' })
    expect(input.emi).toEqual({ kind: 'unknown' })
  })
  it('converts % of loan charges into rupees', () => {
    const c = { ...newCharge('processing', 'PF'), amountMode: 'percent' as const, amount: num(2) }
    const input = draftToInput({ ...createDraft(), sanctionedAmount: num(300000), charges: [c] })
    expect(input.charges[0].amount).toEqual({ kind: 'known', value: 6000, source: 'document' })
  })
  it('tenure units', () => {
    const d = createDraft()
    expect(tenurePeriods({ ...d, tenureValue: num(3), tenureUnit: 'years' })).toBe(36)
    expect(tenurePeriods({ ...d, tenureValue: num(44), tenureUnit: 'emis' })).toBe(44)
    expect(tenurePeriods({ ...d, tenureValue: num(24), tenureUnit: 'months', frequency: 'quarterly' })).toBe(8)
    expect(tenurePeriods({ ...d, tenureValue: emptyNum() })).toBe(0)
  })
  it('the illustrative example reconciles: ₹5,00,000 − ₹20,000 = ₹4,80,000', () => {
    const a = analyzeLoan(draftToInput(exampleDraft()))
    expect(a.netReceived).toBe(480000)
    expect(a.totals.upfrontCharges).toBe(20000)
    expect(a.effective!.aprStylePct).toBeCloseTo(14.39, 2)
  })
  it('drafts survive a JSON round trip through the storage schema', () => {
    const d = exampleDraft()
    expect(LoanDraftSchema.safeParse(JSON.parse(JSON.stringify(d))).success).toBe(true)
    expect(LoanDraftSchema.safeParse({ version: 2 }).success).toBe(false)
  })
})

describe('validation', () => {
  it('requires amount and tenure on step 1 only', () => {
    const e = validateStep('loan', createDraft())
    expect(e.sanctionedAmount).toBe('error.required')
    expect(e.tenureValue).toBe('error.required')
    expect(validateStep('charges', createDraft())).toEqual({})
  })
  it('flags received > loan and out-of-range rates', () => {
    const d = { ...createDraft(), sanctionedAmount: num(100000), tenureValue: num(12), netReceived: num(120000), quotedRate: num(80) }
    expect(validateStep('loan', d).netReceived).toBe('error.netAboveLoan')
    expect(validateStep('interest', d).quotedRate).toBe('error.rateRange')
  })
})
