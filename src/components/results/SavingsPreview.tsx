import { Link } from 'react-router'
import { PiggyBank } from 'lucide-react'
import type { LoanReport } from '@/lib/finance'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/lib/format'
import { useI18n } from '@/lib/i18n'

export function SavingsPreview({ preview }: { preview: NonNullable<LoanReport['savingsPreview']> }) {
  const { t } = useI18n()
  const items = [
    { title: t('save.extra', { amount: formatINR(preview.extraMonthly.amount) }), r: preview.extraMonthly.result },
    { title: t('save.lump', { amount: formatINR(preview.lumpSum.amount) }), r: preview.lumpSum.result },
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(({ title, r }) => (
          <div key={title} className="rounded-lg border border-savings/30 bg-savings-soft p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <PiggyBank className="size-4 text-savings" aria-hidden /> {title}
            </p>
            <p className="mt-2">
              <span className="num text-lg font-bold text-savings">{t('save.saves', { amount: formatINR(r.interestSaved) })}</span>
            </p>
            {r.periodsSaved > 0 && <p className="text-muted-foreground">{t('save.months', { n: r.periodsSaved })}</p>}
            {r.strategyCosts > 0 && <p className="text-muted-foreground">{t('save.net', { amount: formatINR(r.netSavings) })}</p>}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t('save.note')}</p>
      <Button asChild variant="outline" className="no-print">
        <Link to="/savings">{t('save.cta')}</Link>
      </Button>
    </div>
  )
}
