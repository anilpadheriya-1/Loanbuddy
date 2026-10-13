import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function Disclaimer({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <div className={cn('rounded-xl bg-muted/70 px-4 py-3 text-xs leading-relaxed text-muted-foreground', className)} role="note">
      <p>
        <span className="font-semibold text-foreground">{t('footer.disclaimerTitle')}: </span>
        {t('footer.disclaimer')}
      </p>
    </div>
  )
}
