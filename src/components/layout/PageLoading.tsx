import * as React from 'react'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

export function PageLoading() {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground" role="status" aria-live="polite">
      {t('common.loading')}
    </div>
  )
}

function LoadFailed() {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center" role="alert">
      <WifiOff className="mx-auto size-8 text-muted-foreground" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">{t('common.loadFailedTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('common.loadFailedBody')}</p>
      <Button className="mt-6" onClick={() => window.location.reload()}>
        {t('common.retry')}
      </Button>
    </div>
  )
}

/**
 * Pages are loaded on demand. If a page's code cannot be fetched (no network,
 * or a new version was deployed), show a calm retry screen instead of a blank app.
 * Reset on navigation via `key`.
 */
export class PageErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <LoadFailed /> : this.props.children
  }
}
