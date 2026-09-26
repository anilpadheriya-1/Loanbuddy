import type { AttributionStep } from '@/lib/finance'
import { formatINR, formatPct, formatPp } from '@/lib/format'
import { useI18n } from '@/lib/i18n'

/**
 * "Why is the cost different?" — a horizontal waterfall.
 * Start (quoted rate) and end (effective cost) are full bars in slot 1; each
 * step is a floating bar from the previous rate to the next (slot 2 when it
 * adds cost, slot 3 when it lowers it). Every step is labelled with its value,
 * so colour never carries meaning alone, and the list doubles as the table view.
 */
export function Waterfall({ steps, effective }: { steps: AttributionStep[]; effective: number }) {
  const { t, tx } = useI18n()
  if (steps.length === 0) return null
  const rates = [0, ...steps.map((s) => s.ratePct), effective]
  const max = Math.max(...rates) * 1.08 || 1
  const min = Math.min(0, ...rates)
  const scale = (v: number) => ((v - min) / (max - min)) * 100

  const rows = [
    ...steps.map((s, i) => {
      const prev = i === 0 ? 0 : steps[i - 1].ratePct
      const start = i === 0 ? 0 : prev
      return { key: s.key, label: tx(`attr.${s.key}`), from: start, to: s.ratePct, delta: s.deltaPp, amount: s.amount, total: i === 0 }
    }),
    { key: 'effective', label: t('attr.effective'), from: 0, to: effective, delta: effective, amount: undefined, total: true },
  ]

  return (
    <div>
      <ol className="space-y-2" aria-label={t('results.s2Chart')}>
        {rows.map((r) => {
          const lo = Math.min(r.from, r.to)
          const hi = Math.max(r.from, r.to)
          const up = r.to >= r.from
          const color = r.total ? 'var(--chart-1)' : up ? 'var(--chart-2)' : 'var(--chart-3)'
          return (
            <li key={r.key} className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(10rem,16rem)_1fr_auto] sm:items-center sm:gap-3">
              <div className="flex items-baseline justify-between gap-2 text-sm sm:block">
                <span className={r.total ? 'font-semibold' : ''}>{r.label}</span>
                {r.amount ? <span className="num ml-1 text-xs text-muted-foreground">{formatINR(r.amount)}</span> : null}
              </div>
              <div className="relative h-6 rounded bg-muted/60" aria-hidden>
                <div
                  className="absolute inset-y-0.5 rounded-[4px]"
                  style={{ left: `${scale(lo)}%`, width: `max(3px, ${scale(hi) - scale(lo)}%)`, background: color }}
                />
              </div>
              <div className="num text-right text-sm font-semibold sm:min-w-24">
                {r.total ? formatPct(r.to) : formatPp(r.delta, 2, t('common.ppShort'))}
              </div>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Key color="var(--chart-1)" label={`${t('attr.quoted')} / ${t('attr.effective')}`} />
        <Key color="var(--chart-2)" label="+ pp" />
        <Key color="var(--chart-3)" label="− pp" />
      </p>
    </div>
  )
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block size-3 rounded-[3px]" style={{ background: color }} aria-hidden />
      {label}
    </span>
  )
}
