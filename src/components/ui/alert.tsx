import * as React from 'react'
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Status box. Always icon + text, never colour alone. */
export type AlertTone = 'info' | 'warning' | 'success' | 'danger'

const TONES: Record<AlertTone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'border-brand/25 bg-info-soft', Icon: Info },
  warning: { cls: 'border-warning/30 bg-warning-soft', Icon: AlertTriangle },
  success: { cls: 'border-savings/30 bg-savings-soft', Icon: CheckCircle2 },
  danger: { cls: 'border-danger/30 bg-danger-soft', Icon: OctagonAlert },
}
const ICON_COLOR: Record<AlertTone, string> = {
  info: 'text-brand',
  warning: 'text-warning',
  success: 'text-savings',
  danger: 'text-danger',
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  role,
}: {
  tone?: AlertTone
  title?: React.ReactNode
  children?: React.ReactNode
  className?: string
  role?: 'status' | 'alert'
}) {
  const { cls, Icon } = TONES[tone]
  return (
    <div role={role} className={cn('flex gap-3 rounded-lg border p-3 text-sm sm:p-4', cls, className)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', ICON_COLOR[tone])} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children && <div className="text-foreground/85">{children}</div>}
      </div>
    </div>
  )
}
