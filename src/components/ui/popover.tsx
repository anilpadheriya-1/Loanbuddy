import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { AdOverlaySignal } from './ad-overlay-signal'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({ className, align = 'start', sideOffset = 6, children, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          'z-50 w-[min(20rem,calc(100vw-2rem))] rounded-lg border bg-popover p-3 text-sm leading-relaxed text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0',
          className,
        )}
        {...props}
      >
        <AdOverlaySignal />
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}
