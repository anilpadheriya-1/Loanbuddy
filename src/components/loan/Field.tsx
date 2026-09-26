import * as React from 'react'
import { HelpCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface FieldProps {
  id: string
  label: React.ReactNode
  /** Longer explanation in a "What is this?" popover. */
  help?: React.ReactNode
  /** Short hint always visible under the input. */
  hint?: React.ReactNode
  error?: string
  optional?: boolean
  className?: string
  /** For groups (radio chips) use a fieldset/legend instead of a label. */
  as?: 'label' | 'fieldset'
  children: (ids: { id: string; describedBy: string | undefined; labelId: string }) => React.ReactNode
}

/** Consistent label + help + hint + error wiring, with aria-describedby. */
export function Field({ id, label, help, hint, error, optional, className, as = 'label', children }: FieldProps) {
  const { t } = useI18n()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const labelId = `${id}-label`

  const labelRow = (
    <div className="flex items-start justify-between gap-2">
      {as === 'label' ? (
        <Label htmlFor={id} id={labelId} className="pt-0.5">
          {label}
          {optional && <span className="ml-1 font-normal text-muted-foreground">({t('common.optional')})</span>}
        </Label>
      ) : (
        <legend id={labelId} className="pt-0.5 text-sm font-medium leading-snug">
          {label}
          {optional && <span className="ml-1 font-normal text-muted-foreground">({t('common.optional')})</span>}
        </legend>
      )}
      {help && <HelpButton label={typeof label === 'string' ? label : t('common.whatIsThis')}>{help}</HelpButton>}
    </div>
  )
  const body = (
    <>
      {labelRow}
      {children({ id, describedBy, labelId })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </>
  )
  if (as === 'fieldset') return <fieldset className={cn('min-w-0 space-y-2', className)}>{body}</fieldset>
  return <div className={cn('min-w-0 space-y-2', className)}>{body}</div>
}

export function HelpButton({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useI18n()
  return (
    <Popover>
      <PopoverTrigger
        className="-my-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`${t('common.whatIsThis')} ${label}`}
      >
        <HelpCircle className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent>{children}</PopoverContent>
    </Popover>
  )
}
