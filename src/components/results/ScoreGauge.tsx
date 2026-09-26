import { useI18n, type TKey } from '@/lib/i18n'
import type { LoanDealScore } from '@/lib/finance'
import { cn } from '@/lib/utils'

const BAND_COLOR: Record<string, string> = {
  strong: 'text-savings',
  review: 'text-brand',
  attention: 'text-warning',
  'high-cost': 'text-danger',
}

/** Circular gauge for the Loan Deal Score. The number and band label are always shown as text. */
export function ScoreGauge({ score, size = 132 }: { score: LoanDealScore; size?: number }) {
  const { t } = useI18n()
  const r = 52
  const c = 2 * Math.PI * r
  const value = score.total ?? 0
  const dash = (value / 100) * c
  const color = score.band ? BAND_COLOR[score.band] : 'text-muted-foreground'
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={score.total === null ? t('score.withheld') : `${t('score.title')}: ${score.total} ${t('score.outOf')}`}>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        {score.total !== null && (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            transform="rotate(-90 60 60)"
            className={cn('stroke-current', color)}
          />
        )}
        <text x="60" y="58" textAnchor="middle" className="fill-foreground text-[30px] font-bold num">
          {score.total ?? '—'}
        </text>
        <text x="60" y="78" textAnchor="middle" className="fill-muted-foreground text-[11px]">
          {t('score.outOf')}
        </text>
      </svg>
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">{t('score.title')}</p>
        {score.band && <p className={cn('text-sm font-medium', color)}>{t(`score.band.${score.band}` as TKey)}</p>}
        {score.provisional && score.total !== null && <p className="text-xs font-semibold text-warning">{t('score.provisional')}</p>}
        {score.total === null && <p className="text-sm text-muted-foreground">{t('score.withheld')}</p>}
      </div>
    </div>
  )
}
