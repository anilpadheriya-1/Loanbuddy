/**
 * Date helpers for cash-flow timing. All dates are ISO "YYYY-MM-DD" strings
 * interpreted in UTC so results never depend on the user's time zone.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseIsoDate(value: string | undefined | null): Date | null {
  if (!value) return null
  const m = ISO_DATE.exec(value)
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1) return null
  return d
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const DAY_MS = 86_400_000

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

/** Add calendar months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(d: Date, months: number): Date {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + months
  const targetYear = y + Math.floor(m / 12)
  const targetMonth = ((m % 12) + 12) % 12
  const day = Math.min(d.getUTCDate(), daysInMonth(targetYear, targetMonth))
  return new Date(Date.UTC(targetYear, targetMonth, day))
}

/**
 * Time between two dates measured in loan periods.
 *
 * For monthly loans we count whole calendar months first and then convert the
 * remaining days at 365/12 days per month. That way a first EMI exactly one
 * calendar month after disbursement is exactly 1 period (matching the regular
 * IRR used in RBI's KFS illustration), while an irregular first EMI (say 45 days
 * later) is 1.48 periods.
 */
export function periodsBetween(from: Date, to: Date, periodsPerYear: number): number {
  if (periodsPerYear === 12) {
    let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
    let anchor = addMonths(from, months)
    if (anchor.getTime() > to.getTime()) {
      months -= 1
      anchor = addMonths(from, months)
    }
    return months + daysBetween(anchor, to) / (365 / 12)
  }
  return daysBetween(from, to) / (365 / periodsPerYear)
}
