import { describe, expect, it } from 'vitest'
import { analyzeLoan } from '../analyze'
import { emptyLoanInput } from '../report'
import { known, unknown, type LoanInput } from '../types'
import { charge, homeExample, rbiKfsExample } from './fixtures'

function base(partial: Partial<LoanInput>): LoanInput {
  return { ...emptyLoanInput(), rateType: 'fixed', rateMethod: 'reducing', allChargesListed: 'yes', ...partial }
}

describe('analyzeLoan — RBI KFS illustration', () => {
  const a = analyzeLoan(rbiKfsExample())
  it('reproduces the 17.07% APR', () => {
    expect(a.status).toBe('ok')
    expect(a.effective!.aprStylePct).toBeCloseTo(17.07, 2)
  })
  it('reports net received, totals and a reconciled EMI', () => {
    expect(a.netReceived).toBe(19_600)
    expect(a.netDerived).toBe(false)
    expect(a.reconciliation!.status).toBe('match')
    expect(a.totals.upfrontCharges).toBe(400)
    expect(a.totals.totalInterest).toBeCloseTo(3_273.52, 1)
    // total cost = interest + fees
    expect(a.totals.totalCost).toBeCloseTo(3_273.52 + 400, 1)
  })
  it('attribution steps add up from quoted to effective', () => {
    const last = a.attribution[a.attribution.length - 1]
    expect(a.attribution[0]).toMatchObject({ key: 'quoted', ratePct: 15 })
    expect(last.ratePct).toBeCloseTo(a.effective!.aprStylePct, 6)
    const sum = a.attribution.reduce((s, x) => s + x.deltaPp, 0)
    expect(sum).toBeCloseTo(a.effective!.aprStylePct, 6)
  })
})

describe('analyzeLoan — home page illustration', () => {
  const a = analyzeLoan(homeExample())
  it('₹5,00,000 sanctioned, ₹4,80,000 received, ≈ ₹6.2 lakh repaid, ≈ 14.39%', () => {
    expect(a.netReceived).toBe(4_80_000)
    expect(a.netDerived).toBe(true)
    expect(a.emiDerived).toBe(true)
    expect(a.emi).toBeCloseTo(14_102.2, 1)
    expect(a.totals.totalRepayment).toBeCloseTo(6_20_497, 0)
    // Independent Python check: 14.3875%
    expect(a.effective!.aprStylePct).toBeCloseTo(14.3875, 3)
    expect(a.differencePp!).toBeCloseTo(2.3875, 3)
  })
  it('never treats unknown values as zero: net received is flagged as derived', () => {
    expect(a.unknowns.map((u) => u.code)).toContain('net-received')
  })
})

describe('zero-interest loans', () => {
  it('0% with no fees costs 0%', () => {
    const a = analyzeLoan(base({ sanctionedAmount: 12_000, tenurePeriods: 12, quotedRatePct: known(0) }))
    expect(a.emi).toBe(1_000)
    expect(a.effective!.aprStylePct).toBeCloseTo(0, 6)
    expect(a.totals.totalInterest).toBeCloseTo(0, 6)
  })
  it('"0% EMI" with a ₹500 processing fee is not free (≈ 7.93%)', () => {
    const a = analyzeLoan(
      base({
        loanType: 'electronics-emi',
        sanctionedAmount: 12_000,
        tenurePeriods: 12,
        quotedRatePct: known(0),
        emi: known(1_000),
        charges: [charge({ category: 'processing', amount: known(500) })],
      }),
    )
    expect(a.effective!.aprStylePct).toBeCloseTo(7.931, 2)
    expect(a.totals.totalCost).toBeCloseTo(500, 6)
  })
})

describe('fee handling', () => {
  const fee = (payment: 'deducted' | 'separate' | 'unknown') =>
    analyzeLoan(
      base({
        sanctionedAmount: 2_00_000,
        tenurePeriods: 24,
        quotedRatePct: known(11),
        charges: [charge({ category: 'processing', amount: known(4_000), payment })],
      }),
    )
  it('deducted and separately-paid fees give the same effective cost (same timing)', () => {
    const d = fee('deducted')
    const s = fee('separate')
    expect(d.effective!.aprStylePct).toBeCloseTo(s.effective!.aprStylePct, 8)
    expect(d.netReceived).toBe(1_96_000)
    expect(s.netReceived).toBe(2_00_000)
    expect(d.totals.totalCost).toBeCloseTo(s.totals.totalCost, 6)
  })
  it('unknown payment mode is assumed deducted and the assumption is reported', () => {
    const u = fee('unknown')
    expect(u.assumptions.map((x) => x.code)).toContain('payment-assumed-deducted')
    expect(u.effective!.aprStylePct).toBeCloseTo(fee('deducted').effective!.aprStylePct, 8)
  })
  it('additional GST is added and shown in its own group', () => {
    const a = analyzeLoan(
      base({
        sanctionedAmount: 2_00_000,
        tenurePeriods: 24,
        quotedRatePct: known(11),
        charges: [charge({ category: 'processing', amount: known(4_000), gst: 'additional', gstAmount: known(720) })],
      }),
    )
    expect(a.totals.upfrontByGroup.gst).toBe(720)
    expect(a.netReceived).toBe(2_00_000 - 4_720)
    expect(a.attribution.map((s) => s.key)).toEqual(expect.arrayContaining(['group:processing', 'group:gst']))
  })
  it('an unknown charge amount is never counted as ₹0 silently', () => {
    const a = analyzeLoan(
      base({
        sanctionedAmount: 3_00_000,
        tenurePeriods: 36,
        quotedRatePct: known(12),
        charges: [charge({ category: 'legal', name: 'Legal fee', amount: unknown })],
      }),
    )
    expect(a.unknowns).toContainEqual({ code: 'charge-amount', params: { name: 'Legal fee' } })
  })
  it('flags deductions nobody itemised', () => {
    const a = analyzeLoan(
      base({
        sanctionedAmount: 5_00_000,
        netReceived: known(4_75_000),
        tenurePeriods: 36,
        quotedRatePct: known(12),
        charges: [charge({ category: 'processing', amount: known(10_000) })],
      }),
    )
    expect(a.totals.upfrontByGroup.unitemised).toBe(15_000)
    expect(a.warnings.map((w) => w.code)).toContain('unitemised-deduction')
    expect(a.attribution.map((s) => s.key)).toContain('unitemised')
  })
  it('insurance inside an entered EMI is not double counted', () => {
    const emi = 16_607.15 + 250
    const a = analyzeLoan(
      base({
        sanctionedAmount: 5_00_000,
        tenurePeriods: 36,
        quotedRatePct: known(12),
        emi: known(emi),
        charges: [charge({ category: 'insurance', amount: known(9_000), payment: 'in-emi' })],
      }),
    )
    // Cash flows = EMIs only (insurance already inside).
    expect(a.flows.filter((f) => f.amount < 0).length).toBe(36)
    expect(a.totals.totalInterest).toBeCloseTo(emi * 36 - 5_00_000 - 9_000, 0)
  })
})

describe('flat-rate loans', () => {
  it('explains the method effect and matches the flat EMI', () => {
    const a = analyzeLoan(
      base({ loanType: 'two-wheeler', sanctionedAmount: 1_00_000, tenurePeriods: 36, quotedRatePct: known(10), rateMethod: 'flat', emi: known(3_611.11) }),
    )
    expect(a.reconciliation!.status).toBe('match')
    expect(a.flatEquivalentPct!).toBeCloseTo(17.9177, 3)
    expect(a.effective!.aprStylePct).toBeCloseTo(17.9177, 2)
    expect(a.attribution[1].key).toBe('method-flat')
    expect(a.scheduleBasis).toBe('implied')
  })
})

describe('EMI mismatch', () => {
  it('warns without calling it wrongdoing', () => {
    const a = analyzeLoan(base({ sanctionedAmount: 5_00_000, tenurePeriods: 36, quotedRatePct: known(12), emi: known(17_200) }))
    expect(a.reconciliation!.status).toBe('mismatch')
    const w = a.warnings.find((x) => x.code === 'emi-mismatch')!
    expect(w.params!.expected).toBeCloseTo(16_607.15, 1)
    expect(a.attribution.map((s) => s.key)).toContain('emi-difference')
  })
})

describe('timing', () => {
  it('advance EMIs raise the effective cost', () => {
    const regular = analyzeLoan(base({ loanType: 'car', sanctionedAmount: 5_00_000, tenurePeriods: 60, quotedRatePct: known(9), emi: known(10_379.18) }))
    const advance = analyzeLoan(
      base({ loanType: 'car', sanctionedAmount: 5_00_000, tenurePeriods: 60, quotedRatePct: known(9), emi: known(10_379.18), advanceEmiCount: 2 }),
    )
    expect(advance.effective!.aprStylePct).toBeGreaterThan(regular.effective!.aprStylePct)
    expect(advance.netReceived).toBeCloseTo(5_00_000 - 2 * 10_379.18, 2)
    expect(advance.attribution.map((s) => s.key)).toContain('advance-emi')
  })
  it('an irregular first EMI date is used (XIRR-style timing)', () => {
    const a = analyzeLoan(
      base({
        sanctionedAmount: 2_00_000,
        tenurePeriods: 24,
        quotedRatePct: known(12),
        disbursementDate: '2026-02-10',
        firstEmiDate: '2026-04-05',
      }),
    )
    expect(a.context!.irregularFirstEmi).toBe(true)
    expect(a.warnings.map((w) => w.code)).toContain('irregular-first-emi')
    // A later first EMI lowers the IRR slightly vs. the quoted rate.
    expect(a.effective!.aprStylePct).toBeLessThan(12)
  })
  it('recurring annual fees are included; contingent charges are not', () => {
    const withFee = analyzeLoan(
      base({
        sanctionedAmount: 3_00_000,
        tenurePeriods: 36,
        quotedRatePct: known(12),
        recurring: [{ id: 'r', name: 'Annual fee', amount: known(1_000), frequency: 'annual', payment: 'separate' }],
        contingent: [{ id: 'x', kind: 'bounce', name: 'Bounce charge', amount: known(500) }],
      }),
    )
    expect(withFee.totals.recurringTotal).toBe(3_000)
    expect(withFee.effective!.aprStylePct).toBeGreaterThan(12)
    expect(withFee.flows.some((f) => f.label === 'recurring')).toBe(true)
    expect(withFee.contingent).toHaveLength(1)
    expect(withFee.totals.totalCost).toBeCloseTo(withFee.totals.totalInterest + 3_000, 4)
  })
})

describe('insufficient data', () => {
  it('asks for the missing core facts instead of guessing', () => {
    const a = analyzeLoan({ ...emptyLoanInput(), sanctionedAmount: 1_00_000 })
    expect(a.status).toBe('insufficient')
    expect(a.missing).toEqual(['tenure', 'emi-or-rate'])
  })
  it('works with EMI only (no quoted rate)', () => {
    const a = analyzeLoan(base({ sanctionedAmount: 1_00_000, tenurePeriods: 12, emi: known(9_000) }))
    expect(a.status).toBe('ok')
    expect(a.attribution[0].key).toBe('implied')
    expect(a.unknowns.map((u) => u.code)).toContain('quoted-rate')
  })
  it('effective below quoted is explained, not forced negative', () => {
    const a = analyzeLoan(base({ sanctionedAmount: 1_00_000, tenurePeriods: 12, quotedRatePct: known(14), emi: known(8_700) }))
    expect(a.warnings.map((w) => w.code)).toContain('effective-below-quoted')
  })
})
