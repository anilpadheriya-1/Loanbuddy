import { Link } from 'react-router'
import { Disclaimer } from '@/components/layout/Disclaimer'
import { usePageTitle } from '@/components/layout/usePageTitle'

export default function AboutPage() {
  usePageTitle('About')
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10" lang="en">
      <h1 className="text-2xl font-bold sm:text-3xl">About Loan Reality India</h1>
      <div className="space-y-4 text-[15px] leading-relaxed">
        <p>
          Most of us compare loans by the headline interest rate. But fees deducted upfront, insurance, GST on fees, advance EMIs and the way interest is calculated can make a loan
          cost noticeably more. Loan Reality India helps you see the whole picture — calmly, with your own numbers.
        </p>
        <h2 className="pt-2 text-lg font-semibold">What we do</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Rebuild your loan’s cash flows and estimate the effective annualized cost, using the same IRR convention RBI uses to illustrate APR in a KFS.</li>
          <li>Explain step by step why that number differs from the quoted rate.</li>
          <li>Show savings from prepaying, negotiating or transferring — including when they don’t pay off.</li>
          <li>Suggest specific questions to ask your lender, and point to the official rules.</li>
        </ul>
        <h2 className="pt-2 text-lg font-semibold">What we don’t do</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>We are not a lender, loan agent or marketplace. There is no “Apply Now”, and no lender pays us to be listed, ranked or recommended.</li>
          <li>We don’t rate lenders, and we never call a lender dishonest because of a calculation. A gap between the quoted rate and the effective cost usually has ordinary explanations.</li>
          <li>We don’t publish lender rates that we haven’t verified.</li>
          <li>We don’t collect PAN, Aadhaar, bank details or credit scores. See the <Link to="/privacy" className="text-brand underline">privacy note</Link>.</li>
        </ul>
        <h2 className="pt-2 text-lg font-semibold">How this is funded</h2>
        <p>
          The website is free and has no ads. The Android app is free and shows a small banner ad from Google when your phone is online. Google chooses the ads, not us, and an ad
          is never a recommendation. Ads never receive your loan numbers, and the calculator never changes its results for anyone. See the{' '}
          <Link to="/privacy" className="text-brand underline">
            privacy note
          </Link>
          .
        </p>
        <h2 className="pt-2 text-lg font-semibold">Accuracy</h2>
        <p>
          The calculation engine is tested against RBI’s own KFS illustration (₹20,000 at 15% for 24 months with ₹400 of fees → APR 17.07%) and many other cases. Still, results
          depend on what you enter and on timing and charge treatment. Treat them as estimates and verify with your KFS.
        </p>
        <h2 className="pt-2 text-lg font-semibold">Languages</h2>
        <p>
          The main calculator and report are available in English and Hindi. Guides and rules are in English for now; Gujarati is planned. If the Hindi and English text ever differ,
          the English text applies. Translation feedback is welcome.
        </p>
        <h2 className="pt-2 text-lg font-semibold">What’s next</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Reading KFS / sanction letters on your device (with your permission) instead of typing numbers.</li>
          <li>Anonymised, opt-in sharing of KFS data to build a verified picture of real loan costs.</li>
          <li>A multi-loan view, optional accounts to sync saved loans, and a WhatsApp version.</li>
        </ul>
      </div>
      <Disclaimer />
    </div>
  )
}
