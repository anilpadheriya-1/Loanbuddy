import * as React from 'react'
import { RadioGroup } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * A row of large, tappable radio "chips" — used for short choices like
 * Yes / No / Don't know. Keyboard: arrow keys move between options.
 */
export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  description?: React.ReactNode
}

export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  columns,
  ...props
}: {
  value: T
  onValueChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
  columns?: 2 | 3 | 4
  'aria-label'?: string
  'aria-labelledby'?: string
  id?: string
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      className={cn(
        'grid gap-2',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-2 sm:grid-cols-3',
        columns === 4 && 'grid-cols-2 sm:grid-cols-4',
        !columns && 'flex flex-wrap',
        className,
      )}
      {...props}
    >
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          className="min-h-11 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent data-[state=checked]:border-primary data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground data-[state=checked]:ring-1 data-[state=checked]:ring-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-card"
            >
              <RadioGroup.Indicator className="size-2 rounded-full bg-primary" />
            </span>
            <span>{o.label}</span>
          </span>
          {o.description && <span className="mt-0.5 block pl-6 text-xs font-normal text-muted-foreground">{o.description}</span>}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
