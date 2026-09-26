import { Plus, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Field } from '@/components/loan/Field'
import { ChoiceSelect } from '@/components/loan/ChoiceSelect'
import { MoneyBox, NumberBox } from '@/components/loan/inputs'
import { NetReceivedFlow } from '@/components/loan/NetReceivedFlow'
import * as O from '@/components/loan/options'
import { CHARGE_CATEGORIES } from '@/lib/finance'
import { formatINR } from '@/lib/format'
import { useI18n, type TKey } from '@/lib/i18n'
import { chargeBase, chargeRupees, newCharge, num, type ChargeDraft, type LoanDraft } from '../draft'
import { Section } from './Section'

export function StepCharges({ draft, setDraft, emi }: { draft: LoanDraft; setDraft: (fn: (d: LoanDraft) => LoanDraft) => void; emi?: number }) {
  const { t } = useI18n()
  const base = chargeBase(draft)

  const updateCharge = (id: string, patch: Partial<ChargeDraft>) =>
    setDraft((d) => ({ ...d, charges: d.charges.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  const removeCharge = (id: string) => setDraft((d) => ({ ...d, charges: d.charges.filter((c) => c.id !== id) }))
  const addCharge = (category: ChargeDraft['category']) =>
    setDraft((d) => ({ ...d, charges: [...d.charges, newCharge(category, t(`chargeCat.${category}` as TKey))] }))

  return (
    <div className="space-y-6">
      <NetReceivedFlow draft={draft} emi={emi} />
      <Section title={t('charges.title')} description={t('charges.intro')}>
          <p className="mb-2 text-sm font-medium" id="presets-label">
            {t('charges.presets')}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="presets-label">
            {CHARGE_CATEGORIES.map((cat) => (
              <Button key={cat} variant="outline" size="sm" className="h-10 rounded-full" onClick={() => addCharge(cat)}>
                <Plus aria-hidden /> {t(`chargeCat.${cat}` as TKey)}
              </Button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {draft.charges.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{t('charges.none')}</p>}
            {draft.charges.map((c, i) => (
              <ChargeCard key={c.id} charge={c} index={i} base={base} onChange={(p) => updateCharge(c.id, p)} onRemove={() => removeCharge(c.id)} />
            ))}
          </div>
          <Button variant="outline" className="mt-4 w-full sm:w-auto" onClick={() => addCharge('other')}>
            <Plus aria-hidden /> {t('charges.addCustom')}
          </Button>
        </Section>

        <Section title={t('charges.allListed')}>
          <Segmented
            aria-label={t('charges.allListed')}
            columns={2}
            value={draft.allChargesListed}
            onValueChange={(v) => setDraft((d) => ({ ...d, allChargesListed: v }))}
            options={[
              { value: 'yes', label: t('charges.allListedYes') },
              { value: 'unsure', label: t('charges.allListedUnsure') },
            ]}
          />
        </Section>
    </div>
  )
}

function ChargeCard({
  charge: c,
  index,
  base,
  onChange,
  onRemove,
}: {
  charge: ChargeDraft
  index: number
  base: number
  onChange: (p: Partial<ChargeDraft>) => void
  onRemove: () => void
}) {
  const { t } = useI18n()
  const rupees = chargeRupees(c, base)
  const pid = `chg-${index}`
  return (
    <div className="rounded-lg border bg-background/60 p-3 sm:p-4" role="group" aria-label={c.name || t('charges.name')}>
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <Field id={`${pid}-name`} label={t('charges.name')}>
            {({ id }) => <Input id={id} value={c.name} maxLength={60} onChange={(e) => onChange({ name: e.target.value })} />}
          </Field>
          <Field id={`${pid}-amount`} label={t('charges.amount')}>
            {({ id, describedBy }) => (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_7.5rem] gap-2">
                  {c.amountMode === 'rupees' ? (
                    <MoneyBox id={id} describedBy={describedBy} value={c.amount} onChange={(v) => onChange({ amount: v })} allowUnknown showWords={false} />
                  ) : (
                    <NumberBox id={id} describedBy={describedBy} suffix="%" value={c.amount} onChange={(v) => onChange({ amount: v })} allowUnknown max={100} />
                  )}
                  <ChoiceSelect
                    id={`${pid}-mode`}
                    value={c.amountMode}
                    onValueChange={(v) => onChange({ amountMode: v, amount: { ...c.amount, value: null } })}
                    options={[
                      { value: 'rupees', label: t('unit.rupees') },
                      { value: 'percent', label: t('unit.percentOfLoan') },
                    ]}
                  />
                </div>
                {c.amountMode === 'percent' && rupees !== null && <p className="num text-xs text-muted-foreground">{t('charges.equalsRupees', { value: formatINR(rupees) })}</p>}
              </div>
            )}
          </Field>
          <Field id={`${pid}-payment`} label={t('charges.payment')}>
            {({ id, labelId }) => <ChoiceSelect id={id} labelId={labelId} value={c.payment} onValueChange={(v) => onChange({ payment: v })} options={O.paymentOptions(t)} />}
          </Field>
          <Field id={`${pid}-gst`} label={t('charges.gst')}>
            {({ id, labelId }) => <ChoiceSelect id={id} labelId={labelId} value={c.gst} onValueChange={(v) => onChange({ gst: v })} options={O.gstOptions(t)} />}
          </Field>
          {c.gst === 'additional' && (
            <Field id={`${pid}-gstAmount`} label={t('charges.gstAmount')} className="sm:col-span-2">
              {({ id, describedBy }) => (
                <div className="space-y-2">
                  <MoneyBox id={id} describedBy={describedBy} value={c.gstAmount} onChange={(v) => onChange({ gstAmount: v })} allowUnknown showWords={false} />
                  {rupees !== null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChange({ gstAmount: num(Math.round(rupees * 0.18 * 100) / 100, true) })}
                      title={t('charges.gstEstimateHelp')}
                    >
                      <Wand2 aria-hidden /> {t('charges.gstEstimate')}
                    </Button>
                  )}
                  {c.gstAmount.estimate && <p className="text-xs text-warning">{t('charges.gstEstimateHelp')}</p>}
                </div>
              )}
            </Field>
          )}
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-danger" onClick={onRemove} aria-label={t('charges.remove', { name: c.name })}>
          <Trash2 aria-hidden />
        </Button>
      </div>
      <Accordion type="single" collapsible className="mt-2">
        <AccordionItem value="more" className="border-b-0">
          <AccordionTrigger className="min-h-10 py-2 text-muted-foreground">{t('charges.more')}</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${pid}-mandatory`} label={t('charges.mandatory')} as="fieldset">
                {({ labelId }) => <Segmented aria-labelledby={labelId} columns={3} value={c.mandatory} onValueChange={(v) => onChange({ mandatory: v })} options={O.ynuOptions(t)} />}
              </Field>
              <Field id={`${pid}-recipient`} label={t('charges.recipient')}>
                {({ id, labelId }) => <ChoiceSelect id={id} labelId={labelId} value={c.recipient} onValueChange={(v) => onChange({ recipient: v })} options={O.recipientOptions(t)} />}
              </Field>
              <Field id={`${pid}-inKfs`} label={t('charges.inKfs')} as="fieldset" className="sm:col-span-2">
                {({ labelId }) => <Segmented aria-labelledby={labelId} columns={3} value={c.inKfs} onValueChange={(v) => onChange({ inKfs: v })} options={O.ynuOptions(t)} />}
              </Field>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
