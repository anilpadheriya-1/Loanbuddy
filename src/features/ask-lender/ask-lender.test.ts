import { describe, expect, it } from 'vitest'
import { analyzeLoan } from '@/lib/finance'
import { createDraft, draftToInput, emptyNum, LoanDraftSchema, num, type LoanDraft } from '@/features/check-loan/draft'
import { findCharge, itemStatus, REQUEST_ITEMS } from './items'
import { buildLetter } from './letter'
import { emiCountField, markManyAsked, penalField, setCharge, setEmiCount, setPenal, toggleRequest } from './mapping'

const item = (id: string) => REQUEST_ITEMS.find((i) => i.id === id)!

describe('Ask Your Lender: form → shared loan draft', () => {
  it('creates, updates and removes a charge by category', () => {
    let d = setCharge(createDraft(), 'processing', 'Processing fee', { amount: num(12000) })
    expect(findCharge(d, 'processing')!.amount.value).toBe(12000)
    d = setCharge(d, 'processing', 'Processing fee', { gst: 'included' })
    expect(d.charges).toHaveLength(1)
    expect(findCharge(d, 'processing')!.gst).toBe('included')
    d = setCharge(d, 'processing', 'Processing fee', { amount: emptyNum() })
    expect(d.charges).toHaveLength(0)
    // Clearing a charge that doesn't exist is a no-op; no empty (unknown-amount) charge is created.
    expect(setCharge(createDraft(), 'insurance', 'Insurance', { amount: emptyNum() }).charges).toHaveLength(0)
  })

  it('number of EMIs reads any tenure unit and writes as EMIs', () => {
    const years = { ...createDraft(), tenureValue: num(3), tenureUnit: 'years' as const }
    expect(emiCountField(years).value).toBe(36)
    const d = setEmiCount(years, num(44))
    expect(d.tenureUnit).toBe('emis')
    expect(emiCountField(d).value).toBe(44)
  })

  it('penal / bounce charge is stored as a conditional (never base-cost) charge', () => {
    let d = setPenal(createDraft(), num(500), 'Bounce charge')
    expect(penalField(d).value).toBe(500)
    expect(d.contingent[0].kind).toBe('bounce')
    d = setPenal(d, emptyNum(), 'Bounce charge')
    expect(d.contingent).toHaveLength(0)
  })

  it('tracks asked / not shared / received, with asked and not-shared mutually exclusive', () => {
    let d = markManyAsked(createDraft(), ['foreclosure', 'prepayment'])
    expect(itemStatus(d, item('foreclosure'))).toBe('asked')
    d = toggleRequest(d, 'refused', 'foreclosure', true)
    expect(itemStatus(d, item('foreclosure'))).toBe('refused')
    expect(d.requests!.asked).not.toContain('foreclosure')
    d = { ...d, prepayment: { ...d.prepayment, foreclosure: { mode: 'percent', value: num(0) }, lockInMonths: num(0) } }
    expect(itemStatus(d, item('foreclosure'))).toBe('received')
    expect(itemStatus(d, item('kfs'))).toBe('todo')
  })

  it('filled details produce the real ROI through the same engine', () => {
    let d: LoanDraft = { ...createDraft(), sanctionedAmount: num(500000), quotedRate: num(12), rateMethod: 'reducing' }
    d = setEmiCount(d, num(44))
    d = setCharge(d, 'processing', 'Processing fee', { amount: num(12000), gst: 'included' })
    d = setCharge(d, 'insurance', 'Insurance', { amount: num(8000), gst: 'included' })
    const a = analyzeLoan(draftToInput(d))
    expect(a.effective!.aprStylePct).toBeCloseTo(14.39, 2)
  })
})

describe('request message', () => {
  it('lists only what is missing, in English or Hindi', () => {
    const d = { ...createDraft(), lenderName: 'ABC Finance', sanctionedAmount: num(300000), documents: { ...createDraft().documents, kfs: true } }
    const missing = REQUEST_ITEMS.filter((it) => itemStatus(d, it) !== 'received')
    expect(missing.map((i) => i.id)).not.toContain('kfs')
    expect(missing.map((i) => i.id)).not.toContain('sanctioned')
    const en = buildLetter(d, missing, 'en')
    expect(en.body).toContain('personal loan from ABC Finance')
    expect(en.body).toContain('Foreclosure (full prepayment) charges')
    expect(en.body.split('\n').filter((l) => /^\d+\. /.test(l))).toHaveLength(missing.length)
    expect(en.body).not.toMatch(/\{\w+\}/)
  })
})

describe('saved drafts from before this page', () => {
  it('still load (new fields are optional)', () => {
    const { lenderApr: _a, requests: _r, ...old } = createDraft()
    expect(LoanDraftSchema.safeParse(JSON.parse(JSON.stringify(old))).success).toBe(true)
  })
})
