import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Field } from '@/components/loan/Field'
import { ChoiceSelect } from '@/components/loan/ChoiceSelect'
import { CountBox, MoneyBox } from '@/components/loan/inputs'
import * as O from '@/components/loan/options'
import { ReconcileAlert } from '@/components/results/ReconcileAlert'
import type { LoanReport } from '@/lib/finance'
import { formatINR } from '@/lib/format'
import { useI18n, type TKey } from '@/lib/i18n'
import { uid } from '@/lib/utils'
import { emptyNum, num, tenurePeriods, type LoanDraft } from '../draft'
import { suggestedEmi } from '../derived'
import type { FieldErrors } from '../validation'
import { Section } from './Section'

export function StepRepayment({
  draft,
  setDraft,
  errors,
  report,
}: {
  draft: LoanDraft
  setDraft: (fn: (d: LoanDraft) => LoanDraft) => void
  errors: FieldErrors
  report: LoanReport | null
}) {
  const { t } = useI18n()
  const update = (p: Partial<LoanDraft>) => setDraft((d) => ({ ...d, ...p }))
  const calc = suggestedEmi(draft)
  const rec = report?.analysis.reconciliation
  const err = (k: string) => (errors[k] ? t(errors[k]!) : undefined)

  return (
    <div className="space-y-6">
      <Section title={t('wizard.steps.repayment')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="emi" label={t('field.emi')} help={t('field.emiHelp')} error={err('emi')} className="sm:col-span-2">
            {({ id, describedBy }) => (
              <div className="space-y-2">
                <MoneyBox id={id} describedBy={describedBy} value={draft.emi} onChange={(v) => update({ emi: v })} allowUnknown invalid={!!errors.emi} showWords={false} />
                {calc !== null && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="num">{t('field.emiCalculated', { emi: formatINR(calc, { paise: true }) })}</span>
                    {draft.emi.value === null && (
                      <Button variant="outline" size="sm" onClick={() => update({ emi: num(calc, true) })}>
                        {t('field.useCalculatedEmi')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Field>
          {rec && draft.quotedRate.value !== null && (
            <div className="sm:col-span-2">
              <ReconcileAlert rec={rec} n={tenurePeriods(draft)} quotedRate={draft.quotedRate.value} />
            </div>
          )}
          <Field id="firstEmiDate" label={t('field.firstEmiDate')} help={t('field.firstEmiDateHelp')} error={err('firstEmiDate')} optional>
            {({ id, describedBy }) => (
              <Input id={id} type="date" aria-describedby={describedBy} aria-invalid={!!errors.firstEmiDate || undefined} value={draft.firstEmiDate} onChange={(e) => update({ firstEmiDate: e.target.value })} />
            )}
          </Field>
          <Field id="lastEmiDate" label={t('field.lastEmiDate')} error={err('lastEmiDate')} optional>
            {({ id, describedBy }) => (
              <Input id={id} type="date" aria-describedby={describedBy} aria-invalid={!!errors.lastEmiDate || undefined} value={draft.lastEmiDate} onChange={(e) => update({ lastEmiDate: e.target.value })} />
            )}
          </Field>
          <Field id="advanceEmiCount" label={t('field.advanceEmi')} help={t('field.advanceEmiHelp')} optional>
            {({ id, describedBy }) => <CountBox id={id} describedBy={describedBy} value={draft.advanceEmiCount} max={12} onChange={(n) => update({ advanceEmiCount: n })} />}
          </Field>
          {draft.advanceEmiCount > 0 && (
            <Field id="advanceEmiPayment" label={t('field.advanceEmiPayment')} as="fieldset">
              {({ labelId }) => (
                <Segmented
                  aria-labelledby={labelId}
                  columns={2}
                  value={draft.advanceEmiPayment}
                  onValueChange={(v) => update({ advanceEmiPayment: v })}
                  options={[
                    { value: 'deducted', label: t('advance.deducted') },
                    { value: 'separate', label: t('advance.separate') },
                  ]}
                />
              )}
            </Field>
          )}
        </div>
      </Section>

      <Section title={t('field.recurring')} description={t('field.recurringHelp')}>
        <div className="space-y-3">
          {draft.recurring.map((r, i) => (
            <div key={r.id} className="grid items-end gap-3 rounded-lg border bg-background/60 p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
              <Field id={`rec-${i}-name`} label={t('recurring.name')}>
                {({ id }) => (
                  <Input id={id} value={r.name} maxLength={60} onChange={(e) => setDraft((d) => ({ ...d, recurring: d.recurring.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)) }))} />
                )}
              </Field>
              <Field id={`rec-${i}-amount`} label={t('charges.amount')}>
                {({ id }) => (
                  <MoneyBox id={id} value={r.amount} showWords={false} allowUnknown onChange={(v) => setDraft((d) => ({ ...d, recurring: d.recurring.map((x) => (x.id === r.id ? { ...x, amount: v } : x)) }))} />
                )}
              </Field>
              <Field id={`rec-${i}-freq`} label={t('recurring.frequency')}>
                {({ id, labelId }) => (
                  <ChoiceSelect
                    id={id}
                    labelId={labelId}
                    value={r.frequency}
                    options={O.recurringFreqOptions(t)}
                    onValueChange={(v) => setDraft((d) => ({ ...d, recurring: d.recurring.map((x) => (x.id === r.id ? { ...x, frequency: v } : x)) }))}
                  />
                )}
              </Field>
              <Field id={`rec-${i}-pay`} label={t('recurring.payment')}>
                {({ id, labelId }) => (
                  <ChoiceSelect
                    id={id}
                    labelId={labelId}
                    value={r.payment}
                    options={O.recurringPaymentOptions(t)}
                    onValueChange={(v) => setDraft((d) => ({ ...d, recurring: d.recurring.map((x) => (x.id === r.id ? { ...x, payment: v } : x)) }))}
                  />
                )}
              </Field>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-danger"
                aria-label={t('charges.remove', { name: r.name })}
                onClick={() => setDraft((d) => ({ ...d, recurring: d.recurring.filter((x) => x.id !== r.id) }))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                recurring: [...d.recurring, { id: uid('rec'), name: t('recurring.defaultName'), amount: emptyNum(), frequency: 'annual', payment: 'separate' }],
              }))
            }
          >
            <Plus aria-hidden /> {t('recurring.add')}
          </Button>
        </div>
      </Section>

      <Section title={t('field.contingent')} description={t('field.contingentHelp')}>
        <div className="space-y-3">
          {draft.contingent.map((c, i) => (
            <div key={c.id} className="grid items-end gap-3 rounded-lg border bg-background/60 p-3 sm:grid-cols-[1.5fr_1fr_auto]">
              <Field id={`con-${i}-kind`} label={t('charges.name')}>
                {({ id, labelId }) => (
                  <ChoiceSelect
                    id={id}
                    labelId={labelId}
                    value={c.kind}
                    options={O.contingentKindOptions(t)}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, contingent: d.contingent.map((x) => (x.id === c.id ? { ...x, kind: v, name: t(`contingent.kind.${v}` as TKey) } : x)) }))
                    }
                  />
                )}
              </Field>
              <Field id={`con-${i}-amount`} label={t('contingent.perEvent')}>
                {({ id }) => (
                  <MoneyBox id={id} value={c.amount} showWords={false} allowUnknown onChange={(v) => setDraft((d) => ({ ...d, contingent: d.contingent.map((x) => (x.id === c.id ? { ...x, amount: v } : x)) }))} />
                )}
              </Field>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-danger"
                aria-label={t('charges.remove', { name: c.name })}
                onClick={() => setDraft((d) => ({ ...d, contingent: d.contingent.filter((x) => x.id !== c.id) }))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                contingent: [...d.contingent, { id: uid('con'), kind: 'bounce', name: t('contingent.kind.bounce'), amount: emptyNum() }],
              }))
            }
          >
            <Plus aria-hidden /> {t('contingent.add')}
          </Button>
        </div>
      </Section>
    </div>
  )
}
