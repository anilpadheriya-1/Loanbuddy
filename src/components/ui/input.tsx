import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 py-2 text-base transition-colors duration-150 placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  )
}
