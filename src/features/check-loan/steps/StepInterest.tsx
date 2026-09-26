import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Field } from '@/components/loan/Field'
import { CountBox, PercentBox } from '@/components/loan/inputs'
import * as O from '@/components/loan/options'
import { useI18n } from '@/lib/i18n'
import type { LoanDraft } from '../draft'
import type { FieldErrors } from '../validation'
import { Section } from './Section'

export function StepInterest({ draft, update, errors }: { draft: LoanDraft; update: (p: Partial<LoanDraft>) => void; errors: FieldErrors }) {
  const { t } = useI18n()
  const floating = draft.rateType === 'floating' || draft.rateType === 'hybrid'
  return (
    <div className="space-y-6">
      <Section title={t('wizard.steps.interest')}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="quotedRate" label={t('field.quotedRate')} help={t('field.quotedRateHelp')} error={errors.quotedRate ? t(errors.quotedRate) : undefined} className="sm:col-span-2">
            {({ id, describedBy }) => (
              <PercentBox id={id} describedBy={describedBy} value={draft.quotedRate} onChange={(v) => update({ quotedRate: v })} allowUnknown max={60} invalid={!!errors.quotedRate} placeholder="12" />
            )}
          </Field>
          <Field id="rateMethod" label={t('field.rateMethod')} hint={t('field.rateMethodHelp')} as="fieldset" className="sm:col-span-2">
            {({ labelId }) => (
              <Segmented aria-labelledby={labelId} value={draft.rateMethod} onValueChange={(v) => update({ rateMethod: v })} options={O.rateMethodOptions(t)} className="grid grid-cols-1 sm:grid-cols-3" />
            )}
          </Field>
          <Field id="rateType" label={t('field.rateType')} as="fieldset" className="sm:col-span-2">
            {({ labelId }) => <Segmented aria-labelledby={labelId} columns={4} value={draft.rateType} onValueChange={(v) => update({ rateType: v })} options={O.rateTypeOptions(t)} />}
          </Field>
          <Field id="moratoriumMonths" label={t('field.moratorium')} help={t('field.moratoriumHelp')} optional>
            {({ id, describedBy }) => <CountBox id={id} describedBy={describedBy} value={draft.moratoriumMonths} max={60} onChange={(n) => update({ moratoriumMonths: n })} suffix={t('common.months')} />}
          </Field>
        </div>
      </Section>
      {floating && (
        <Section title={t('wizard.floatingTitle')}>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="benchmark" label={t('field.benchmark')} hint={t('field.benchmarkHint')} optional>
              {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={draft.benchmark} maxLength={40} onChange={(e) => update({ benchmark: e.target.value })} />}
            </Field>
            <Field id="spread" label={t('field.spread')} optional>
              {({ id, describedBy }) => <PercentBox id={id} describedBy={describedBy} value={draft.spread} onChange={(v) => update({ spread: v })} allowUnknown />}
            </Field>
            <Field id="resetFrequency" label={t('field.resetFrequency')} hint={t('field.resetFrequencyHint')} optional>
              {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={draft.resetFrequency} maxLength={40} onChange={(e) => update({ resetFrequency: e.target.value })} />}
            </Field>
          </div>
        </Section>
      )}
    </div>
  )
}
