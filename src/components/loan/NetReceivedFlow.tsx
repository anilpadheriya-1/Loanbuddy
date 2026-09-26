import { ArrowDown, Minus } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { chargeBase, chargeRupees, type LoanDraft } from '@/features/check-loan/draft'
import { cn } from '@/lib/utils'

/**
 * The most important picture in the app: Loan amount → minus deductions → net received.
 * Pure display; numbers come from the draft (no financial maths beyond addition).
 */
export function netFlowNumbers(draft: LoanDraft, emi?: number) {
  const base = chargeBase(draft)
  let deducted = 0
  let unknownCount = 0
  for (const c of draft.charges) {
    const amount = chargeRupees(c, base)
    if (amount === null) {
      unknownCount++
      continue
    }
    if (c.payment === 'deducted' || c.payment === 'unknown') {
      deducted += amount
      if (c.gst === 'additional' && c.gstAmount.value !== null && !c.gstAmount.unknown) deducted += c.gstAmount.value
    }
  }
  if (draft.advanceEmiCount > 0 && draft.advanceEmiPayment === 'deducted' && emi) deducted += draft.advanceEmiCount * emi
  const expected = base - deducted
  const entered = !draft.netReceived.unknown && draft.netReceived.value !== null ? draft.netReceived.value : null
  return { base, deducted, expected, entered, unknownCount }
}

export function NetReceivedFlow({ draft, emi, className, compact }: { draft: LoanDraft; emi?: number; className?: string; compact?: boolean }) {
  const { t } = useI18n()
  const { base, deducted, expected, entered, unknownCount } = netFlowNumbers(draft, emi)
  if (!(base > 0)) return null
  const shown = entered ?? expected
  const mismatch = entered !== null && Math.abs(entered - expected) > 1

  return (
    <div className={cn('rounded-xl border-2 border-primary/15 bg-card p-4', className)} aria-live="polite">
      <dl className="space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-muted-foreground">{t('flow.sanctioned')}</dt>
          <dd className="num text-lg font-semibold">{formatINR(base)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-warning">
          <dt className="flex items-center gap-1 text-sm">
            <Minus className="size-3.5" aria-hidden /> {t('flow.deductions')}
          </dt>
          <dd className="num text-lg font-semibold">{formatINR(deducted)}</dd>
        </div>
        <div className="flex justify-center py-0.5 text-muted-foreground" aria-hidden>
          <ArrowDown className="size-4" />
        </div>
        <div className="flex items-baseline justify-between gap-3 rounded-lg bg-accent px-3 py-2">
          <dt className="text-sm font-semibold">{t('flow.net')}</dt>
          <dd className="num text-2xl font-bold text-primary">{formatINR(shown)}</dd>
        </div>
      </dl>
      {!compact && <p className="mt-3 text-xs text-muted-foreground">{t('flow.explain')}</p>}
      {unknownCount > 0 && <p className="mt-2 text-xs font-medium text-warning">{t('flow.unknownCharges', { count: unknownCount })}</p>}
      {mismatch && (
        <p className="mt-2 text-xs font-medium text-warning">
          {t('flow.mismatch', { expected: formatINR(expected), entered: formatINR(entered!), diff: formatINR(Math.abs(expected - entered!)) })}
        </p>
      )}
    </div>
  )
}
