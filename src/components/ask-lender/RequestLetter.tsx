import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Mail, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Field } from '@/components/loan/Field'
import type { LoanDraft } from '@/features/check-loan/draft'
import { itemStatus, REQUEST_ITEMS } from '@/features/ask-lender/items'
import { buildLetter } from '@/features/ask-lender/letter'
import { loadLanguage, useI18n, type Lang } from '@/lib/i18n'
import { shareText } from '@/lib/native'

export function RequestLetter({
  draft,
  onLenderName,
  onMarkAsked,
}: {
  draft: LoanDraft
  onLenderName: (name: string) => void
  onMarkAsked: (ids: string[]) => void
}) {
  const { t, lang } = useI18n()
  const [letterLang, setLetterLang] = useState<Lang>(lang === 'hi' ? 'hi' : 'en')
  const [onlyMissing, setOnlyMissing] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [, setLoaded] = useState(0)

  // The Hindi dictionary loads on demand; re-render once it is available.
  useEffect(() => {
    let active = true
    loadLanguage(letterLang).then(() => active && setLoaded((n) => n + 1))
    return () => {
      active = false
    }
  }, [letterLang])

  const items = REQUEST_ITEMS.filter((it) => !onlyMissing || itemStatus(draft, it) !== 'received')
  const letter = useMemo(() => buildLetter(draft, items, letterLang), [draft, items, letterLang])
  const full = `${letter.subject}\n\n${letter.body}`

  const flash = (msg: string) => {
    setFeedback(msg)
    window.setTimeout(() => setFeedback(''), 4000)
  }

  if (items.length === 0) {
    return <p className="rounded-lg bg-savings-soft p-4 text-sm font-medium text-savings">{t('ask.allReceived')}</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ask-lender-name" label={t('ask.lenderName')} optional>
          {({ id }) => <Input id={id} value={draft.lenderName} maxLength={80} onChange={(e) => onLenderName(e.target.value)} />}
        </Field>
        <Field id="ask-letter-lang" label={t('ask.letterLang')} as="fieldset">
          {({ labelId }) => (
            <Segmented
              aria-labelledby={labelId}
              columns={2}
              value={letterLang}
              onValueChange={setLetterLang}
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'हिंदी' },
              ]}
            />
          )}
        </Field>
      </div>
      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
        <Checkbox checked={onlyMissing} onCheckedChange={(c) => setOnlyMissing(c === true)} />
        {t('ask.onlyMissing')}
      </label>
      <div className="rounded-lg border bg-background/60 p-4">
        <p className="text-sm font-semibold" lang={letterLang === 'hi' ? 'hi' : 'en'}>
          {letter.subject}
        </p>
        <pre
          className="mt-2 max-h-80 overflow-y-auto font-sans text-sm leading-relaxed whitespace-pre-wrap"
          lang={letterLang === 'hi' ? 'hi' : 'en'}
          aria-label={letter.subject}
          tabIndex={0}
        >
          {letter.body}
        </pre>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(full)
              flash(t('ask.copied'))
            } catch {
              /* clipboard blocked */
            }
          }}
        >
          <Copy aria-hidden /> {t('ask.copy')}
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            const r = await shareText(letter.subject, full)
            if (r === 'copied') flash(t('ask.copied'))
          }}
        >
          <Share2 aria-hidden /> {t('ask.share')}
        </Button>
        <Button asChild variant="outline">
          <a href={`mailto:?subject=${encodeURIComponent(letter.subject)}&body=${encodeURIComponent(letter.body)}`}>
            <Mail aria-hidden /> {t('ask.email')}
          </a>
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onMarkAsked(items.map((i) => i.id))
            flash(t('ask.markedAsked'))
          }}
        >
          <Check aria-hidden /> {t('ask.markAsked')}
        </Button>
      </div>
      {feedback && (
        <p className="text-sm text-savings" role="status">
          {feedback}
        </p>
      )}
    </div>
  )
}
