import type { LoanReport } from '@/lib/finance'
import { formatINR, formatPct, formatPp } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Compact live preview of the headline numbers while filling the wizard. */
export function LiveEstimate({ report, className }: { report: LoanReport | null; className?: string }) {
  const { t } = useI18n()
  const a = report?.analysis
  const ok = a && a.status === 'ok' && a.effective
  return (
    <aside className={cn('rounded-xl border bg-card p-4 shadow-xs', className)} aria-live="polite" aria-label={t('wizard.liveTitle')}>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('wizard.liveTitle')}</p>
      {!ok ? (
        <p className="mt-2 text-sm text-muted-foreground">{t('wizard.liveNeedMore')}</p>
      ) : (
        <dl className="mt-3 space-y-3">
          <div>
            <dt className="text-xs text-muted-foreground">{t('results.effectiveLabel')}</dt>
            <dd className="num text-3xl font-bold text-primary">{formatPct(a.effective!.aprStylePct)}</dd>
            {a.quotedRatePct !== null && a.differencePp !== null && (
              <dd className="num text-sm text-muted-foreground">
                {t('results.quoted')} {formatPct(a.quotedRatePct)} · <span className={a.differencePp > 0.25 ? 'font-semibold text-warning' : ''}>{formatPp(a.differencePp, 2, t('common.ppShort'))}</span>
              </dd>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t('results.netReceived')}</dt>
              <dd className="num font-semibold">{formatINR(a.netReceived)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('results.emi')}</dt>
              <dd className="num font-semibold">
                {formatINR(a.emi)}
                {a.emiDerived && <span className="ml-1 text-xs font-normal text-muted-foreground">({t('results.derived')})</span>}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">{t('results.totalRepayment')}</dt>
              <dd className="num font-semibold">{formatINR(a.totals.totalRepayment)}</dd>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('wizard.liveNote')}</p>
        </dl>
      )}
    </aside>
  )
}
