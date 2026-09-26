import { useState } from 'react'
import { Link } from 'react-router'
import { ExternalLink } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert } from '@/components/ui/alert'
import { Disclaimer } from '@/components/layout/Disclaimer'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { GRIEVANCE_CHECKLIST } from '@/content/checklists'

export default function HelpPage() {
  usePageTitle('Something doesn’t look right?')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const unchecked = GRIEVANCE_CHECKLIST.filter((i) => !checked[i.id])
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-10" lang="en">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Something doesn’t look right?</h1>
        <p className="mt-2 text-muted-foreground">
          A calm, step-by-step check. A difference in numbers is not automatically wrongdoing — it may be a charge you agreed to elsewhere, a timing difference or an error. Start by
          getting the facts.
        </p>
      </header>

      <section aria-labelledby="check" className="rounded-xl border bg-card p-4 sm:p-6">
        <h2 id="check" className="text-lg font-semibold">
          1. Check the basics
        </h2>
        <ul className="mt-4 space-y-2">
          {GRIEVANCE_CHECKLIST.map((item) => (
            <li key={item.id}>
              <label className="flex min-h-11 cursor-pointer gap-3 rounded-lg border bg-background/60 p-3 hover:bg-accent">
                <Checkbox className="mt-0.5" checked={!!checked[item.id]} onCheckedChange={(c) => setChecked((s) => ({ ...s, [item.id]: c === true }))} />
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.help}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {unchecked.length > 0 && Object.keys(checked).length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">{unchecked.length} item(s) still to confirm — these are good things to ask about in writing.</p>
        )}
      </section>

      <section aria-labelledby="lender" className="rounded-xl border bg-card p-4 sm:p-6">
        <h2 id="lender" className="text-lg font-semibold">
          2. Contact the lender’s grievance mechanism first
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>Write to the lender’s customer care and, if needed, its Grievance Redressal Officer (details are in the KFS and on the lender’s website).</li>
          <li>Be specific: loan account number, the amount or charge in question, the date, and what you expected (attach the KFS page or statement).</li>
          <li>
            Use the questions from your{' '}
            <Link to="/check-loan/results" className="text-brand underline">
              Loan Cost Report
            </Link>
            . Keep copies of everything.
          </li>
          <li>Never share OTPs, passwords or card details with anyone claiming to help with a complaint.</li>
        </ul>
      </section>

      <section aria-labelledby="escalate" className="rounded-xl border bg-card p-4 sm:p-6">
        <h2 id="escalate" className="text-lg font-semibold">
          3. Escalation, where applicable
        </h2>
        <p className="mt-2 text-sm">
          If the lender rejects your complaint, does not resolve it, or does not reply within the time allowed, unresolved complaints about RBI-regulated entities may be escalated
          through RBI’s complaint mechanism under the Reserve Bank – Integrated Ombudsman Scheme, 2026 (in force from 1 July 2026), subject to its conditions.
        </p>
        <a href="https://cms.rbi.org.in/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-brand hover:underline">
          RBI Complaint Management System (cms.rbi.org.in) <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <p className="mt-2 text-xs text-muted-foreground">
          See{' '}
          <Link to="/rules#rbi-ios-2026" className="text-brand underline">
            Rules & Sources
          </Link>{' '}
          for the scheme details.
        </p>
      </section>

      <Alert tone="warning" title="No promises about outcomes">
        We can’t tell you whether a complaint will succeed, and this is not legal advice. For large amounts or disputes, consider speaking to a qualified professional.
      </Alert>
      <Disclaimer />
    </div>
  )
}
