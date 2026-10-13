import { Check } from 'lucide-react'
import { useI18n, type TKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export const STEP_KEYS = ['loan', 'interest', 'charges', 'repayment', 'prepayment', 'results'] as const
export type WizardStep = (typeof STEP_KEYS)[number]

export function StepProgress({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  const { t } = useI18n()
  return (
    <nav aria-label={t('wizard.stepsNav')} className="no-print">
      <ol className="flex gap-1.5">
        {STEP_KEYS.map((key, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={key} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'group flex min-h-11 w-full flex-col justify-end gap-2 rounded-md pb-1 text-left text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {/* On small screens names are for screen readers only (the current step is named below the bar). */}
                <span className="flex items-center gap-1 truncate max-sm:sr-only">
                  {done && <Check className="size-3.5 shrink-0 text-savings" aria-hidden />}
                  <span className="truncate">{t(`wizard.steps.${key}` as TKey)}</span>
                </span>
                <span className="sr-only">{done ? `(${t('wizard.completed')})` : active ? `(${t('wizard.current')})` : ''}</span>
                <span
                  className={cn('h-1.5 w-full rounded-full transition-colors duration-200', done ? 'bg-primary' : active ? 'bg-brand' : 'bg-muted group-hover:bg-border')}
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
