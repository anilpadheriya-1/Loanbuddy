import type { LoanAnalysis } from '@/lib/finance'
import { formatINR, formatPct } from '@/lib/format'
import { renderMessage } from '@/lib/i18n/messages'
import { useI18n } from '@/lib/i18n'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export function Methodology({ analysis: a }: { analysis: LoanAnalysis }) {
  const { t, lang } = useI18n()
  // Group identical EMI flows so the list stays short: t=0 items, first EMI, "…", last EMI, recurring.
  const flows = a.flows
  const t0 = flows.filter((f) => f.t === 0)
  const emis = flows.filter((f) => f.label === 'emi')
  const recurring = flows.filter((f) => f.label === 'recurring')
  return (
    <div className="space-y-4 text-sm">
      <p>{t('method.body')}</p>
      {a.effective && <p className="text-muted-foreground">{t('method.ear', { ear: formatPct(a.effective.effectiveAnnualPct) })}</p>}
      <div>
        <p className="font-semibold">{t('method.assumptions')}</p>
        {a.assumptions.length === 0 ? (
          <p className="text-muted-foreground">{t('method.none')}</p>
        ) : (
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {a.assumptions.map((m, i) => (
              <li key={i}>{renderMessage('assume', m, lang)}</li>
            ))}
          </ul>
        )}
      </div>
      <Accordion type="single" collapsible>
        <AccordionItem value="flows" className="border-b-0">
          <AccordionTrigger>{t('method.cashflows')}</AccordionTrigger>
          <AccordionContent>
            <table className="num w-full max-w-md text-sm">
              <tbody>
                {t0.map((f, i) => (
                  <tr key={`t0-${i}`} className="border-b">
                    <td className="py-1">t = 0 ({f.label})</td>
                    <td className="py-1 text-right">{formatINR(f.amount)}</td>
                  </tr>
                ))}
                {emis.length > 0 && (
                  <tr className="border-b">
                    <td className="py-1">
                      EMI × {emis.length} (t = {emis[0].t.toFixed(2)} … {emis[emis.length - 1].t.toFixed(2)})
                    </td>
                    <td className="py-1 text-right">{formatINR(emis[0].amount, { paise: true })}</td>
                  </tr>
                )}
                {recurring.length > 0 && (
                  <tr>
                    <td className="py-1">recurring × {recurring.length}</td>
                    <td className="py-1 text-right">{formatINR(recurring.reduce((s, f) => s + f.amount, 0))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
