import type { ChargeGroup, LoanAnalysis } from '@/lib/finance'
import { formatINR, formatPct } from '@/lib/format'
import { useI18n, type TKey } from '@/lib/i18n'
import { Alert } from '@/components/ui/alert'

const GROUPS: (ChargeGroup | 'unitemised')[] = ['processing', 'gst', 'insurance', 'documentation-legal', 'intermediary', 'interest-like', 'other', 'unitemised']

export function CostBreakdown({ analysis: a }: { analysis: LoanAnalysis }) {
  const { t } = useI18n()
  const g = a.totals.upfrontByGroup
  const rows: { label: string; value: string; strong?: boolean; muted?: boolean }[] = [
    { label: t('breakdown.principal'), value: formatINR(a.principal) },
    { label: t('breakdown.received'), value: formatINR(a.netReceived), muted: true },
    { label: t('breakdown.interest'), value: formatINR(a.totals.totalInterest) },
    ...GROUPS.filter((k) => g[k] > 0).map((k) => ({ label: t(`breakdown.${k}` as TKey), value: formatINR(g[k]) })),
    ...(a.totals.recurringTotal > 0 ? [{ label: t('breakdown.recurring'), value: formatINR(a.totals.recurringTotal) }] : []),
    { label: t('breakdown.totalRepayment'), value: formatINR(a.totals.totalRepayment), strong: true },
    { label: t('breakdown.totalCost'), value: formatINR(a.totals.totalCost), strong: true },
    { label: t('breakdown.costPct'), value: formatPct(a.totals.costPctOfNet, 1) },
    { label: t('breakdown.effective'), value: a.effective ? formatPct(a.effective.aprStylePct) : '—', strong: true },
    { label: t('breakdown.ear'), value: a.effective ? formatPct(a.effective.effectiveAnnualPct) : '—', muted: true },
  ]

  return (
    <div className="space-y-6">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('results.s3')}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b last:border-b-0">
              <th scope="row" className={`py-2 pr-3 text-left font-normal ${r.muted ? 'text-muted-foreground' : ''} ${r.strong ? 'font-semibold' : ''}`}>
                {r.label}
              </th>
              <td className={`num py-2 text-right ${r.strong ? 'font-bold' : ''}`}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {a.charges.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t('breakdown.chargeTable')}</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">{t('breakdown.col.charge')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('breakdown.col.amount')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('breakdown.col.paid')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('charges.gst')}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{t('breakdown.col.mandatory')}</th>
                </tr>
              </thead>
              <tbody>
                {a.charges.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="num px-3 py-2 text-right">
                      {c.amount === null ? <span className="text-warning">{t('common.unknown')}</span> : formatINR(c.amount + c.gstAmount)}
                    </td>
                    <td className="px-3 py-2">
                      {t(`payment.${c.payment}` as TKey)}
                      {c.paymentAssumed && <span className="text-xs text-muted-foreground"> ({t('common.estimated')})</span>}
                    </td>
                    <td className="px-3 py-2">{c.gstUnknown ? t('common.unknown') : c.gstAmount > 0 ? formatINR(c.gstAmount) : '—'}</td>
                    <td className="px-3 py-2">{c.mandatory === 'yes' ? t('common.yes') : c.mandatory === 'no' ? t('common.no') : t('common.dontKnow')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {a.contingent.length > 0 && (
        <Alert tone="info" title={t('breakdown.contingentTitle')}>
          <p>{t('breakdown.contingentNote')}</p>
          <ul className="mt-2 space-y-1">
            {a.contingent.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span>{c.name}</span>
                <span className="num font-medium">
                  {c.amount.kind === 'known' ? `${formatINR(c.amount.value)} ${t('breakdown.perEvent')}` : t('common.unknown')}
                </span>
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  )
}
