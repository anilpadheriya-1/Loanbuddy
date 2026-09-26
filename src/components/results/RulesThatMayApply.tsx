import { Link } from 'react-router'
import type { LoanReport } from '@/lib/finance'
import { useI18n, type TKey } from '@/lib/i18n'
import { PrepaymentRuleCard } from './PrepaymentRuleCard'

const CARDS: { title: TKey; body: TKey; source: string }[] = [
  { title: 'rule.kfsTitle', body: 'rule.kfsBody', source: 'rbi-rbc-banks-2025' },
  { title: 'rule.penalTitle', body: 'rule.penalBody', source: 'rbi-penal-2023' },
  { title: 'rule.gstTitle', body: 'rule.gstBody', source: 'cbic-exemption-2017' },
  { title: 'rule.grievanceTitle', body: 'rule.grievanceBody', source: 'rbi-ios-2026' },
]

export function RulesThatMayApply({ report }: { report: LoanReport }) {
  const { t } = useI18n()
  return (
    <div className="space-y-4">
      <PrepaymentRuleCard rule={report.prepaymentRule} />
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <div key={c.title} className="rounded-lg border bg-background/60 p-4 text-sm">
            <p className="font-semibold">{t(c.title)}</p>
            <p className="mt-1 text-muted-foreground">{t(c.body)}</p>
            <Link to={`/rules#${c.source}`} className="mt-2 inline-block text-xs text-brand underline-offset-2 hover:underline">
              {t('rule.viewSources')}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
