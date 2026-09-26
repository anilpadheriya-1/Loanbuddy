import * as React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { formatIndianNumber, parseAmount, rupeesInWords } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { NumField } from '@/features/check-loan/draft'

interface NumberBoxProps {
  id: string
  value: NumField
  onChange: (v: NumField) => void
  describedBy?: string
  /** Text shown before the number, e.g. "₹". */
  prefix?: string
  /** Text shown after the number, e.g. "%". */
  suffix?: string
  decimals?: number
  min?: number
  max?: number
  placeholder?: string
  /** Show an "I don't know" checkbox. */
  allowUnknown?: boolean
  /** Show "= ₹5 lakh" under money inputs. */
  showWords?: boolean
  invalid?: boolean
  className?: string
  inputClassName?: string
  'aria-label'?: string
}

/**
 * Numeric input that keeps the user's text while typing, formats with Indian
 * grouping when not focused, and supports an explicit "I don't know".
 */
export function NumberBox({
  id,
  value,
  onChange,
  describedBy,
  prefix,
  suffix,
  decimals = 2,
  min,
  max,
  placeholder,
  allowUnknown,
  showWords,
  invalid,
  className,
  inputClassName,
  ...rest
}: NumberBoxProps) {
  const { t, lang } = useI18n()
  const [focused, setFocused] = React.useState(false)
  const [text, setText] = React.useState(() => (value.value === null ? '' : String(value.value)))

  // Keep text in sync when the value changes from outside (e.g. "use calculated EMI").
  React.useEffect(() => {
    if (!focused) setText(value.value === null ? '' : String(value.value))
  }, [value.value, focused])

  const display = focused ? text : value.value === null ? '' : formatIndianNumber(value.value, decimals)
  const outOfRange = value.value !== null && ((min !== undefined && value.value < min) || (max !== undefined && value.value > max))
  const words = showWords && !value.unknown ? rupeesInWords(value.value, lang) : ''

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground" aria-hidden>
            {prefix}
          </span>
        )}
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          placeholder={value.unknown ? t('common.unknown') : placeholder}
          disabled={value.unknown}
          value={value.unknown ? '' : display}
          aria-describedby={describedBy}
          aria-invalid={invalid || outOfRange || undefined}
          aria-label={rest['aria-label']}
          className={cn('num', prefix && 'pl-7', suffix && 'pr-12', inputClassName)}
          onFocus={() => {
            setFocused(true)
            setText(value.value === null ? '' : String(value.value))
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const raw = e.target.value
            if (raw !== '' && !/^[₹\d,.\s]*$/.test(raw)) return
            setText(raw)
            const n = parseAmount(raw)
            onChange({ ...value, value: n, unknown: false })
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground" aria-hidden>
            {suffix}
          </span>
        )}
      </div>
      {(words || allowUnknown) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {words ? (
            <span className="num text-xs text-muted-foreground" aria-live="polite">
              {t('common.inWords', { value: words })}
            </span>
          ) : (
            <span />
          )}
          {allowUnknown && (
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={value.unknown}
                onCheckedChange={(c) => onChange({ ...value, unknown: c === true, value: c === true ? null : value.value })}
                aria-describedby={describedBy}
              />
              {t('common.iDontKnow')}
            </label>
          )}
        </div>
      )}
    </div>
  )
}

export function MoneyBox(props: Omit<NumberBoxProps, 'prefix' | 'showWords'> & { showWords?: boolean }) {
  return <NumberBox prefix="₹" decimals={2} showWords={props.showWords ?? true} min={0} {...props} />
}

export function PercentBox(props: Omit<NumberBoxProps, 'suffix'>) {
  return <NumberBox suffix="%" decimals={2} min={0} max={100} {...props} />
}

/** Simple integer stepper-like input for counts (EMIs, months). */
export function CountBox({
  id,
  value,
  onChange,
  describedBy,
  min = 0,
  max = 1200,
  suffix,
}: {
  id: string
  value: number
  onChange: (n: number) => void
  describedBy?: string
  min?: number
  max?: number
  suffix?: string
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={Number.isFinite(value) ? value : 0}
        aria-describedby={describedBy}
        className={cn('num', suffix && 'pr-20')}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value))
          onChange(Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 0)
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground" aria-hidden>
          {suffix}
        </span>
      )}
    </div>
  )
}
