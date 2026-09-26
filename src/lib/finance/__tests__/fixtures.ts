import { emptyLoanInput } from '../report'
import { known, type LoanInput, type UpfrontCharge } from '../types'

let seq = 0
export function charge(partial: Partial<UpfrontCharge> & Pick<UpfrontCharge, 'category'>): UpfrontCharge {
  return {
    id: `c${++seq}`,
    name: partial.name ?? partial.category,
    amount: known(0),
    payment: 'deducted',
    gst: 'included',
    mandatory: 'yes',
    recipient: 'lender',
    inKfs: 'yes',
    ...partial,
  }
}

/** RBI KFS illustration (circular of 15 Apr 2024, Annex B): APR 17.07%. */
export function rbiKfsExample(): LoanInput {
  return {
    ...emptyLoanInput(),
    loanType: 'personal',
    lenderCategory: 'bank',
    sanctionedAmount: 20_000,
    netReceived: known(19_600),
    tenurePeriods: 24,
    quotedRatePct: known(15),
    rateType: 'fixed',
    rateMethod: 'reducing',
    emi: known(969.73),
    charges: [
      charge({ category: 'processing', name: 'Payable to lender', amount: known(240) }),
      charge({ category: 'insurance', name: 'Third-party charges', amount: known(160), recipient: 'insurer', mandatory: 'no' }),
    ],
    allChargesListed: 'yes',
    documents: { kfs: true, sanctionLetter: true, loanAgreement: true, amortizationSchedule: true, statement: false, foreclosureLetter: false },
    valuesSource: 'documents',
  }
}

/** Home-page illustration: ₹5,00,000 sanctioned, ₹20,000 deducted, 12% reducing, 44 EMIs. */
export function homeExample(): LoanInput {
  return {
    ...emptyLoanInput(),
    loanType: 'personal',
    sanctionedAmount: 5_00_000,
    tenurePeriods: 44,
    quotedRatePct: known(12),
    rateType: 'fixed',
    rateMethod: 'reducing',
    charges: [
      charge({ category: 'processing', name: 'Processing fee', amount: known(12_000) }),
      charge({ category: 'insurance', name: 'Loan protection insurance', amount: known(8_000), recipient: 'insurer', mandatory: 'unknown' }),
    ],
    allChargesListed: 'yes',
  }
}
