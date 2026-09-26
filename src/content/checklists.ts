/** Checklists for the Documents and "Something doesn't look right?" pages. */

export interface ChecklistItem {
  id: string
  label: string
  help: string
}

export const KFS_CHECKLIST: ChecklistItem[] = [
  { id: 'kfs-exists', label: 'Did you receive a Key Facts Statement (KFS)?', help: 'RBI-regulated lenders must give a KFS for retail and MSME term loans before you sign.' },
  { id: 'apr', label: 'Does the KFS show the Annual Percentage Rate (APR)?', help: 'APR is the annual cost including interest and charges. Compare it with the headline rate.' },
  { id: 'schedule', label: 'Does it include a repayment (amortization) schedule?', help: 'The schedule shows every EMI split into principal and interest.' },
  { id: 'fees', label: 'Are all fees listed with amounts?', help: 'Processing, documentation, legal, valuation, stamp duty, etc.' },
  { id: 'third-party', label: 'Are insurance and other third-party charges shown separately?', help: 'Charges collected for insurers or other providers should be disclosed.' },
  { id: 'net', label: 'Does it show the net disbursed amount?', help: 'Loan amount minus upfront charges = what you actually receive.' },
  { id: 'emi-match', label: 'Does your EMI match the KFS?', help: 'Use Check My Loan to see whether the EMI reconciles with the rate.' },
  { id: 'schedule-match', label: 'Does your statement match the KFS schedule?', help: 'Compare outstanding balance and interest with the schedule.' },
  { id: 'labelled', label: 'Is every charge clearly named?', help: 'Vague items like “other charges” deserve a question.' },
  { id: 'optional', label: 'Are optional products (like insurance) clearly marked optional?', help: 'Ask whether you can decline or buy elsewhere.' },
  { id: 'agreement-match', label: 'Does the loan agreement match the KFS?', help: 'Rate, tenure, EMI, charges and prepayment terms should be the same.' },
]

export const GRIEVANCE_CHECKLIST: ChecklistItem[] = [
  { id: 'regulated', label: 'Is the lender RBI-regulated?', help: 'Banks, NBFCs and HFCs are regulated. For app-based loans, check who the actual lender is (not just the app).' },
  { id: 'name-match', label: 'Does the lender’s name in the agreement match who you dealt with?', help: 'Loan apps and agents (LSPs/DSAs) must disclose the regulated lender.' },
  { id: 'kfs', label: 'Did you get a KFS?', help: 'If not, ask for it in writing.' },
  { id: 'apr', label: 'Does the KFS contain the APR?', help: 'APR should include all charges levied by the lender and those collected for third parties.' },
  { id: 'agreement', label: 'Do you have the loan agreement?', help: 'You are entitled to a copy of the agreement and sanction letter.' },
  { id: 'fees', label: 'Are all upfront fees listed?', help: 'Compare deductions from your disbursement with the KFS.' },
  { id: 'insurance', label: 'Are insurance charges identified?', help: 'Is it mandatory? Who is the insurer? Is there a policy document?' },
  { id: 'net', label: 'Is the net disbursement correct?', help: 'Loan amount minus KFS charges should equal what you received.' },
  { id: 'emi', label: 'Does the EMI match the schedule?', help: 'Check My Loan can reconcile EMI and rate.' },
  { id: 'statement', label: 'Does the current statement match the expected amortization?', help: 'Look for unexplained debits or interest.' },
  { id: 'penal', label: 'Are penal charges clearly disclosed?', help: 'They should be charges (not penal interest) and disclosed upfront.' },
  { id: 'prepayment', label: 'Is any prepayment charge consistent with your loan type, date and rate?', help: 'See Rules & Sources for RBI’s pre-payment directions.' },
  { id: 'gro', label: 'Does the lender publish grievance officer details?', help: 'The KFS and lender website should name a grievance redressal officer.' },
]

export const DOCUMENT_TYPES = [
  { id: 'kfs', title: 'Key Facts Statement (KFS)', body: 'Summary of the loan with APR, charges and repayment schedule. The single most useful document.' },
  { id: 'sanctionLetter', title: 'Sanction letter', body: 'Loan amount, rate, tenure, EMI and conditions as approved.' },
  { id: 'loanAgreement', title: 'Loan agreement', body: 'The contract: rate type, charges, prepayment terms, penal charges.' },
  { id: 'amortizationSchedule', title: 'Amortization schedule', body: 'Every EMI with its principal and interest split.' },
  { id: 'statement', title: 'Loan account statement', body: 'What was actually charged and paid so far.' },
  { id: 'foreclosureLetter', title: 'Foreclosure letter / quote', body: 'The amount needed to close the loan today, with any charges.' },
] as const
