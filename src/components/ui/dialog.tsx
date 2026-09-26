import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdOverlaySignal } from './ad-overlay-signal'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  side,
  closeLabel = 'Close',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: 'right' | 'center'; closeLabel?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-4 border bg-card p-5 shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0',
          side === 'right'
            ? 'inset-y-0 right-0 h-full w-[min(20rem,85vw)] rounded-l-xl data-[state=open]:slide-in-from-right'
            : 'top-1/2 left-1/2 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl',
          className,
        )}
        {...props}
      >
        <AdOverlaySignal />
        {children}
        <DialogPrimitive.Close
          className={cn(
            'absolute right-3 inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
            // The side sheet starts at the very top of the screen, so keep the button below the status bar.
            side === 'right' ? 'top-[calc(0.75rem+var(--safe-top))]' : 'top-3',
          )}
        >
          <X className="size-5" aria-hidden />
          <span className="sr-only">{closeLabel}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('pr-10 text-lg font-semibold', className)} {...props} />
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}
