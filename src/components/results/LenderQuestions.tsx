import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { EngineMessage } from '@/lib/finance'
import { Button } from '@/components/ui/button'
import { renderMessage } from '@/lib/i18n/messages'
import { useI18n } from '@/lib/i18n'

export function LenderQuestions({ questions }: { questions: EngineMessage[] }) {
  const { t, lang } = useI18n()
  const [copied, setCopied] = useState(false)
  const texts = questions.map((q) => renderMessage('q', q, lang))
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('questions.intro')}</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        {texts.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <Button
        variant="outline"
        size="sm"
        className="no-print"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texts.map((q, i) => `${i + 1}. ${q}`).join('\n'))
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
          } catch {
            /* clipboard blocked */
          }
        }}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? t('common.copied') : t('questions.copyAll')}
      </Button>
    </div>
  )
}
