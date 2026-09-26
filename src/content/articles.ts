/**
 * Learn articles. Short, practical, with worked ₹ examples (computed with the
 * same engine the calculator uses) and "Questions to ask your lender".
 * English only in this release.
 */

export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'example'; title: string; rows: [string, string][]; note?: string }
  | { type: 'tip'; text: string }

export type ArticleCategory = 'basics' | 'charges' | 'repayment' | 'rates' | 'rights' | 'credit'

export interface Article {
  slug: string
  title: string
  summary: string
  minutes: number
  category: ArticleCategory
  body: ArticleBlock[]
  questions: string[]
  sourceIds?: string[]
  related?: string[]
}

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  basics: 'The basics',
  charges: 'Fees & charges',
  repayment: 'Repaying & prepaying',
  rates: 'Interest rates',
  rights: 'Your documents & rights',
  credit: 'Credit & negotiation',
}

export const ARTICLES: Article[] = [
  {
    slug: 'real-cost-of-a-loan',
    title: 'What is the real cost of a loan?',
    summary: 'Interest is only part of it. The real cost is everything you pay compared with the money you actually get.',
    minutes: 3,
    category: 'basics',
    body: [
      { type: 'p', text: 'The real cost of a loan is the difference between the money you actually receive and everything you pay back — interest, fees, insurance, GST on fees and any other charges — spread over the time you have the money.' },
      { type: 'p', text: 'Two things push the real cost above the headline rate: charges deducted before you get the money (you still repay the full amount), and the way interest is calculated (for example a flat rate).' },
      {
        type: 'example',
        title: 'Illustrative example — not a real lender offer',
        rows: [
          ['Loan amount sanctioned', '₹5,00,000'],
          ['Deducted upfront (fee + insurance)', '₹20,000'],
          ['Actually received', '₹4,80,000'],
          ['Quoted rate', '12% reducing'],
          ['EMI × 44', '₹14,102 × 44 = ₹6,20,497'],
          ['Estimated effective annualized cost', 'about 14.39%'],
        ],
        note: 'You repay a ₹5 lakh loan but only had ₹4.8 lakh to use.',
      },
      { type: 'tip', text: 'Compare loans on their APR (in the KFS) or on an effective-cost calculation — not on the headline rate alone.' },
    ],
    questions: ['What is the APR of this loan, and which charges does it include?', 'How much will I actually receive after all deductions?'],
    sourceIds: ['rbi-rbc-banks-2025', 'rbi-kfs-2024'],
    related: ['interest-rate-vs-apr', 'why-12-can-cost-more', 'flat-vs-reducing'],
  },
  {
    slug: 'flat-vs-reducing',
    title: 'Flat rate vs reducing balance',
    summary: 'A flat rate charges interest on money you have already repaid. That is why “10% flat” costs about 18%.',
    minutes: 4,
    category: 'rates',
    body: [
      { type: 'p', text: 'With a reducing-balance rate, interest is charged each month on the principal still outstanding. As you repay, the interest part of your EMI shrinks.' },
      { type: 'p', text: 'With a flat rate, interest is calculated on the ORIGINAL loan amount for the whole tenure, even though you repay part of the principal every month. Flat rates are still seen in some vehicle, consumer and small personal loans.' },
      {
        type: 'example',
        title: '₹1,00,000 for 3 years',
        rows: [
          ['10% flat — total interest', '₹30,000 (EMI ₹3,611)'],
          ['10% reducing — total interest', '₹16,162 (EMI ₹3,227)'],
          ['Reducing-balance equivalent of 10% flat', 'about 17.92%'],
        ],
        note: 'The two rates are not directly comparable. Always convert to a reducing-balance / APR basis.',
      },
      { type: 'tip', text: 'If your EMI looks higher than an EMI calculator shows for the quoted rate, ask whether the rate is flat.' },
    ],
    questions: ['Is the quoted rate flat or reducing balance?', 'What is the APR in the KFS?'],
    sourceIds: ['rbi-kfs-2024'],
    related: ['why-12-can-cost-more', 'how-emi-works'],
  },
  {
    slug: 'why-12-can-cost-more',
    title: 'Why 12% can cost more than 12%',
    summary: 'Deductions, insurance, advance EMIs and timing all raise the effective cost above the quoted rate.',
    minutes: 3,
    category: 'basics',
    body: [
      { type: 'p', text: 'The quoted rate is the rate used to calculate interest on the loan amount. But you do not receive the full loan amount if fees are deducted, and you may pay extra amounts that are not interest.' },
      { type: 'list', items: ['Processing fee deducted upfront — you pay interest on money you never received.', 'Insurance added to the loan or deducted — you pay for it and may pay interest on it.', 'GST on fees.', 'Advance EMIs — you start repaying on day one.', 'A first EMI earlier than one month, or broken-period interest.', 'Annual or other recurring fees.', 'A flat-rate calculation.'] },
      { type: 'example', title: '₹3,00,000 personal loan at 12% for 36 months', rows: [['Processing fee 2% + 18% GST', '₹7,080 deducted'], ['EMI', '₹9,964'], ['Estimated effective annualized cost', 'about 13.67%']] },
      { type: 'p', text: 'None of this is necessarily wrong — it is how the cost is built. The point is to see the full number before you decide.' },
    ],
    questions: ['Which charges are deducted from the loan amount?', 'Is any insurance included, and is it mandatory?'],
    sourceIds: ['rbi-rbc-banks-2025'],
    related: ['processing-fee-and-gst', 'loan-insurance', 'advance-emi'],
  },
  {
    slug: 'interest-rate-vs-apr',
    title: 'Interest rate vs APR',
    summary: 'The interest rate prices the loan amount. The APR is the annual cost of credit including charges.',
    minutes: 3,
    category: 'basics',
    body: [
      { type: 'p', text: 'RBI defines the Annual Percentage Rate (APR) as the annual cost of credit to the borrower, including the interest rate and all other charges associated with the credit facility. It must be shown in the Key Facts Statement (KFS).' },
      { type: 'p', text: 'RBI’s KFS illustration computes APR on the net disbursed amount using an IRR approach and the reducing-balance method: ₹20,000 at 15% for 24 months with ₹400 of fees gives an APR of 17.07%.' },
      { type: 'p', text: 'Our “estimated effective annualized cost” uses the same convention on the cash flows you enter. It can still differ from the lender’s APR if timing or the treatment of a charge differs — so treat it as an estimate and ask for the lender’s APR sheet.' },
      { type: 'tip', text: 'Loan Reality India uses four different numbers: the quoted rate, our estimated effective cost, the lender’s APR (from the KFS), and the Loan Deal Score. They are not the same thing.' },
    ],
    questions: ['Please share the APR computation sheet.', 'Which charges are included in the APR, and which are not?'],
    sourceIds: ['rbi-rbc-banks-2025', 'rbi-kfs-2024'],
    related: ['what-is-kfs', 'real-cost-of-a-loan'],
  },
  {
    slug: 'what-is-kfs',
    title: 'What is a Key Facts Statement (KFS)?',
    summary: 'A standard summary of your loan: amount, APR, charges, EMI and repayment schedule.',
    minutes: 3,
    category: 'rights',
    body: [
      { type: 'p', text: 'A Key Facts Statement is a short, standard document that RBI-regulated lenders must give for retail and MSME term loans (credit cards are excluded). It uses simple language and a common format so you can compare loans.' },
      { type: 'list', items: ['Loan amount, tenure, instalment amount and number of instalments', 'Interest rate type and rate', 'All fees and charges — those paid to the lender and those collected for third parties such as insurers', 'Net disbursed amount', 'APR', 'Repayment schedule', 'Penal charges, prepayment terms, grievance officer details'] },
      { type: 'p', text: 'Charges that are not mentioned in the KFS cannot be charged at any stage during the loan without your explicit consent. The KFS must be valid for a minimum period (at least three working days for loans of seven days or more), giving you time to compare.' },
    ],
    questions: ['Can I have the KFS before I sign?', 'Is every charge I am paying listed in the KFS?'],
    sourceIds: ['rbi-rbc-banks-2025', 'rbi-kfs-2024', 'rbi-digital-2025'],
    related: ['how-to-read-kfs', 'interest-rate-vs-apr'],
  },
  {
    slug: 'how-to-read-kfs',
    title: 'What to check in a KFS',
    summary: 'A 10-point checklist to read your KFS in five minutes.',
    minutes: 4,
    category: 'rights',
    body: [
      { type: 'list', items: ['Net disbursed amount = loan amount − charges. Does it match what you received?', 'APR vs interest rate — how big is the gap, and why?', 'Rate type: fixed, floating or hybrid. For floating, what is the benchmark and spread?', 'Every fee: processing, documentation, legal, valuation, stamp duty — with amounts.', 'Insurance: amount, insurer, and whether it is mandatory.', 'EMI and number of EMIs. Does the EMI match the rate? (Use Check My Loan.)', 'Repayment schedule — the first EMI date and any advance EMIs.', 'Prepayment and foreclosure charges.', 'Penal charges and bounce charges.', 'Grievance redressal officer contact details.'] },
      { type: 'tip', text: 'Enter the KFS numbers into Check My Loan and compare our estimate with the KFS APR. A big difference means something is being treated differently — worth a question.' },
    ],
    questions: ['Why is the APR higher than the interest rate by this much?', 'Which of these charges are optional?'],
    sourceIds: ['rbi-rbc-banks-2025'],
    related: ['what-is-kfs', 'unexpected-charges'],
  },
  {
    slug: 'processing-fee-and-gst',
    title: 'Processing fee and GST',
    summary: 'Usually deducted upfront, often with GST on top — and it raises your effective cost more on short loans.',
    minutes: 3,
    category: 'charges',
    body: [
      { type: 'p', text: 'The processing fee is a one-time charge for processing your application, usually a percentage of the loan and usually deducted from the disbursement.' },
      { type: 'p', text: 'Interest on loans is exempt from GST, but processing and similar service charges are not interest and can attract GST. Check whether the fee in your KFS already includes GST or has GST added.' },
      { type: 'example', title: '₹3,00,000 loan, 36 months at 12%', rows: [['Processing fee (2%)', '₹6,000'], ['GST (18% on the fee, if charged)', '₹1,080'], ['Deducted in total', '₹7,080'], ['Effective cost', 'about 13.67% instead of 12%']], note: 'The same fee on a 12-month loan would raise the effective cost even more, because it is spread over less time.' },
      { type: 'tip', text: 'Processing fees are often negotiable, especially for good credit profiles or during offers. Ask for a waiver or a cap.' },
    ],
    questions: ['Is the processing fee inclusive of GST?', 'Can the processing fee be reduced or waived?'],
    sourceIds: ['cbic-exemption-2017', 'rbi-rbc-banks-2025'],
    related: ['why-12-can-cost-more', 'negotiate-loan'],
  },
  {
    slug: 'loan-insurance',
    title: 'Insurance bundled with loans',
    summary: 'Loan protection cover can be useful — but check whether it is mandatory, what it covers and what it costs.',
    minutes: 4,
    category: 'charges',
    body: [
      { type: 'p', text: 'Lenders often offer credit-life or loan protection insurance that pays off the loan if something happens to the borrower. The premium is usually a single upfront amount, deducted from the loan or added to it.' },
      { type: 'example', title: '₹5,00,000 loan, 60 months at 11%', rows: [['Single premium deducted', '₹10,000'], ['Effective cost without insurance', '11.00%'], ['Effective cost with premium deducted', 'about 11.88%']] },
      { type: 'list', items: ['Ask if it is mandatory. If optional, you can decline it.', 'If you want cover, compare with a term insurance policy you buy yourself.', 'Get the policy document: insurer, sum assured, what happens if you prepay.', 'Check whether the premium is refundable on foreclosure.'] },
    ],
    questions: ['Is this insurance mandatory for the loan?', 'Who is the insurer, and can I see the policy document?', 'Is any premium refunded if I close the loan early?'],
    sourceIds: ['rbi-rbc-banks-2025', 'rbi-kfs-2024'],
    related: ['why-12-can-cost-more', 'unexpected-charges'],
  },
  {
    slug: 'advance-emi',
    title: 'Advance EMI',
    summary: 'Paying one or two EMIs on day one raises the effective cost, common in vehicle loans.',
    minutes: 3,
    category: 'repayment',
    body: [
      { type: 'p', text: 'Some vehicle and consumer loans collect one or more EMIs in advance at disbursement. You receive less money on day one, but the number of EMIs is the same in total.' },
      { type: 'example', title: '₹6,00,000 car loan, 9%, 60 EMIs of ₹12,455', rows: [['No advance EMI', 'effective cost 9.00%'], ['2 advance EMIs deducted', 'effective cost about 9.68%']] },
      { type: 'tip', text: 'Enter the number of advance EMIs in Check My Loan (Step 4) and we include the effect automatically.' },
    ],
    questions: ['How many EMIs are collected in advance?', 'Is the EMI calculated assuming advance payment?'],
    related: ['why-12-can-cost-more', 'how-emi-works'],
  },
  {
    slug: 'pre-emi',
    title: 'Pre-EMI interest',
    summary: 'For under-construction homes, you may pay interest-only instalments before full EMIs start.',
    minutes: 3,
    category: 'repayment',
    body: [
      { type: 'p', text: 'When a home loan is disbursed in stages as a building is constructed, you usually pay only interest on the amount disbursed so far. This is called pre-EMI interest. Your full EMI starts after the final disbursement.' },
      { type: 'example', title: '₹20,00,000 disbursed of ₹50,00,000, at 8.5%', rows: [['Monthly pre-EMI interest', '₹14,167'], ['Principal repaid by pre-EMI', '₹0']], note: 'Pre-EMI can run for years if construction is delayed, and it does not reduce your loan.' },
      { type: 'p', text: 'A similar idea is broken-period interest: interest for the days between disbursement and the start of the first full EMI period, sometimes deducted upfront or added to the first EMI.' },
      { type: 'tip', text: 'Some lenders let you start full EMIs immediately instead of pre-EMI. That starts repaying principal sooner.' },
    ],
    questions: ['Will I pay pre-EMI or full EMI during construction?', 'How is broken-period interest charged?'],
    related: ['how-emi-works', 'advance-emi'],
  },
  {
    slug: 'part-prepayment',
    title: 'Part-prepayment',
    summary: 'Paying extra towards principal saves interest, most when done early — but keep an emergency fund.',
    minutes: 4,
    category: 'repayment',
    body: [
      { type: 'p', text: 'A part-prepayment reduces your outstanding principal, so future interest falls. Most of a long loan’s interest is paid in the early years, so prepayments made early save the most.' },
      { type: 'example', title: '₹40,00,000 home loan, 8.75%, 20 years (EMI ₹35,348)', rows: [['Total interest if you do nothing', 'about ₹44.8 lakh'], ['Prepay ₹5 lakh once, after 12 EMIs (keep EMI)', 'saves about ₹16 lakh; ends ~59 months earlier'], ['Pay ₹5,000 extra every month', 'saves about ₹13.6 lakh; ends ~63 months earlier']] },
      { type: 'list', items: ['Check prepayment charges — for many floating-rate loans to individuals, RBI rules say there should be none.', 'Ask the lender to keep the EMI and reduce the tenure — it usually saves more interest.', 'Keep an emergency fund first; prepaid money is hard to get back.'] },
    ],
    questions: ['What is the minimum part-prepayment amount?', 'Will you reduce my tenure or my EMI after a prepayment?', 'Are there any charges for part-prepayment?'],
    sourceIds: ['rbi-prepayment-2025'],
    related: ['when-prepayment-may-not-make-sense', 'foreclosure'],
  },
  {
    slug: 'foreclosure',
    title: 'Foreclosure: closing your loan early',
    summary: 'Paying off the whole loan early ends future interest. Check charges and get a foreclosure letter.',
    minutes: 3,
    category: 'repayment',
    body: [
      { type: 'p', text: 'Foreclosure means repaying the entire outstanding loan before the end of the tenure. You save all future interest, minus any foreclosure charge.' },
      { type: 'p', text: 'Under RBI’s 2025 directions (loans sanctioned or renewed from 1 January 2026), floating-rate loans to individuals for non-business purposes should carry no pre-payment charges. For other loans, charges follow the lender’s policy and must be disclosed in the KFS and sanction letter.' },
      { type: 'list', items: ['Ask for a written foreclosure statement with the exact amount and date.', 'After closure, collect the No Dues / No Objection Certificate.', 'For secured loans, make sure original property documents are returned and any charge or hypothecation is removed.'] },
    ],
    questions: ['What is the foreclosure amount as of a specific date?', 'Which charges are included in it?', 'When will I receive the NOC and original documents?'],
    sourceIds: ['rbi-prepayment-2025', 'rbi-foreclosure-2019'],
    related: ['part-prepayment', 'balance-transfer'],
  },
  {
    slug: 'balance-transfer',
    title: 'Balance transfer',
    summary: 'Moving your loan to a cheaper lender can save a lot — or nothing, once costs are counted.',
    minutes: 4,
    category: 'repayment',
    body: [
      { type: 'p', text: 'A balance transfer moves your outstanding loan to a new lender at a lower rate. It helps when the rate gap is meaningful and a lot of tenure remains.' },
      { type: 'example', title: '₹40 lakh outstanding, 18 years left', rows: [['Current rate / EMI', '9.50% / ₹38,716'], ['New rate / EMI', '8.40% / ₹35,973'], ['Interest saved over 18 years', 'about ₹5.9 lakh'], ['Transfer costs (fees, legal, valuation, GST)', 'deducted from that']] },
      { type: 'list', items: ['Include every cost: new processing fee, legal and valuation fees, stamp duty, GST, and any foreclosure charge on the old loan.', 'Keep the same remaining tenure when comparing — a longer tenure can hide higher total interest.', 'Ask your current lender for a rate reduction first; many will match.'] },
      { type: 'tip', text: 'Use the Savings Lab → Balance transfer to see net savings and the break-even month.' },
    ],
    questions: ['What will the total cost of the transfer be, including GST?', 'Can my current lender reduce my rate instead?'],
    related: ['when-refinancing-makes-sense', 'negotiate-loan'],
  },
  {
    slug: 'fixed-vs-floating',
    title: 'Fixed vs floating rates',
    summary: 'Floating rates move with a benchmark; fixed rates don’t (for the fixed period). Each has trade-offs.',
    minutes: 3,
    category: 'rates',
    body: [
      { type: 'p', text: 'A floating rate is linked to a benchmark (such as the RBI repo rate or a lender’s MCLR) plus a spread. When the benchmark changes, your rate resets and your EMI or tenure changes.' },
      { type: 'p', text: 'A fixed rate stays the same for the fixed period, which gives certainty but is often priced higher. Many “fixed” home loans are actually hybrid: fixed for a few years, then floating.' },
      { type: 'list', items: ['On a reset, lenders must tell you the impact and let you choose a higher EMI, a longer tenure, or a mix — and allow prepayment.', 'Floating-rate loans to individuals for non-business purposes should not carry prepayment charges (see RBI’s directions).', 'Our calculator assumes today’s floating rate stays the same — actual cost will change with resets.'] },
    ],
    questions: ['Which benchmark is my rate linked to, and what is the spread?', 'How often does the rate reset?', 'What are the charges to switch between fixed and floating?'],
    sourceIds: ['rbi-reset-2023', 'rbi-prepayment-2025'],
    related: ['benchmark-and-spread'],
  },
  {
    slug: 'benchmark-and-spread',
    title: 'Benchmark + spread',
    summary: 'Your floating rate = benchmark + spread. The spread is what you can negotiate.',
    minutes: 3,
    category: 'rates',
    body: [
      { type: 'p', text: 'Floating rates are built from two parts: an external or internal benchmark (for example the repo rate, a T-bill rate or MCLR) and a spread set by the lender based on your profile and the product.' },
      { type: 'example', title: 'Illustration', rows: [['Benchmark', '5.50%'], ['Spread', '3.00%'], ['Your rate', '8.50%']], note: 'If the benchmark falls by 0.25%, your rate should fall too at the next reset — but the spread stays the same unless renegotiated.' },
      { type: 'tip', text: 'If your credit profile improves, ask your lender to reduce the spread. A conversion fee may apply — compare it with the savings.' },
    ],
    questions: ['What is my current spread, and can it be reduced?', 'When is my next reset date?'],
    sourceIds: ['rbi-reset-2023'],
    related: ['fixed-vs-floating', 'negotiate-loan'],
  },
  {
    slug: 'penal-charges',
    title: 'Penal charges vs normal interest',
    summary: 'If you miss a condition, lenders can levy penal charges — not extra interest on your rate.',
    minutes: 3,
    category: 'rights',
    body: [
      { type: 'p', text: 'Since RBI’s 2023 rules (now part of the 2025 conduct directions), a penalty for not meeting loan terms must be a “penal charge”, not “penal interest” added to your rate. Penal charges must be reasonable, disclosed upfront in the agreement and KFS, and no interest can be calculated on them.' },
      { type: 'p', text: 'CBIC has clarified that no GST is payable on such penal charges levied by RBI-regulated lenders.' },
      { type: 'tip', text: 'Late payment still costs you — interest continues on the overdue amount, and your credit history is affected. Set up auto-debit a few days after salary credit.' },
    ],
    questions: ['What penal charges apply, and for which conditions?', 'Where are they listed in my KFS and agreement?'],
    sourceIds: ['rbi-penal-2023', 'cbic-penal-2025', 'rbi-rbc-banks-2025'],
    related: ['bounce-charges'],
  },
  {
    slug: 'bounce-charges',
    title: 'Bounce charges',
    summary: 'A failed EMI debit can trigger a bounce charge from the lender and from your bank.',
    minutes: 2,
    category: 'charges',
    body: [
      { type: 'p', text: 'If your EMI auto-debit (NACH/ECS) fails for insufficient balance, the lender may levy a bounce or dishonour charge, and your own bank may also charge for the failed mandate. A late EMI may also attract penal charges and affects your credit history.' },
      { type: 'example', title: 'Three bounces in a year', rows: [['Lender bounce charge', '₹500 × 3 = ₹1,500'], ['Your bank’s mandate-return charge', 'extra, as per your bank'], ['Credit history', 'late payments are reported']] },
      { type: 'tip', text: 'Keep a buffer in the EMI account, or ask to move the EMI date closer to your salary date.' },
    ],
    questions: ['What is the bounce charge per instance?', 'Can the EMI date be changed?'],
    sourceIds: ['rbi-penal-2023'],
    related: ['penal-charges', 'credit-score-and-pricing'],
  },
  {
    slug: 'how-emi-works',
    title: 'How EMI and amortization work',
    summary: 'Early EMIs are mostly interest; later EMIs are mostly principal.',
    minutes: 3,
    category: 'basics',
    body: [
      { type: 'p', text: 'An EMI (equated monthly instalment) stays the same each month, but its split changes. Interest is charged on the outstanding balance, so at the start most of the EMI goes to interest. As the balance falls, more goes to principal.' },
      { type: 'example', title: '₹30,00,000 home loan, 9%, 20 years', rows: [['EMI', '₹26,992'], ['Month 1 interest', '₹22,500'], ['Month 1 principal', '₹4,492']], note: 'In the first month, 83% of the EMI is interest.' },
      { type: 'p', text: 'The formula: EMI = P × r × (1+r)^n / ((1+r)^n − 1), where P is the loan, r the monthly rate and n the number of months.' },
    ],
    questions: ['Can I have the full amortization schedule?'],
    related: ['part-prepayment', 'read-loan-statement'],
  },
  {
    slug: 'negotiate-loan',
    title: 'How to negotiate your loan',
    summary: 'Rates, spreads, processing fees and insurance are often negotiable. Ask with competing offers in hand.',
    minutes: 3,
    category: 'credit',
    body: [
      { type: 'list', items: ['Get 2–3 offers and compare them on APR / effective cost, not headline rate.', 'Ask for a processing-fee waiver or cap.', 'Decline optional insurance or buy cover separately.', 'For floating loans, negotiate the spread.', 'Existing customers: ask your lender to reprice before switching.'] },
      { type: 'example', title: '₹40 lakh, 20 years', rows: [['8.75% → 8.50%', 'EMI ₹35,348 → ₹34,713'], ['Interest saved over the tenure', 'about ₹1.5 lakh']] },
    ],
    questions: ['Can you match this other offer’s APR?', 'Can the processing fee be waived?'],
    related: ['credit-score-and-pricing', 'balance-transfer'],
  },
  {
    slug: 'credit-score-and-pricing',
    title: 'How your credit score can affect pricing',
    summary: 'Many lenders price loans by credit profile. Your CIBIL score is different from our Loan Deal Score.',
    minutes: 3,
    category: 'credit',
    body: [
      { type: 'p', text: 'Credit bureaus (such as TransUnion CIBIL) keep a record of your loans and repayments and compute a credit score. Many lenders use it, along with income and other factors, to decide whether to lend and at what spread.' },
      { type: 'list', items: ['You are entitled to one free CIBIL Score & Report every calendar year.', 'Pay EMIs and card dues on time; keep card utilisation moderate.', 'Check your report for errors and raise disputes with the bureau.'] },
      { type: 'tip', text: 'Loan Reality India never checks your credit score and never asks for your PAN. Our Loan Deal Score is about a loan’s cost and transparency — it is not a credit score.' },
    ],
    questions: ['Is my rate linked to my credit score? Could a better score lower the spread?'],
    sourceIds: ['cibil-free-report'],
    related: ['negotiate-loan'],
  },
  {
    slug: 'read-loan-statement',
    title: 'How to read a loan statement',
    summary: 'Check that each EMI is split correctly and no unexplained debits appear.',
    minutes: 3,
    category: 'rights',
    body: [
      { type: 'list', items: ['Opening and closing principal each month should fall by the principal part of the EMI.', 'Interest charged should be roughly outstanding × rate ÷ 12.', 'Look for debits other than EMIs: insurance renewals, fees, penal or bounce charges.', 'For floating loans, check the rate used after each reset.', 'Floating-rate EMI borrowers should receive a quarterly statement showing principal and interest recovered, EMIs left and the APR.'] },
      { type: 'tip', text: 'Compare your statement with the schedule in Check My Loan → Amortization. Differences are worth a polite written question.' },
    ],
    questions: ['Please explain this debit on my statement.', 'What rate was applied this month, and why?'],
    sourceIds: ['rbi-reset-2023'],
    related: ['unexpected-charges', 'how-emi-works'],
  },
  {
    slug: 'unexpected-charges',
    title: 'How to spot unexpected charges',
    summary: 'Compare what you received, what the KFS lists, and what your statement shows.',
    minutes: 3,
    category: 'rights',
    body: [
      { type: 'list', items: ['Sanctioned amount − KFS charges should equal what you received. A gap needs an explanation.', 'Every charge in your statement should appear in the KFS or have your explicit consent.', 'Insurance should come with a policy document naming the insurer.', 'Penal charges should be listed in advance, not appear as extra interest.'] },
      { type: 'p', text: 'A difference is not automatically wrongdoing — it may be a charge you agreed to elsewhere, a timing difference or an error. Ask in writing first.' },
    ],
    questions: ['Please itemise all deductions from my disbursement.', 'Where is this charge disclosed in my KFS?'],
    sourceIds: ['rbi-rbc-banks-2025'],
    related: ['how-to-read-kfs', 'read-loan-statement'],
  },
  {
    slug: 'when-refinancing-makes-sense',
    title: 'When refinancing may make sense',
    summary: 'A meaningful rate gap, many years left, and low switching costs.',
    minutes: 3,
    category: 'repayment',
    body: [
      { type: 'list', items: ['The rate difference is meaningful (for home loans, often 0.5 percentage points or more).', 'A large balance and many years remain.', 'Total switching costs are recovered within a reasonable break-even period.', 'You keep a similar or shorter tenure.', 'Your current lender will not reprice.'] },
      { type: 'p', text: 'Refinancing may not help near the end of a loan, when most of the interest is already paid, or when costs are high relative to the balance.' },
    ],
    questions: ['What is the all-in cost of switching?', 'Will you reprice my existing loan?'],
    related: ['balance-transfer', 'negotiate-loan'],
  },
  {
    slug: 'when-prepayment-may-not-make-sense',
    title: 'When prepayment may not make sense',
    summary: 'Prepaying is a guaranteed return equal to your loan rate — but liquidity and other goals matter.',
    minutes: 3,
    category: 'repayment',
    body: [
      { type: 'list', items: ['You have no emergency fund — money prepaid is hard to get back.', 'You carry more expensive debt (credit cards, personal loans) — repay that first.', 'There is a prepayment charge that outweighs the interest saved.', 'The loan is nearly finished, so little interest remains.', 'You depend on a tax benefit linked to the loan (check current tax law).'] },
      { type: 'tip', text: 'The Savings Lab shows net savings after charges and the break-even month for each strategy.' },
    ],
    questions: ['What would it cost me to prepay today, including charges?'],
    related: ['part-prepayment', 'home-loan-tax'],
  },
  {
    slug: 'digital-loans',
    title: 'Loans through apps (digital lending)',
    summary: 'Know the actual lender, get the KFS, and use the cooling-off period if needed.',
    minutes: 3,
    category: 'rights',
    body: [
      { type: 'list', items: ['The app or agent (Lending Service Provider) must disclose which RBI-regulated lender is giving the loan.', 'You must get a KFS with the APR before you sign, and no charges beyond those disclosed.', 'There is a cooling-off period to exit by paying back the principal and proportionate APR.', 'Where an app shows offers from several lenders, the display should be unbiased, without dark patterns.'] },
    ],
    questions: ['Which regulated lender is giving this loan?', 'What is the APR, and what is the cooling-off period?'],
    sourceIds: ['rbi-digital-2025'],
    related: ['what-is-kfs', 'unexpected-charges'],
  },
  {
    slug: 'zero-cost-emi',
    title: '“0% EMI” and no-cost EMI',
    summary: 'Zero interest can still have a cost: processing fees, lost discounts or GST.',
    minutes: 3,
    category: 'charges',
    body: [
      { type: 'p', text: 'Electronics and consumer-durable EMIs are often advertised at 0%. Sometimes the interest is offset by a discount; sometimes there is a processing fee, or you give up a cash discount you would otherwise get.' },
      { type: 'example', title: '₹60,000 phone, 12 EMIs of ₹5,000', rows: [['Interest', '₹0'], ['Processing fee', '₹1,999'], ['Effective annualized cost', 'about 6.30%']] },
      { type: 'tip', text: 'Ask the price if you pay in full today. If it is lower, the “0%” EMI has a cost equal to that difference.' },
    ],
    questions: ['Is there a processing fee?', 'Is there a lower price if I pay upfront?'],
    related: ['processing-fee-and-gst', 'real-cost-of-a-loan'],
  },
  {
    slug: 'home-loan-tax',
    title: 'Home loan tax benefits — what to check',
    summary: 'Tax benefits can lower your post-tax cost, but they depend on the tax regime and current law.',
    minutes: 3,
    category: 'basics',
    body: [
      { type: 'p', text: 'Under the Income-tax Act, 1961 (up to tax year 2025-26), home loan borrowers using the old regime could claim interest on a self-occupied house under section 24(b) and principal repayment within the section 80C limit. The new (default) regime generally does not allow these for a self-occupied house.' },
      { type: 'p', text: 'From 1 April 2026 the Income-tax Act, 2025 replaced the 1961 Act, with new section numbers. Check the Income Tax Department’s current guidance, or a tax professional, for your situation.' },
      { type: 'tip', text: 'Our effective-cost calculation is before tax. We do not model tax benefits because they depend on your regime, income and property status.' },
    ],
    questions: ['Can you provide an interest and principal certificate for the year?'],
    sourceIds: ['itd-new-act-2025'],
    related: ['when-prepayment-may-not-make-sense'],
  },
]

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug)
}
