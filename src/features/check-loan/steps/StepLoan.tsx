import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Alert } from '@/components/ui/alert'
import { Field } from '@/components/loan/Field'
import { ChoiceSelect } from '@/components/loan/ChoiceSelect'
import { MoneyBox, NumberBox } from '@/components/loan/inputs'
import * as O from '@/components/loan/options'
import { useI18n, type TKey } from '@/lib/i18n'
import type { LoanDraft } from '../draft'
import type { FieldErrors } from '../validation'
import { Section } from './Section'

const DOCS: (keyof LoanDraft['documents'])[] = ['kfs', 'sanctionLetter', 'loanAgreement', 'amortizationSchedule', 'statement', 'foreclosureLetter']

export function StepLoan({ draft, update, errors }: { draft: LoanDraft; update: (p: Partial<LoanDraft>) => void; errors: FieldErrors }) {
  const { t } = useI18n()
  const err = (k: string) => (errors[k] ? t(errors[k]!) : undefined)
  const showLayer = draft.lenderCategory === 'nbfc' || draft.lenderCategory === 'hfc'
  const showTier = draft.lenderCategory === 'cooperative-bank'

  return (
    <div className="space-y-6">
      <Section title={t('wizard.aboutTitle')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="loanType" label={t('field.loanType')}>
            {({ id, describedBy, labelId }) => (
              <ChoiceSelect id={id} labelId={labelId} describedBy={describedBy} value={draft.loanType} onValueChange={(v) => update({ loanType: v })} options={O.loanTypeOptions(t)} />
            )}
          </Field>
          <Field id="status" label={t('field.status')} as="fieldset" className="sm:col-span-2">
            {({ labelId }) => <Segmented aria-labelledby={labelId} columns={2} value={draft.status} onValueChange={(v) => update({ status: v })} options={O.statusOptions(t)} />}
          </Field>
          <Field id="borrowerType" label={t('field.borrowerType')} as="fieldset">
            {({ labelId }) => <Segmented aria-labelledby={labelId} columns={2} value={draft.borrowerType} onValueChange={(v) => update({ borrowerType: v })} options={O.borrowerOptions(t)} />}
          </Field>
          <Field id="purpose" label={t('field.purpose')} help={t('field.purposeHelp')} as="fieldset">
            {({ labelId }) => <Segmented aria-labelledby={labelId} value={draft.purpose} onValueChange={(v) => update({ purpose: v })} options={O.purposeOptions(t)} className="grid grid-cols-1 sm:grid-cols-3" />}
          </Field>
        </div>
        {draft.status === 'existing' && (
          <Alert tone="info" className="mt-4">
            {t('wizard.existingNote')}
          </Alert>
        )}
      </Section>

      <Section title={t('wizard.amountsTitle')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="sanctionedAmount" label={t('field.sanctionedAmount')} help={t('field.sanctionedAmountHelp')} error={err('sanctionedAmount')} className="sm:col-span-2">
            {({ id, describedBy }) => (
              <MoneyBox id={id} describedBy={describedBy} value={draft.sanctionedAmount} onChange={(v) => update({ sanctionedAmount: v })} invalid={!!errors.sanctionedAmount} placeholder="5,00,000" />
            )}
          </Field>
          <Field id="netReceived" label={t('field.netReceived')} help={t('field.netReceivedHelp')} error={err('netReceived')} optional>
            {({ id, describedBy }) => (
              <MoneyBox id={id} describedBy={describedBy} value={draft.netReceived} onChange={(v) => update({ netReceived: v })} allowUnknown invalid={!!errors.netReceived} />
            )}
          </Field>
          <Field id="disbursedAmount" label={t('field.disbursedAmount')} help={t('field.disbursedAmountHelp')} error={err('disbursedAmount')} optional>
            {({ id, describedBy }) => (
              <MoneyBox id={id} describedBy={describedBy} value={draft.disbursedAmount} onChange={(v) => update({ disbursedAmount: v })} invalid={!!errors.disbursedAmount} />
            )}
          </Field>
          <Field id="tenureValue" label={t('field.tenure')} error={err('tenureValue')}>
            {({ id, describedBy }) => (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <NumberBox id={id} describedBy={describedBy} decimals={1} value={draft.tenureValue} onChange={(v) => update({ tenureValue: v })} invalid={!!errors.tenureValue} placeholder="36" />
                <div className="w-40">
                  <ChoiceSelect id="tenureUnit" value={draft.tenureUnit} onValueChange={(v) => update({ tenureUnit: v })} options={O.tenureUnitOptions(t)} />
                </div>
              </div>
            )}
          </Field>
          <Field id="frequency" label={t('field.frequency')}>
            {({ id, describedBy, labelId }) => (
              <ChoiceSelect id={id} labelId={labelId} describedBy={describedBy} value={draft.frequency} onValueChange={(v) => update({ frequency: v })} options={O.frequencyOptions(t)} />
            )}
          </Field>
        </div>
      </Section>

      <Section title={t('wizard.lenderTitle')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="lenderName" label={t('field.lenderName')} hint={t('field.lenderNameHint')} optional>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={draft.lenderName} maxLength={80} onChange={(e) => update({ lenderName: e.target.value })} />}
          </Field>
          <Field id="lenderCategory" label={t('field.lenderCategory')} help={t('field.lenderCategoryHelp')}>
            {({ id, describedBy, labelId }) => (
              <ChoiceSelect id={id} labelId={labelId} describedBy={describedBy} value={draft.lenderCategory} onValueChange={(v) => update({ lenderCategory: v })} options={O.lenderOptions(t)} />
            )}
          </Field>
          {showLayer && (
            <Field id="nbfcLayer" label={t('field.nbfcLayer')} help={t('field.nbfcLayerHelp')} optional>
              {({ id, describedBy, labelId }) => (
                <ChoiceSelect id={id} labelId={labelId} describedBy={describedBy} value={draft.nbfcLayer} onValueChange={(v) => update({ nbfcLayer: v })} options={O.nbfcLayerOptions(t)} />
              )}
            </Field>
          )}
          {showTier && (
            <Field id="coopTier" label={t('field.coopTier')} optional>
              {({ id, describedBy, labelId }) => (
                <ChoiceSelect id={id} labelId={labelId} describedBy={describedBy} value={draft.coopTier} onValueChange={(v) => update({ coopTier: v })} options={O.coopTierOptions(t)} />
              )}
            </Field>
          )}
        </div>
      </Section>

      <Section title={t('wizard.datesTitle')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="sanctionDate" label={t('field.sanctionDate')} optional>
            {({ id, describedBy }) => <Input id={id} type="date" aria-describedby={describedBy} value={draft.sanctionDate} onChange={(e) => update({ sanctionDate: e.target.value })} />}
          </Field>
          <Field id="disbursementDate" label={t('field.disbursementDate')} error={err('disbursementDate')} optional>
            {({ id, describedBy }) => (
              <Input id={id} type="date" aria-describedby={describedBy} aria-invalid={!!errors.disbursementDate || undefined} value={draft.disbursementDate} onChange={(e) => update({ disbursementDate: e.target.value })} />
            )}
          </Field>
        </div>
      </Section>

      <Section title={t('wizard.docsTitle')}>
        <Field id="documents" label={t('field.documents')} hint={t('field.documentsHelp')} as="fieldset">
          {({ describedBy }) => (
            <div className="grid gap-2 sm:grid-cols-2" aria-describedby={describedBy}>
              {DOCS.map((doc) => (
                <label key={doc} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-accent">
                  <Checkbox checked={draft.documents[doc]} onCheckedChange={(c) => update({ documents: { ...draft.documents, [doc]: c === true } })} />
                  {t(`doc.${doc}` as TKey)}
                </label>
              ))}
            </div>
          )}
        </Field>
        <Field id="valuesSource" label={t('field.valuesSource')} as="fieldset" className="mt-5">
          {({ labelId }) => <Segmented aria-labelledby={labelId} value={draft.valuesSource} onValueChange={(v) => update({ valuesSource: v })} options={O.valuesSourceOptions(t)} className="grid grid-cols-1 sm:grid-cols-3" />}
        </Field>
        <Field id="label" label={t('field.label')} hint={t('field.labelHint')} optional className="mt-5">
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={draft.label} maxLength={80} onChange={(e) => update({ label: e.target.value })} />}
        </Field>
      </Section>
    </div>
  )
}
