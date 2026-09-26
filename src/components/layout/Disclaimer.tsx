import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function Disclaimer({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <div className={cn('rounded-lg border bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground', className)} role="note">
      <p className="mb-1 font-semibold text-foreground">{t('footer.disclaimerTitle')}</p>
      <p>{t('footer.disclaimer')}</p>
    </div>
  )
}
