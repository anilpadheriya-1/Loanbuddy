import { ShieldAlert, ShieldCheck, ShieldHalf } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ConfidenceLevel } from '@/lib/finance'
import { useI18n, type TKey } from '@/lib/i18n'

const ICON = { high: ShieldCheck, medium: ShieldHalf, low: ShieldAlert }
const VARIANT = { high: 'success', medium: 'info', low: 'warning' } as const

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const { t } = useI18n()
  const Icon = ICON[level]
  return (
    <Badge variant={VARIANT[level]} className="text-sm">
      <Icon aria-hidden /> {t('results.confidence')}: {t(`confidence.${level}` as TKey)}
    </Badge>
  )
}
