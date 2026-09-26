import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const count = (props.value ?? props.defaultValue ?? [0]).length
  return (
    <SliderPrimitive.Root className={cn('relative flex w-full touch-none items-center py-3 select-none data-[disabled]:opacity-50', className)} {...props}>
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-savings" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={props['aria-label']}
          className="block size-6 rounded-full border-2 border-savings bg-card shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      ))}
    </SliderPrimitive.Root>
  )
}
