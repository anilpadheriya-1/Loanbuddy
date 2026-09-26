import { Segmented } from '@/components/ui/segmented'
import { Field } from '@/components/loan/Field'
import { ChoiceSelect } from '@/components/loan/ChoiceSelect'
import { MoneyBox, NumberBox, PercentBox } from '@/components/loan/inputs'
import * as O from '@/components/loan/options'
import { PrepaymentRuleCard } from '@/components/results/PrepaymentRuleCard'
import type { LoanReport } from '@/lib/finance'
import { useI18n } from '@/lib/i18n'
import type { ChargeRateDraft, LoanDraft, NumField } from '../draft'
import type { FieldErrors } from '../validation'
import { Section } from './Section'

export function StepPrepayment({
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
  const p = draft.prepayment
  const setP = (patch: Partial<LoanDraft['prepayment']>) => setDraft((d) => ({ ...d, prepayment: { ...d.prepayment, ...patch } }))
  const setEx = (patch: Partial<LoanDraft['existing']>) => setDraft((d) => ({ ...d, existing: { ...d.existing, ...patch } }))

  const chargeEditor = (key: 'partCharge' | 'foreclosure', label: string) => {
    const value: ChargeRateDraft = p[key]
    return (
      <Field id={key} label={label} optional>
        {({ id, describedBy }) => (
          <div className="grid grid-cols-[1fr_8rem] gap-2">
            {value.mode === 'percent' ? (
              <PercentBox id={id} describedBy={describedBy} value={value.value} allowUnknown onChange={(v: NumField) => setP({ [key]: { ...value, value: v } })} />
            ) : (
              <MoneyBox id={id} describedBy={describedBy} value={value.value} allowUnknown showWords={false} onChange={(v: NumField) => setP({ [key]: { ...value, value: v } })} />
            )}
            <ChoiceSelect
              id={`${key}-mode`}
              value={value.mode}
              onValueChange={(m) => setP({ [key]: { mode: m, value: { ...value.value, value: null } } })}
              options={[
                { value: 'percent', label: t('unit.percent') },
                { value: 'fixed', label: t('unit.fixed') },
              ]}
            />
          </div>
        )}
      </Field>
    )
  }

  return (
    <div className="space-y-6">
      <Section title={t('rule.prepayTitle')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="partAllowed" label={t('field.partAllowed')} as="fieldset" className="sm:col-span-2">
            {({ labelId }) => <Segmented aria-labelledby={labelId} columns={3} value={p.partAllowed} onValueChange={(v) => setP({ partAllowed: v })} options={O.ynuOptions(t)} />}
          </Field>
          <Field id="minPart" label={t('field.minPart')} optional>
            {({ id, describedBy }) => <MoneyBox id={id} describedBy={describedBy} value={p.minPart} allowUnknown onChange={(v) => setP({ minPart: v })} />}
          </Field>
          <Field id="lockIn" label={t('field.lockIn')} optional>
            {({ id, describedBy }) => (
              <NumberBox id={id} describedBy={describedBy} decimals={0} value={p.lockInMonths} allowUnknown onChange={(v) => setP({ lockInMonths: v })} suffix={t('common.months')} />
            )}
          </Field>
          {chargeEditor('partCharge', t('field.partCharge'))}
          {chargeEditor('foreclosure', t('field.foreclosureCharge'))}
          <Field id="gstPct" label={t('field.gstOnCharges')} help={t('field.gstOnChargesHelp')} optional>
            {({ id, describedBy }) => <PercentBox id={id} describedBy={describedBy} value={p.gstPct} allowUnknown onChange={(v) => setP({ gstPct: v })} />}
          </Field>
          <Field id="btAvailable" label={t('field.btAvailable')} as="fieldset">
            {({ labelId }) => <Segmented aria-labelledby={labelId} columns={3} value={p.btAvailable} onValueChange={(v) => setP({ btAvailable: v })} options={O.ynuOptions(t)} />}
          </Field>
        </div>
        {report && <PrepaymentRuleCard rule={report.prepaymentRule} className="mt-6" />}
      </Section>

      {draft.status === 'existing' && (
        <Section title={t('field.existingTitle')} description={t('field.existingHelp')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="emisPaid" label={t('field.emisPaid')} optional>
              {({ id, describedBy }) => <NumberBox id={id} describedBy={describedBy} decimals={0} value={draft.existing.emisPaid} allowUnknown onChange={(v) => setEx({ emisPaid: v })} />}
            </Field>
            <Field id="outstanding" label={t('field.outstanding')} optional>
              {({ id, describedBy }) => <MoneyBox id={id} describedBy={describedBy} value={draft.existing.outstanding} allowUnknown onChange={(v) => setEx({ outstanding: v })} />}
            </Field>
            <Field id="remainingEmis" label={t('field.remainingEmis')} optional>
              {({ id, describedBy }) => <NumberBox id={id} describedBy={describedBy} decimals={0} value={draft.existing.remainingEmis} allowUnknown onChange={(v) => setEx({ remainingEmis: v })} />}
            </Field>
            <Field id="currentRate" label={t('field.currentRate')} error={errors.currentRate ? t(errors.currentRate) : undefined} optional>
              {({ id, describedBy }) => <PercentBox id={id} describedBy={describedBy} value={draft.existing.currentRate} allowUnknown onChange={(v) => setEx({ currentRate: v })} />}
            </Field>
            <Field id="currentEmi" label={t('field.currentEmi')} optional>
              {({ id, describedBy }) => <MoneyBox id={id} describedBy={describedBy} value={draft.existing.currentEmi} allowUnknown showWords={false} onChange={(v) => setEx({ currentEmi: v })} />}
            </Field>
            <Field id="foreclosureQuote" label={t('field.foreclosureQuote')} optional>
              {({ id, describedBy }) => <MoneyBox id={id} describedBy={describedBy} value={draft.existing.foreclosureQuote} allowUnknown onChange={(v) => setEx({ foreclosureQuote: v })} />}
            </Field>
          </div>
        </Section>
      )}
    </div>
  )
}
