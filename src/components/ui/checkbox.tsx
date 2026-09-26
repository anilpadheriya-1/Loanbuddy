import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer size-5 shrink-0 rounded-[5px] border border-input bg-card shadow-xs data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
