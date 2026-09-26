/**
 * The ONLY place money and rates are formatted. Rupees only, Indian number system.
 *
 *   formatINR(500000)        → "₹5,00,000"
 *   formatINR(969.73, {paise:true}) → "₹969.73"
 *   formatINRShort(500000)   → "₹5 lakh"       (hi: "₹5 लाख")
 *   formatINRShort(12500000) → "₹1.25 crore"   (hi: "₹1.25 करोड़")
 */

export type Lang = 'en' | 'hi' | 'gu'

const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 2 })
const num0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const num2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

/** Normalise "-0" and tiny float noise. */
function clean(x: number, decimals: number): number {
  const f = Math.pow(10, decimals)
  const r = Math.round(x * f) / f
  return Object.is(r, -0) ? 0 : r
}

export function formatINR(value: number | null | undefined, options: { paise?: boolean } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return options.paise ? inr2.format(clean(value, 2)) : inr0.format(clean(value, 0))
}

/** Plain Indian-grouped number without the ₹ sign (for inputs). */
export function formatIndianNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return decimals > 0 ? num2.format(clean(value, decimals)) : num0.format(clean(value, 0))
}

const UNITS: Record<Lang, { lakh: string; crore: string; thousand: string }> = {
  en: { lakh: 'lakh', crore: 'crore', thousand: 'thousand' },
  hi: { lakh: 'लाख', crore: 'करोड़', thousand: 'हज़ार' },
  gu: { lakh: 'લાખ', crore: 'કરોડ', thousand: 'હજાર' },
}

function trimNumber(x: number, maxDecimals: number): string {
  return String(clean(x, maxDecimals))
}

/** Short form in lakh / crore (never "million"). */
export function formatINRShort(value: number | null | undefined, lang: Lang = 'en'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const sign = value < 0 ? '−' : ''
  const abs = Math.abs(value)
  const u = UNITS[lang]
  if (abs >= 1_00_00_000) return `${sign}₹${trimNumber(abs / 1_00_00_000, 2)} ${u.crore}`
  if (abs >= 1_00_000) return `${sign}₹${trimNumber(abs / 1_00_000, 2)} ${u.lakh}`
  return `${sign}${formatINR(abs)}`
}

/** Hint shown under money inputs: "= ₹5 lakh". Empty for small amounts. */
export function rupeesInWords(value: number | null | undefined, lang: Lang = 'en'): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 1_000) return ''
  const u = UNITS[lang]
  if (value < 1_00_000) return `₹${trimNumber(value / 1_000, 2)} ${u.thousand}`
  return formatINRShort(value, lang)
}

export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${clean(value, decimals).toFixed(decimals)}%`
}

/** Percentage-point difference with an explicit sign: "+3.14 pp". */
export function formatPp(value: number | null | undefined, decimals = 2, unit = 'pp'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const v = clean(value, decimals)
  const sign = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${sign}${Math.abs(v).toFixed(decimals)} ${unit}`
}

/** 40 → "3 yr 4 mo"; units are translatable. */
export function formatMonths(months: number, units: { yr: string; mo: string } = { yr: 'yr', mo: 'mo' }): string {
  if (!Number.isFinite(months)) return '—'
  const m = Math.round(months)
  const y = Math.floor(m / 12)
  const r = m % 12
  if (y === 0) return `${r} ${units.mo}`
  if (r === 0) return `${y} ${units.yr}`
  return `${y} ${units.yr} ${r} ${units.mo}`
}

/** Parse a user-typed amount like "5,00,000" or "₹ 5 00 000.50". Returns null if empty/invalid. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[₹,\s]/g, '')
  if (cleaned === '' || cleaned === '.') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function formatDate(iso: string | undefined, lang: Lang = 'en'): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  const locale = lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-IN'
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d)
}
