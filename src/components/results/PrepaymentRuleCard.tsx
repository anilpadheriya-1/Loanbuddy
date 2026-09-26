import { Link } from 'react-router'
import { CheckCircle2, HelpCircle, Scale } from 'lucide-react'
import type { PrepaymentRuleResult } from '@/lib/finance'
import { useI18n, type TKey } from '@/lib/i18n'
import { sourceById } from '@/content/sources'
import { cn } from '@/lib/utils'

const ICONS = { 'likely-no-charge': CheckCircle2, 'lender-policy': Scale, 'cannot-determine': HelpCircle }
const TONES = {
  'likely-no-charge': 'border-savings/30 bg-savings-soft',
  'lender-policy': 'border-border bg-muted/60',
  'cannot-determine': 'border-warning/30 bg-warning-soft',
}

export function PrepaymentRuleCard({ rule, className }: { rule: PrepaymentRuleResult; className?: string }) {
  const { t } = useI18n()
  const Icon = ICONS[rule.status]
  return (
    <div className={cn('rounded-lg border p-4 text-sm', TONES[rule.status], className)}>
      <p className="flex items-center gap-2 font-semibold">
        <Icon className="size-5 shrink-0" aria-hidden />
        {t('rule.prepayTitle')}: {t(`rule.status.${rule.status}` as TKey)}
      </p>
      <p className="mt-2">{t(`rule.reason.${rule.reason}` as TKey)}</p>
      <p className="mt-2 text-xs text-muted-foreground">{t('rule.disclaimer')}</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {rule.sourceIds.map((id) => {
          const s = sourceById(id)
          return s ? (
            <li key={id}>
              <Link to={`/rules#${id}`} className="text-brand underline-offset-2 hover:underline">
                {s.title.length > 70 ? `${s.title.slice(0, 67)}…` : s.title}
              </Link>
            </li>
          ) : null
        })}
      </ul>
    </div>
  )
}
