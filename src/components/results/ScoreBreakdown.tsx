import type { ConfidenceResult, LoanDealScore } from '@/lib/finance'
import { Progress } from '@/components/ui/progress'
import { renderMessage } from '@/lib/i18n/messages'
import { useI18n, type TKey } from '@/lib/i18n'
import { ScoreGauge } from './ScoreGauge'

export function ScoreBreakdown({ score, confidence }: { score: LoanDealScore; confidence: ConfidenceResult }) {
  const { t, lang } = useI18n()
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ScoreGauge score={score} />
        <div className="max-w-md space-y-1 text-sm">
          <p className="font-semibold">{t('score.not')}</p>
          <p className="text-muted-foreground">{t('score.what')}</p>
        </div>
      </div>
      {score.withheldReason && <p className="text-sm">{renderMessage('score.reason', score.withheldReason, lang)}</p>}
      {score.components.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">{t('score.howTitle')}</h3>
          <ul className="space-y-4">
            {score.components.map((c) => (
              <li key={c.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{t(`score.comp.${c.key}` as TKey)}</span>
                  <span className="num font-semibold">{t('score.points', { points: c.points, max: c.max })}</span>
                </div>
                <Progress value={(c.points / c.max) * 100} className="mt-1.5" aria-label={t(`score.comp.${c.key}` as TKey)} />
                <p className="mt-1 text-xs text-muted-foreground">{renderMessage('score.reason', c.reason, lang)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-lg border bg-background/60 p-4 text-sm">
        <p className="font-semibold">{t('results.confidenceTitle', { level: t(`confidence.${confidence.level}` as TKey) })}</p>
        <p className="mt-1 text-muted-foreground">{t('confidence.explain')}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {confidence.reasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-warning">{t('results.whatLowers')}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {confidence.reasons.map((r) => (
                  <li key={r.code}>{renderMessage('confidence.reason', r, lang)}</li>
                ))}
              </ul>
            </div>
          )}
          {confidence.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-savings">{t('results.whatSupports')}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {confidence.strengths.map((r) => (
                  <li key={r.code}>{renderMessage('confidence.strength', r, lang)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
