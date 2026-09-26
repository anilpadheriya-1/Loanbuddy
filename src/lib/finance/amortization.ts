import { calculateEmi, periodicRate } from './emi'

/**
 * Reducing-balance amortisation schedule.
 *
 * Balances are tracked in integer paise so every row adds up exactly and the
 * loan closes at ₹0. Interest each period = outstanding × periodic rate,
 * rounded to the nearest paisa. The final instalment is adjusted to clear the balance.
 */

export interface ScheduleRow {
  period: number
  opening: number
  /** Scheduled instalment actually paid this period (excluding extra payments). */
  emi: number
  interest: number
  principal: number
  /** Extra / part-prepayment paid this period. */
  extra: number
  closing: number
  cumulativeInterest: number
  cumulativePaid: number
}

export interface ScheduleOptions {
  principal: number
  annualRatePct: number
  /** Maximum number of instalments (the original tenure). */
  periods: number
  periodsPerYear?: number
  /** Instalment to use; computed from rate and tenure if omitted. */
  emi?: number
  /** Extra amount paid with every instalment. */
  extraPerPeriod?: number
  /** One-off extra payments made together with the instalment of `period`. */
  lumpSums?: { period: number; amount: number }[]
  /**
   * After a lump sum: keep the EMI and finish sooner ('tenure', default) or
   * keep the end date and lower the EMI ('emi').
   */
  recast?: 'tenure' | 'emi'
}

export interface Schedule {
  rows: ScheduleRow[]
  emi: number
  totalInterest: number
  /** Everything paid: instalments + extra payments. */
  totalPaid: number
  totalExtra: number
  periodsUsed: number
  /** EMI does not cover interest: balance would grow. */
  negativeAmortization: boolean
  /** The final instalment had to be much larger than the EMI to close the loan. */
  balloon: boolean
}

const toPaise = (x: number) => Math.round(x * 100)
const toRupees = (p: number) => p / 100

export function buildSchedule(options: ScheduleOptions): Schedule {
  const k = options.periodsPerYear ?? 12
  const n = Math.max(0, Math.floor(options.periods))
  const r = periodicRate(options.annualRatePct, k)
  const emiRupees = options.emi ?? calculateEmi(options.principal, options.annualRatePct, n, { periodsPerYear: k })
  let emiP = toPaise(emiRupees)
  const extraP = toPaise(options.extraPerPeriod ?? 0)
  const lumps = new Map<number, number>()
  for (const l of options.lumpSums ?? []) {
    lumps.set(l.period, (lumps.get(l.period) ?? 0) + toPaise(l.amount))
  }

  let balance = toPaise(options.principal)
  let cumInterest = 0
  let cumPaid = 0
  let totalExtra = 0
  let negativeAmortization = false
  let balloon = false
  const rows: ScheduleRow[] = []

  for (let period = 1; period <= n && balance > 0; period++) {
    const opening = balance
    const interest = Math.round(opening * r)
    let payment = emiP
    let principalPart = payment - interest
    if (principalPart <= 0 && period < n) negativeAmortization = true

    const isLast = period === n
    if (principalPart >= opening || isLast) {
      if (isLast && opening + interest > emiP * 1.5 && emiP > 0) balloon = true
      principalPart = opening
      payment = opening + interest
    }

    let extra = Math.min(extraP + (lumps.get(period) ?? 0), Math.max(0, opening - principalPart))
    if (extra < 0) extra = 0
    balance = opening - principalPart - extra
    cumInterest += interest
    cumPaid += payment + extra
    totalExtra += extra

    rows.push({
      period,
      opening: toRupees(opening),
      emi: toRupees(payment),
      interest: toRupees(interest),
      principal: toRupees(principalPart),
      extra: toRupees(extra),
      closing: toRupees(balance),
      cumulativeInterest: toRupees(cumInterest),
      cumulativePaid: toRupees(cumPaid),
    })

    // Lower the EMI to keep the original end date after a lump sum.
    if (options.recast === 'emi' && (lumps.get(period) ?? 0) > 0 && balance > 0 && period < n) {
      emiP = toPaise(calculateEmi(toRupees(balance), options.annualRatePct, n - period, { periodsPerYear: k }))
    }
  }

  return {
    rows,
    emi: toRupees(toPaise(emiRupees)),
    totalInterest: toRupees(cumInterest),
    totalPaid: toRupees(cumPaid),
    totalExtra: toRupees(totalExtra),
    periodsUsed: rows.length,
    negativeAmortization,
    balloon,
  }
}

/** Group a monthly schedule into loan years (for long loans on small screens). */
export interface YearRow {
  year: number
  opening: number
  paid: number
  interest: number
  principal: number
  extra: number
  closing: number
  cumulativeInterest: number
}

export function groupByYear(rows: ScheduleRow[], periodsPerYear = 12): YearRow[] {
  const years: YearRow[] = []
  for (const row of rows) {
    const year = Math.ceil(row.period / periodsPerYear)
    let y = years[years.length - 1]
    if (!y || y.year !== year) {
      y = { year, opening: row.opening, paid: 0, interest: 0, principal: 0, extra: 0, closing: row.closing, cumulativeInterest: 0 }
      years.push(y)
    }
    y.paid = round2(y.paid + row.emi + row.extra)
    y.interest = round2(y.interest + row.interest)
    y.principal = round2(y.principal + row.principal)
    y.extra = round2(y.extra + row.extra)
    y.closing = row.closing
    y.cumulativeInterest = row.cumulativeInterest
  }
  return years
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}
