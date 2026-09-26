import type { Reconciliation } from '@/lib/finance'
import { Alert } from '@/components/ui/alert'
import { formatINR, formatPct } from '@/lib/format'
import { useI18n, type TKey } from '@/lib/i18n'

export function ReconcileAlert({ rec, n, quotedRate }: { rec: Reconciliation; n: number; quotedRate: number }) {
  const { t } = useI18n()
  if (rec.status === 'match') return null
  if (rec.status === 'matches-flat') {
    return (
      <Alert tone="warning" title={t('reconcile.flatTitle')} role="status">
        <p>{t('reconcile.flatBody', { rate: formatPct(quotedRate), flat: formatINR(rec.expectedFlatEmi, { paise: true }), reducing: formatINR(rec.expectedReducingEmi, { paise: true }) })}</p>
      </Alert>
    )
  }
  return (
    <Alert tone="warning" title={t('reconcile.title')} role="status">
      <p>
        {t('reconcile.body', {
          rate: formatPct(quotedRate),
          n,
          expected: formatINR(rec.expectedEmi, { paise: true }),
          entered: formatINR(rec.enteredEmi, { paise: true }),
          diff: formatINR(Math.abs(rec.difference), { paise: true }),
        })}
      </p>
      <p className="mt-2">{t('reconcile.question')}</p>
      <p className="mt-2 font-medium">{t('reconcile.reasonsTitle')}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {rec.possibleReasons.map((r) => (
          <li key={r}>{t(`reason.${r}` as TKey)}</li>
        ))}
      </ul>
    </Alert>
  )
}
