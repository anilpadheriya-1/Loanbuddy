import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Disclaimer } from '@/components/layout/Disclaimer'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { SOURCES, SOURCES_LAST_VERIFIED, TOPIC_LABELS, type SourceStatus } from '@/content/sources'
import { LENDER_LIBRARY } from '@/content/lender-library'
import { formatDate } from '@/lib/format'

const STATUS: Record<SourceStatus, { label: string; variant: 'success' | 'info' | 'danger' | 'warning' }> = {
  current: { label: 'Current', variant: 'success' },
  consolidated: { label: 'Consolidated into newer Directions', variant: 'info' },
  historical: { label: 'HISTORICAL — NOT CURRENT RULE', variant: 'danger' },
  verify: { label: 'Verify current applicability', variant: 'warning' },
}

export default function RulesPage() {
  usePageTitle('Rules & Sources', 'Official RBI, CBIC and CIBIL sources behind Loan Reality India, with dates and status.')
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10" lang="en">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Rules & Sources</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          The official documents our explanations are based on, with plain-English summaries. Summaries are simplified — the linked document is what counts.
        </p>
        <p className="mt-3">
          <Badge variant="muted">Last verified: {formatDate(SOURCES_LAST_VERIFIED)}</Badge>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          “Last verified” is the date of our source review, not a promise that the rules have not changed since. Current applicability should always be verified against the
          lender’s latest KFS, loan agreement and applicable RBI directions.
        </p>
      </header>

      <Alert tone="info" title="Four different numbers — don’t mix them up">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Quoted interest rate</strong> — the rate the lender tells you.
          </li>
          <li>
            <strong>Estimated effective annualized cost</strong> — our calculation from the cash flows you enter (same IRR convention as RBI’s KFS illustration).
          </li>
          <li>
            <strong>APR in the KFS</strong> — the lender’s official figure under RBI rules. Ask for it.
          </li>
          <li>
            <strong>Loan Deal Score</strong> — our 0–100 cost/transparency score for one loan. Not a credit score, not CIBIL, not a lender rating.
          </li>
        </ul>
      </Alert>

      <ul className="space-y-4">
        {SOURCES.map((s) => {
          const st = STATUS[s.status]
          return (
            <li key={s.id} id={s.id} className="scroll-mt-20 rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={st.variant}>{st.label}</Badge>
                <Badge variant="outline">{s.regulator}</Badge>
                {s.topics.map((tp) => (
                  <Badge key={tp} variant="muted">
                    {TOPIC_LABELS[tp]}
                  </Badge>
                ))}
              </div>
              <h2 className="mt-3 font-semibold">{s.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.reference && <>{s.reference} · </>}Dated {formatDate(s.date)}
                {s.effective && <> · Effective {formatDate(s.effective)}</>} · Last verified {formatDate(s.lastVerified)}
              </p>
              {s.statusNote && <p className="mt-2 text-sm font-medium">{s.statusNote}</p>}
              <p className="mt-2 text-sm">{s.summary}</p>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-brand hover:underline">
                Official source <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          )
        })}
      </ul>

      <section className="rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="library">
        <h2 id="library" className="text-lg font-semibold">
          Lender rate library
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We do not publish lender rates yet. Published rates change often, and a stale or unverified rate would mislead. When we add entries, each will show its official source,
          source date and verification date, and will be labelled VERIFIED, UNVERIFIED, USER-ENTERED or HISTORICAL. Until then, compare the offers you actually received in Compare Loans.
        </p>
        <p className="mt-2 text-sm">Verified entries: {LENDER_LIBRARY.length}</p>
      </section>
      <Disclaimer />
    </div>
  )
}
