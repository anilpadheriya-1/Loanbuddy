import { useI18n } from '@/lib/i18n'

export function PageLoading() {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground" role="status" aria-live="polite">
      {t('common.loading')}
    </div>
  )
}
