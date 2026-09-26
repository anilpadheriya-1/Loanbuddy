import type { Lang } from '@/lib/format'
import { translate } from '@/lib/i18n'
import type { LoanDraft } from '@/features/check-loan/draft'
import type { RequestItem } from './items'

/** Build the request message in the chosen language (independent of the UI language). */
export function buildLetter(d: LoanDraft, items: RequestItem[], lang: Lang): { subject: string; body: string } {
  const t = (k: string, p?: Record<string, string | number>) => translate(lang, k, p)
  const lender = d.lenderName.trim()
  const intro = t('ask.letter.intro', {
    loanType: lang === 'en' ? lowerFirst(t(`loanType.${d.loanType}`)) : t(`loanType.${d.loanType}`),
    lender: lender ? t('ask.letter.lenderPart', { lender }) : '',
  })
  const lines = items.map((it, i) => `${i + 1}. ${t(it.ask)}`)
  const body = [t('ask.letter.greeting'), '', intro, '', ...lines, '', t('ask.letter.closing'), '', t('ask.letter.account'), t('ask.letter.name'), '', t('ask.letter.thanks')].join(
    '\n',
  )
  return { subject: t('ask.letter.subject'), body }
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}
