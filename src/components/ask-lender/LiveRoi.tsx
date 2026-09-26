import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compareWithLenderApr, type LoanReport } from '@/lib/finance'
import { formatINR, formatPct, formatPp } from '@/lib/format'
import { useI18n, type TKey } from '@/lib/i18n'
import { ConfidenceBadge } from '@/components/results/ConfidenceBadge'
import { cn } from '@/lib/utils'

/** The live "real ROI" panel: updates on every change in the form. */
export function LiveRoi({
  report,
  lenderAprPct,
  received,
  total,
  className,
}: {
  report: LoanReport | null
  lenderAprPct: number | null
  received: number
  total: number
  className?: string
}) {
  const { t } = useI18n()
  const a = report?.analysis
  const ok = a && a.status === 'ok' && a.effective
  const cmp = ok && lenderAprPct !== null ? compareWithLenderApr(a.effective!.aprStylePct, lenderAprPct) : null
  return (
    <section aria-labelledby="roi-title" className={cn('rounded-2xl border-2 border-primary/15 bg-card p-5 shadow-sm', className)} aria-live="polite">
      <h2 id="roi-title" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {t('ask.roiTitle')}
      </h2>
      {!ok ? (
        <p className="mt-2 text-sm text-muted-foreground">{t('ask.roiNeed')}</p>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="num text-5xl font-bold tracking-tight text-primary">{formatPct(a.effective!.aprStylePct)}</p>
          <p className="text-xs text-muted-foreground">{t('ask.roiSub')}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t('results.quoted')}</dt>
              <dd className="num font-semibold">{a.quotedRatePct !== null ? formatPct(a.quotedRatePct) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('results.difference')}</dt>
              <dd className={cn('num font-semibold', (a.differencePp ?? 0) > 0.25 && 'text-warning')}>{formatPp(a.differencePp, 2, t('common.ppShort'))}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('results.netReceived')}</dt>
              <dd className="num font-semibold">{formatINR(a.netReceived)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('results.totalCost')}</dt>
              <dd className="num font-semibold">{formatINR(a.totals.totalCost)}</dd>
            </div>
          </dl>
          {cmp && (
            <p className={cn('rounded-lg p-3 text-sm', cmp.status === 'close' ? 'bg-savings-soft' : 'bg-warning-soft')}>
              {t(`ask.aprCompare.${cmp.status}` as TKey, { apr: formatPct(lenderAprPct), diff: Math.abs(cmp.differencePp).toFixed(2) })}
            </p>
          )}
          {report && <ConfidenceBadge level={report.confidence.level} />}
          <p className="text-xs text-muted-foreground">{t('results.notMisconduct')}</p>
        </div>
      )}
      <div className="mt-4 space-y-2 border-t pt-3">
        <p className="text-sm font-medium">{t('ask.progress', { done: received, total })}</p>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-savings" style={{ width: `${(received / total) * 100}%` }} />
        </div>
        {ok && received < total && <p className="text-xs text-muted-foreground">{t('ask.roiMissing', { count: total - received })}</p>}
        <Button asChild variant="brand" className="mt-2 w-full">
          <Link to="/check-loan/results">
            {t('ask.fullReport')} <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  )
}

/** Compact bar pinned to the bottom of the screen on phones. */
export function MobileRoiBar({ report }: { report: LoanReport | null }) {
  const { t } = useI18n()
  const a = report?.analysis
  const ok = a && a.status === 'ok' && a.effective
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 pt-2 pb-[calc(0.5rem+var(--safe-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
      <a href="#roi-title" className="flex items-center justify-between gap-3">
        <span className="shrink-0 text-sm font-medium whitespace-nowrap">{t('ask.mobileRoi')}</span>
        {ok ? (
          <span className="num text-right">
            <span className="text-2xl font-bold text-primary">{formatPct(a.effective!.aprStylePct)}</span>
            {a.quotedRatePct !== null && (
              <span className="ml-2 text-xs text-muted-foreground">
                {t('results.quoted')} {formatPct(a.quotedRatePct)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t('ask.roiNeed')}</span>
        )}
      </a>
    </div>
  )
}
