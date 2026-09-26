import type { ExistingLoanResult } from '@/lib/finance'
import { formatINR } from '@/lib/format'
import { useI18n } from '@/lib/i18n'

export function ExistingLoanCard({ existing: e }: { existing: ExistingLoanResult }) {
  const { t } = useI18n()
  if (e.status !== 'ok' || !e.state || !e.closure) return <p className="text-sm text-muted-foreground">{t('existing.missing')}</p>
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-background/60 p-3">
          <dt className="text-xs text-muted-foreground">{t('existing.outstanding')}</dt>
          <dd className="num text-lg font-bold">{formatINR(e.state.outstanding)}</dd>
        </div>
        <div className="rounded-lg border bg-background/60 p-3">
          <dt className="text-xs text-muted-foreground">{t('existing.remaining')}</dt>
          <dd className="num text-lg font-bold">{e.state.remainingPeriods}</dd>
        </div>
        <div className="rounded-lg border bg-background/60 p-3">
          <dt className="text-xs text-muted-foreground">{t('existing.remainingInterest')}</dt>
          <dd className="num text-lg font-bold">{formatINR(e.remainingInterest)}</dd>
        </div>
      </dl>
      {(e.outstandingDerived || e.remainingDerived) && <p className="text-xs text-muted-foreground">{t('existing.derived')}</p>}
      <p className="font-semibold">{t('existing.closeNow', { amount: formatINR(e.closure.payoff) })}</p>
      <p>{e.closure.netSavings > 0 ? t('existing.closeSaves', { amount: formatINR(e.closure.netSavings) }) : t('existing.closeCosts')}</p>
      {e.samplePrepayment && (
        <p>
          {t('existing.partPrepay', {
            amount: formatINR(e.sampleAmount),
            saved: formatINR(e.samplePrepayment.netSavings),
            n: e.samplePrepayment.periodsSaved,
          })}
        </p>
      )}
    </div>
  )
}
