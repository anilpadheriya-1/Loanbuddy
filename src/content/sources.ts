/**
 * Regulatory and official sources shown on the Rules & Sources page and
 * referenced across the app. Every entry needs an official URL, a date and a
 * status. "consolidated" means the content now lives in a newer RBI Master
 * Direction; "historical" means it is NOT the current rule.
 *
 * Source review date: see SOURCES_LAST_VERIFIED. This is when we last checked
 * the sources — not a promise that the rules have not changed since.
 */

export type SourceStatus = 'current' | 'consolidated' | 'historical' | 'verify'

export type SourceTopic =
  | 'kfs-apr'
  | 'penal-charges'
  | 'prepayment'
  | 'digital-lending'
  | 'floating-reset'
  | 'grievance'
  | 'gst'
  | 'credit-report'
  | 'tax'

export interface Source {
  id: string
  title: string
  regulator: 'RBI' | 'CBIC' | 'TransUnion CIBIL' | 'Income Tax Department'
  /** Reference number, if any. */
  reference?: string
  /** Publication date, ISO. */
  date: string
  /** Effective date, if different and known. */
  effective?: string
  topics: SourceTopic[]
  status: SourceStatus
  statusNote?: string
  summary: string
  url: string
  lastVerified: string
}

export const SOURCES_LAST_VERIFIED = '2026-09-26'

export const SOURCES: Source[] = [
  {
    id: 'rbi-rbc-banks-2025',
    title: 'Reserve Bank of India (Commercial Banks – Responsible Business Conduct) Directions, 2025',
    regulator: 'RBI',
    reference: 'RBI/DOR/2025-26/170 (updated as on July 1, 2026)',
    date: '2025-11-28',
    topics: ['kfs-apr', 'penal-charges', 'floating-reset', 'prepayment'],
    status: 'current',
    summary:
      'RBI’s consolidated conduct rules for commercial banks. Lenders must give a Key Facts Statement (KFS) for retail and MSME term loans, with the Annual Percentage Rate (APR) — the annual cost of credit including interest and all other charges — and a repayment schedule. Charges not mentioned in the KFS cannot be levied without the borrower’s explicit consent. Also covers penal charges and the reset of floating-rate EMI loans. Similar Directions apply to other types of lenders (NBFCs, small finance banks, co-operative banks).',
    url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13140',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'rbi-rbc-nbfc-2025',
    title: 'Reserve Bank of India (Non-Banking Financial Companies – Responsible Business Conduct) Directions, 2025',
    regulator: 'RBI',
    reference: 'Updated as on July 1, 2026',
    date: '2025-11-28',
    topics: ['kfs-apr', 'penal-charges', 'floating-reset', 'prepayment'],
    status: 'current',
    summary:
      'The equivalent conduct rules for NBFCs (including housing finance companies): Fair Practices Code, Key Facts Statement, penal charges, floating-rate reset, pre-payment charges and gold-loan conduct.',
    url: 'https://m.rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=12942',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'rbi-kfs-2024',
    title: 'Key Facts Statement (KFS) for Loans & Advances',
    regulator: 'RBI',
    reference: 'RBI/2024-25/18 DOR.STR.REC.13/13.03.00/2024-25',
    date: '2024-04-15',
    effective: '2024-10-01',
    topics: ['kfs-apr'],
    status: 'consolidated',
    statusNote: 'Now part of the 2025 Responsible Business Conduct Directions. Kept here because its APR illustration explains the method.',
    summary:
      'Introduced a common KFS for all retail and MSME term loans sanctioned from 1 October 2024. Its illustration computes APR on the net disbursed amount using the IRR approach and reducing-balance method: ₹20,000 at 15% for 24 months with ₹400 of fees gives an APR of 17.07%. Our calculator reproduces this example exactly.',
    url: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12663&Mode=0',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'rbi-prepayment-2025',
    title: 'Reserve Bank of India (Pre-payment Charges on Loans) Directions, 2025',
    regulator: 'RBI',
    reference: 'RBI/2025-26/64 DoR.MCS.REC.38/01.01.001/2025-26',
    date: '2025-07-02',
    effective: '2026-01-01',
    topics: ['prepayment'],
    status: 'current',
    statusNote: 'Applies to loans sanctioned or renewed on or after 1 January 2026.',
    summary:
      'For floating-rate loans to individuals for non-business purposes, no pre-payment charges. For floating-rate business loans to individuals and micro & small enterprises: no charges by commercial banks (except small finance, regional rural and local area banks), Tier-4 urban co-operative banks, upper-layer NBFCs and all-India financial institutions; small finance banks, RRBs, Tier-3 UCBs, state/central co-operative banks and middle-layer NBFCs cannot charge on loans up to ₹50 lakh. No lock-in, whatever the source of funds. Otherwise charges follow the lender’s policy, on the amount prepaid, and must be disclosed in the sanction letter, agreement and KFS. No charge when the lender initiates the pre-payment.',
    url: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12878',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'rbi-foreclosure-2019',
    title: 'Levy of Foreclosure Charges / Pre-payment Penalty on Floating Rate Term Loans',
    regulator: 'RBI',
    reference: 'DBR.Dir.BC.No.08/13.03.00/2019-20',
    date: '2019-08-02',
    topics: ['prepayment'],
    status: 'historical',
    statusNote: 'HISTORICAL — NOT CURRENT RULE. Repealed from 1 January 2026 by the 2025 Pre-payment Directions, but it governed loans during its period.',
    summary:
      'Clarified that banks shall not charge foreclosure charges or pre-payment penalties on floating-rate term loans sanctioned for purposes other than business to individual borrowers. Similar earlier instructions (2012, 2014) and NBFC/HFC provisions applied the same idea. Relevant when checking older loans.',
    url: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11646&Mode=0',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'rbi-penal-2023',
    title: 'Fair Lending Practice – Penal Charges in Loan Accounts',
    regulator: 'RBI',
    reference: 'RBI/2023-24/53 DoR.MCS.REC.28/01.01.001/2023-24',
    date: '2023-08-18',
    topics: ['penal-charges'],
    status: 'consolidated',
    statusNote: 'Provisions now carried in the 2025 Responsible Business Conduct Directions.',
    summary:
      'Penalties for non-compliance must be levied as “penal charges”, not “penal interest” added to the rate. They must be reasonable and not a revenue tool, cannot be capitalised (no interest on them), and must be disclosed in the loan agreement, KFS and on the lender’s website.',
    url: 'https://m.rbi.org.in/Scripts/NotificationUser.aspx?Id=12527&Mode=0',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'rbi-reset-2023',
    title: 'Reset of Floating Interest Rate on EMI based Personal Loans',
    regulator: 'RBI',
    reference: 'RBI/2023-24/55 (updated as on October 1, 2025)',
    date: '2023-08-18',
    topics: ['floating-reset'],
    status: 'consolidated',
    statusNote: 'Provisions now carried in the 2025 Responsible Business Conduct Directions. Since 1 Oct 2025, offering a switch to fixed rate is at the lender’s option.',
    summary:
      'When a floating rate changes, lenders must communicate the impact on EMI/tenure, let borrowers choose between a higher EMI, a longer tenure or a combination, and allow prepayment. Tenure extension must not cause negative amortisation. Borrowers should get a quarterly statement showing principal and interest paid, EMIs left and the APR.',
    url: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12529&Mode=0',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'rbi-digital-2025',
    title: 'Reserve Bank of India (Digital Lending) Directions, 2025',
    regulator: 'RBI',
    date: '2025-05-08',
    topics: ['digital-lending', 'kfs-apr'],
    status: 'current',
    summary:
      'Rules for loans sourced through apps and Lending Service Providers (LSPs): a KFS with APR before signing, all-inclusive cost disclosure (no undisclosed charges), a cooling-off period to exit by paying principal and proportionate APR, and — where an LSP shows offers from several lenders — an unbiased display without dark patterns.',
    url: 'https://m.rbi.org.in/Scripts/NotificationUser.aspx?Id=12848&Mode=0',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'rbi-ios-2026',
    title: 'Reserve Bank – Integrated Ombudsman Scheme, 2026',
    regulator: 'RBI',
    date: '2026-01-16',
    effective: '2026-07-01',
    topics: ['grievance'],
    status: 'current',
    statusNote: 'In force from 1 July 2026; replaces the 2021 scheme.',
    summary:
      'The RBI’s free complaint route for customers of regulated entities. First complain to the lender (use its grievance redressal officer); if the complaint is rejected, not resolved or not answered within the allowed time, you may complain through RBI’s Complaint Management System, subject to the scheme’s conditions.',
    url: 'https://cms.rbi.org.in/',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'rbi-ios-2026-press',
    title: 'RBI issues Reserve Bank – Integrated Ombudsman Scheme, 2026 (press release)',
    regulator: 'RBI',
    date: '2026-01-16',
    topics: ['grievance'],
    status: 'current',
    summary: 'Announcement of the revised Ombudsman scheme coming into force from 1 July 2026.',
    url: 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=62052',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'cbic-exemption-2017',
    title: 'Notification No. 12/2017-Central Tax (Rate), Sl. No. 27 (as amended)',
    regulator: 'CBIC',
    date: '2017-06-28',
    topics: ['gst'],
    status: 'verify',
    statusNote: 'Verify against the current rate notifications: GST rates were restructured in September 2025.',
    summary:
      'Services by way of extending loans or advances are exempt from GST in so far as the consideration is interest or discount. Processing, documentation and other service charges are not “interest” and can be taxable — so GST may apply to fees but not to your interest. Check each charge on your KFS or invoice.',
    url: 'https://cbic-gst.gov.in/hindi/pdf/central-tax-rate/Notification12-CGST.pdf',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'cbic-penal-2025',
    title: 'Circular No. 245/02/2025-GST — clarification on penal charges',
    regulator: 'CBIC',
    reference: 'Circular No. 245/02/2025-GST',
    date: '2025-01-28',
    topics: ['gst', 'penal-charges'],
    status: 'current',
    summary:
      'Clarifies that no GST is payable on penal charges levied by RBI-regulated entities, in compliance with RBI’s directions of 18 August 2023, for non-compliance with material terms of the loan contract.',
    url: 'https://cbic-gst.gov.in/pdf/Circular-55thGSTC-Services.pdf',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'cibil-free-report',
    title: 'Free CIBIL Score & Report — once every calendar year',
    regulator: 'TransUnion CIBIL',
    date: '2026-09-24',
    topics: ['credit-report'],
    status: 'current',
    summary:
      'Individuals are entitled to one free CIBIL Score and Report every calendar year, as per RBI guidelines. Your CIBIL score is different from the Loan Deal Score in this app — we never check your credit score.',
    url: 'https://www.cibil.com/freecibilscore',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
  {
    id: 'itd-new-act-2025',
    title: 'Income-tax Act, 2025 comes into force from 1 April 2026',
    regulator: 'Income Tax Department',
    date: '2026-04-01',
    topics: ['tax'],
    status: 'current',
    summary:
      'The Income-tax Act, 2025 replaced the Income-tax Act, 1961 from 1 April 2026. Familiar references such as “section 24(b)” and “section 80C” belong to the 1961 Act; for tax year 2026-27 onwards check the corresponding provisions of the new Act and whether you use the old or new tax regime.',
    url: 'https://www.incometaxindia.gov.in/w/income-tax-act-2025-comes-into-force-from-1st-april-2026',
    lastVerified: SOURCES_LAST_VERIFIED,
  },
]

export function sourceById(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id)
}

export const TOPIC_LABELS: Record<SourceTopic, string> = {
  'kfs-apr': 'KFS & APR',
  'penal-charges': 'Penal charges',
  prepayment: 'Pre-payment & foreclosure',
  'digital-lending': 'Digital lending',
  'floating-reset': 'Floating-rate reset',
  grievance: 'Complaints & grievance',
  gst: 'GST',
  'credit-report': 'Credit report',
  tax: 'Income tax',
}
