import * as React from 'react'
import type { ScenarioResult } from '@/lib/finance'
import { formatINR, formatMonths } from '@/lib/format'
import { cn } from '@/lib/utils'

export function months(n: number) {
  return formatMonths(n)
}

/** Standard before/after result grid used by every Savings Lab scenario. */
export function ScenarioOutcome({ r, periodsPerYear = 12, className }: { r: ScenarioResult; periodsPerYear?: number; className?: string }) {
  const fmtTenure = (n: number) => (periodsPerYear === 12 ? months(n) : `${n}`)
  const worth = r.netSavings > 0
  return (
    <div className={cn('space-y-3', className)} aria-live="polite">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Metric label="Current tenure" value={fmtTenure(r.baseline.periodsUsed)} />
        <Metric label="New tenure" value={fmtTenure(r.newTenure)} />
        <Metric label="New EMI" value={formatINR(r.newEmi)} />
        <Metric label="Interest without change" value={formatINR(r.baseline.totalInterest)} />
        <Metric label="Interest with change" value={formatINR(r.scenario.totalInterest)} />
        <Metric label="Charges caused" value={formatINR(r.strategyCosts)} />
      </dl>
      <div className={cn('grid gap-3 rounded-lg p-4 sm:grid-cols-3', worth ? 'bg-savings-soft' : 'bg-warning-soft')}>
        <Big label="Interest saved" value={formatINR(r.interestSaved)} tone={worth ? 'text-savings' : ''} />
        <Big label="Finish earlier by" value={r.periodsSaved > 0 ? fmtTenure(r.periodsSaved) : '—'} />
        <Big label="Net savings (after charges)" value={formatINR(r.netSavings)} tone={worth ? 'text-savings' : 'text-warning'} />
      </div>
      {r.strategyCosts > 0 && (
        <p className="text-sm text-muted-foreground">
          {r.breakEvenPeriod ? `Break-even: the interest saved covers the charges after about ${fmtTenure(r.breakEvenPeriod)}.` : 'The interest saved never covers the charges — this strategy costs more than it saves.'}
        </p>
      )}
    </div>
  )
}

export function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  )
}

export function Big({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('num text-xl font-bold', tone)}>{value}</p>
    </div>
  )
}

export function LabCard({ id, title, description, children, notWorth }: { id: string; title: string; description?: string; children: React.ReactNode; notWorth?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-20 rounded-xl border bg-card p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-t`} className="text-lg font-semibold">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
      {notWorth && (
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">When it may not be worth it: </span>
          {notWorth}
        </p>
      )}
    </section>
  )
}
