import type { LoanReport } from '@/lib/finance'
import { formatINR, formatPct, type Lang } from '@/lib/format'
import { translate } from '@/lib/i18n'

/** The main drivers (largest positive steps) of the gap between quoted and effective cost. */
export function topDrivers(report: LoanReport, max = 3) {
  return report.analysis.attribution
    .slice(1)
    .filter((s) => s.deltaPp > 0.05)
    .sort((a, b) => b.deltaPp - a.deltaPp)
    .slice(0, max)
}

/** Plain-language summary, e.g. "Your lender quotes 12.00%. … mainly from ₹12,000 of processing fees and ₹8,000 of insurance." */
export function buildSummary(report: LoanReport, lang: Lang): string[] {
  const a = report.analysis
  if (a.status !== 'ok' || !a.effective) return []
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p)
  const lines: string[] = []
  const effective = formatPct(a.effective.aprStylePct)
  if (a.quotedRatePct !== null) lines.push(t('results.summaryQuoted', { quoted: formatPct(a.quotedRatePct), effective }))
  else lines.push(t('results.summaryNoQuote', { effective }))

  if (a.differencePp !== null && a.differencePp < -0.05) {
    lines.push(t('results.summaryLower'))
  } else if (a.differencePp !== null && a.differencePp <= 0.25) {
    lines.push(t('results.summaryClose'))
  } else {
    const drivers = topDrivers(report).map((s) => {
      const label = t(`attr.${s.key}`)
      return s.amount ? `${label} (${formatINR(s.amount)})` : label
    })
    if (drivers.length) {
      const joined = drivers.length === 1 ? drivers[0] : `${drivers.slice(0, -1).join(', ')} ${t('common.and')} ${drivers[drivers.length - 1]}`
      lines.push(t('results.summaryDrivers', { drivers: joined }))
    }
  }
  return lines
}
