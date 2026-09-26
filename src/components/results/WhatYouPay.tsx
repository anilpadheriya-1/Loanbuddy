import type { LoanAnalysis } from '@/lib/finance'
import { formatINR } from '@/lib/format'
import { useI18n } from '@/lib/i18n'

/**
 * Single stacked bar: what you pay back = money received + interest + charges.
 * Three validated categorical slots, 2px surface gaps, direct labels + legend,
 * and a hover/focus tooltip on each segment.
 */
export function WhatYouPay({ analysis: a }: { analysis: LoanAnalysis }) {
  const { t } = useI18n()
  const received = Math.max(0, a.netReceived)
  const charges = Math.max(0, a.totals.totalCost - Math.max(0, a.totals.totalInterest))
  const interest = Math.max(0, a.totals.totalCost - charges)
  const total = received + interest + charges
  if (!(total > 0)) return null
  const segs = [
    { key: 'received', label: t('results.legendReceived'), value: received, color: 'var(--chart-1)' },
    { key: 'interest', label: t('results.legendInterest'), value: interest, color: 'var(--chart-2)' },
    { key: 'charges', label: t('results.legendCharges'), value: charges, color: 'var(--chart-3)' },
  ].filter((s) => s.value > 0)
  const per100 = received > 0 ? (total / received) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t('results.s1Received')} value={formatINR(received)} />
        <Stat label={t('results.s1Repay')} value={formatINR(a.totals.totalRepayment)} />
        <Stat label={t('results.s1Extra')} value={formatINR(a.totals.totalCost)} emphasis />
      </div>
      <div className="flex h-10 w-full gap-[2px] rounded-md bg-card" role="img" aria-label={segs.map((s) => `${s.label}: ${formatINR(s.value)}`).join(', ')}>
        {segs.map((s, i) => (
          <div
            key={s.key}
            tabIndex={0}
            className="group relative h-full outline-none first:rounded-l-[4px] last:rounded-r-[4px] focus-visible:ring-2 focus-visible:ring-ring"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color, minWidth: 4, borderRadius: segs.length === 1 ? 4 : undefined }}
            aria-label={`${s.label}: ${formatINR(s.value)}`}
          >
            <span
              role="tooltip"
              className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow group-hover:block group-focus-visible:block ${i === segs.length - 1 ? 'right-0' : 'left-0'}`}
            >
              {s.label}: <span className="num font-semibold">{formatINR(s.value)}</span> ({((s.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {segs.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-[3px]" style={{ background: s.color }} aria-hidden />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="num font-semibold">{formatINR(s.value)}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm">{t('results.s1Explain', { per100: formatINR(per100) })}</p>
    </div>
  )
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`num text-xl font-bold ${emphasis ? 'text-warning' : ''}`}>{value}</p>
    </div>
  )
}
