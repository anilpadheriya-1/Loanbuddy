import { Check } from 'lucide-react'
import { useI18n, type TKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export const STEP_KEYS = ['loan', 'interest', 'charges', 'repayment', 'prepayment', 'results'] as const
export type WizardStep = (typeof STEP_KEYS)[number]

export function StepProgress({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  const { t } = useI18n()
  return (
    <nav aria-label={t('wizard.stepsNav')} className="no-print">
      <ol className="flex gap-1 overflow-x-auto pb-1 sm:gap-2">
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
                  'group flex w-full min-w-12 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring sm:flex-row sm:gap-2 sm:px-2 sm:text-sm',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    active && 'border-primary bg-primary text-primary-foreground',
                    done && 'border-savings bg-savings-soft text-savings',
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span className="truncate">{t(`wizard.steps.${key}` as TKey)}</span>
                <span className="sr-only">{done ? `(${t('wizard.completed')})` : active ? `(${t('wizard.current')})` : ''}</span>
              </button>
              <div className={cn('mx-auto mt-1 h-1 w-full rounded-full', done || active ? 'bg-primary' : 'bg-muted')} aria-hidden />
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
