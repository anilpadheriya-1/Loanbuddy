import { useMemo } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, Circle, Clock, HelpCircle, MessageSquareWarning, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Segmented } from '@/components/ui/segmented'
import { Field } from '@/components/loan/Field'
import { MoneyBox, NumberBox, PercentBox } from '@/components/loan/inputs'
import * as O from '@/components/loan/options'
import { Disclaimer } from '@/components/layout/Disclaimer'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { RequestLetter } from '@/components/ask-lender/RequestLetter'
import { LiveRoi, MobileRoiBar } from '@/components/ask-lender/LiveRoi'
import { PrepaymentRuleCard } from '@/components/results/PrepaymentRuleCard'
import { ChoiceSelect } from '@/components/loan/ChoiceSelect'
import { useDraft } from '@/features/check-loan/DraftContext'
import { useReport } from '@/features/check-loan/useReport'
import { emptyNum, type LoanDraft, type NumField } from '@/features/check-loan/draft'
import { findCharge, GROUP_ORDER, itemStatus, REQUEST_ITEMS, type ItemStatus, type RequestItem } from '@/features/ask-lender/items'
import { emiCountField, markManyAsked, penalField, setCharge, setEmiCount, setPenal, toggleRequest } from '@/features/ask-lender/mapping'
import { useI18n, type TKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const STATUS_ICON: Record<ItemStatus, typeof Circle> = { received: CheckCircle2, asked: Clock, refused: MessageSquareWarning, todo: Circle }
const STATUS_VARIANT = { received: 'success', asked: 'info', refused: 'warning', todo: 'muted' } as const

export default function AskLenderPage() {
  const { t } = useI18n()
  usePageTitle(t('nav.ask'))
  const { draft, setDraft } = useDraft()
  const report = useReport(draft)
  const statuses = useMemo(() => new Map(REQUEST_ITEMS.map((it) => [it.id, itemStatus(draft, it)])), [draft])
  const received = [...statuses.values()].filter((s) => s === 'received').length
  const refused = REQUEST_ITEMS.filter((it) => statuses.get(it.id) === 'refused')
  const apply = (fn: (d: LoanDraft) => LoanDraft) => setDraft(fn)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:pt-10 lg:pb-10">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('ask.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('ask.intro')}</p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="step1" className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
            <h2 id="step1" className="text-lg font-semibold">
              {t('ask.step1')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('ask.step1Body')}</p>
            <div className="mt-4">
              <RequestLetter draft={draft} onLenderName={(name) => apply((d) => ({ ...d, lenderName: name }))} onMarkAsked={(ids) => apply((d) => markManyAsked(d, ids))} />
            </div>
            <div className="mt-5 rounded-lg bg-muted/60 p-4 text-sm">
              <p className="font-semibold">{t('ask.tipsTitle')}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {(['ask.tip1', 'ask.tip2', 'ask.tip3', 'ask.tip4'] as TKey[]).map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="step2" className="space-y-4">
            <div className="px-1">
              <h2 id="step2" className="text-lg font-semibold">
                {t('ask.step2')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('ask.step2Body')}</p>
            </div>
            {GROUP_ORDER.map((group) => (
              <div key={group} className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
                <h3 className="font-semibold">{t(`ask.group.${group}` as TKey)}</h3>
                <ul className="mt-3 divide-y">
                  {REQUEST_ITEMS.filter((it) => it.group === group).map((it) => (
                    <ItemRow key={it.id} item={it} status={statuses.get(it.id)!} draft={draft} apply={apply} />
                  ))}
                </ul>
                {group === 'prepayment' && report && <PrepaymentRuleCard rule={report.prepaymentRule} className="mt-4" />}
              </div>
            ))}
          </section>

          <section aria-labelledby="refused" className="rounded-xl border border-warning/30 bg-warning-soft p-4 sm:p-6">
            <h2 id="refused" className="flex items-center gap-2 text-lg font-semibold">
              <HelpCircle className="size-5 text-warning" aria-hidden /> {t('ask.refusedTitle')}
            </h2>
            {refused.length > 0 && <p className="mt-2 text-sm font-medium">{t('ask.refusedList', { items: refused.map((r) => t(r.label)).join(', ') })}</p>}
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
              {(['ask.refused1', 'ask.refused2', 'ask.refused3', 'ask.refused4'] as TKey[]).map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/help">{t('ask.refusedCta')}</Link>
              </Button>
              <Button asChild variant="link" size="sm">
                <Link to="/rules#rbi-rbc-banks-2025">{t('rule.viewSources')}</Link>
              </Button>
            </div>
          </section>
          <Disclaimer />
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <LiveRoi report={report} lenderAprPct={draft.lenderApr && !draft.lenderApr.unknown ? draft.lenderApr.value : null} received={received} total={REQUEST_ITEMS.length} />
        </div>
      </div>
      <MobileRoiBar report={report} />
    </div>
  )
}

function ItemRow({ item, status, draft, apply }: { item: RequestItem; status: ItemStatus; draft: LoanDraft; apply: (fn: (d: LoanDraft) => LoanDraft) => void }) {
  const { t } = useI18n()
  const Icon = STATUS_ICON[status]
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium">{t(item.label)}</p>
        <Badge variant={STATUS_VARIANT[status]}>
          <Icon aria-hidden /> {t(`ask.status.${status}` as TKey)}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-semibold">{t('ask.whyLabel')}</span> {t(item.why)} <span className="font-semibold">{t('ask.whereLabel')}</span> {t(item.where)}
      </p>
      <div className="mt-3">
        <ItemFields id={item.id} draft={draft} apply={apply} />
      </div>
      {status !== 'received' && (
        <div className="mt-2 flex flex-wrap gap-2">
          {status === 'todo' && (
            <Button variant="ghost" size="sm" onClick={() => apply((d) => toggleRequest(d, 'asked', item.id, true))}>
              <Clock aria-hidden /> {t('ask.markAskedOne')}
            </Button>
          )}
          {status !== 'refused' ? (
            <Button variant="ghost" size="sm" className="text-warning" onClick={() => apply((d) => toggleRequest(d, 'refused', item.id, true))}>
              <MessageSquareWarning aria-hidden /> {t('ask.markRefused')}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => apply((d) => toggleRequest(d, 'refused', item.id, false))}>
              <Undo2 aria-hidden /> {t('ask.undo')}
            </Button>
          )}
          {status === 'asked' && (
            <Button variant="ghost" size="sm" onClick={() => apply((d) => toggleRequest(d, 'asked', item.id, false))}>
              <Undo2 aria-hidden /> {t('ask.undo')}
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

/** The input(s) for each requested detail. All values go into the shared Check My Loan draft. */
function ItemFields({ id, draft: d, apply }: { id: string; draft: LoanDraft; apply: (fn: (d: LoanDraft) => LoanDraft) => void }) {
  const { t } = useI18n()
  const set = (patch: Partial<LoanDraft>) => apply((x) => ({ ...x, ...patch }))
  const pid = `ask-${id}`
  const check = (label: TKey, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-background/60 px-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} /> {t(label)}
    </label>
  )
  const grid = (children: React.ReactNode) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>

  switch (id) {
    case 'kfs':
      return check('ask.field.kfsHave', d.documents.kfs, (v) => set({ documents: { ...d.documents, kfs: v } }))
    case 'schedule':
      return check('ask.field.scheduleHave', d.documents.amortizationSchedule, (v) => set({ documents: { ...d.documents, amortizationSchedule: v } }))
    case 'grievance':
      return check('ask.field.grievanceHave', (d.requests?.received ?? []).includes('grievance'), (v) => apply((x) => toggleRequest(x, 'received', 'grievance', v)))
    case 'sanctioned':
      return (
        <Field id={pid} label={t('field.sanctionedAmount')}>
          {({ id: fid }) => <MoneyBox id={fid} value={d.sanctionedAmount} onChange={(v) => set({ sanctionedAmount: v })} />}
        </Field>
      )
    case 'net':
      return (
        <Field id={pid} label={t('field.netReceived')}>
          {({ id: fid }) => <MoneyBox id={fid} value={d.netReceived} onChange={(v) => set({ netReceived: v })} allowUnknown />}
        </Field>
      )
    case 'rate':
      return grid(
        <>
          <Field id={pid} label={t('field.quotedRate')}>
            {({ id: fid }) => <PercentBox id={fid} value={d.quotedRate} onChange={(v) => set({ quotedRate: v })} max={60} />}
          </Field>
          <Field id={`${pid}-method`} label={t('field.rateMethod')}>
            {({ id: fid, labelId }) => <ChoiceSelect id={fid} labelId={labelId} value={d.rateMethod} onValueChange={(v) => set({ rateMethod: v })} options={O.rateMethodOptions(t)} />}
          </Field>
          <Field id={`${pid}-type`} label={t('field.rateType')} className="sm:col-span-2" as="fieldset">
            {({ labelId }) => <Segmented aria-labelledby={labelId} columns={4} value={d.rateType} onValueChange={(v) => set({ rateType: v })} options={O.rateTypeOptions(t)} />}
          </Field>
        </>,
      )
    case 'emi':
      return grid(
        <>
          <Field id={pid} label={t('field.emi')}>
            {({ id: fid }) => <MoneyBox id={fid} value={d.emi} onChange={(v) => set({ emi: v })} showWords={false} />}
          </Field>
          <Field id={`${pid}-count`} label={t('ask.field.emiCount')}>
            {({ id: fid }) => <NumberBox id={fid} decimals={0} value={emiCountField(d)} onChange={(v) => apply((x) => setEmiCount(x, v))} />}
          </Field>
        </>,
      )
    case 'apr':
      return (
        <Field id={pid} label={t('ask.field.lenderApr')}>
          {({ id: fid }) => <PercentBox id={fid} value={d.lenderApr ?? emptyNum()} onChange={(v) => set({ lenderApr: v })} max={100} />}
        </Field>
      )
    case 'processing': {
      const c = findCharge(d, 'processing')
      return grid(
        <>
          <Field id={pid} label={t('ask.field.processing')}>
            {({ id: fid }) => (
              <MoneyBox
                id={fid}
                showWords={false}
                value={c?.amount ?? emptyNum()}
                onChange={(v) => apply((x) => setCharge(x, 'processing', t('chargeCat.processing'), { amount: v, mandatory: c?.mandatory ?? 'yes', recipient: 'lender' }))}
              />
            )}
          </Field>
          <Field id={`${pid}-gst`} label={t('ask.field.processingGst')}>
            {({ id: fid, labelId }) => (
              <ChoiceSelect
                id={fid}
                labelId={labelId}
                value={c?.gst ?? 'unknown'}
                onValueChange={(v) => apply((x) => setCharge(x, 'processing', t('chargeCat.processing'), { gst: v }))}
                options={O.gstOptions(t)}
              />
            )}
          </Field>
        </>,
      )
    }
    case 'insurance': {
      const c = findCharge(d, 'insurance')
      return grid(
        <>
          <Field id={pid} label={t('ask.field.insurance')}>
            {({ id: fid }) => (
              <MoneyBox
                id={fid}
                showWords={false}
                value={c?.amount ?? emptyNum()}
                onChange={(v) => apply((x) => setCharge(x, 'insurance', t('chargeCat.insurance'), { amount: v, gst: c?.gst ?? 'included', recipient: 'insurer' }))}
              />
            )}
          </Field>
          <Field id={`${pid}-mandatory`} label={t('ask.field.insuranceMandatory')} as="fieldset">
            {({ labelId }) => (
              <div className={cn(!c && 'pointer-events-none opacity-50')} aria-disabled={!c || undefined}>
                <Segmented
                  aria-labelledby={labelId}
                  columns={3}
                  value={c?.mandatory ?? 'unknown'}
                  onValueChange={(v) => apply((x) => setCharge(x, 'insurance', t('chargeCat.insurance'), { mandatory: v }))}
                  options={O.ynuOptions(t)}
                />
              </div>
            )}
          </Field>
        </>,
      )
    }
    case 'other': {
      const c = findCharge(d, 'other')
      return (
        <div className="space-y-3">
          <Field id={pid} label={t('ask.field.other')}>
            {({ id: fid }) => (
              <MoneyBox
                id={fid}
                showWords={false}
                value={c?.amount ?? emptyNum()}
                onChange={(v) => apply((x) => setCharge(x, 'other', t('chargeCat.other'), { amount: v, gst: c?.gst ?? 'included' }))}
              />
            )}
          </Field>
          {check('ask.field.allListed', d.allChargesListed === 'yes', (v) => set({ allChargesListed: v ? 'yes' : 'unsure' }))}
        </div>
      )
    }
    case 'penal':
      return (
        <Field id={pid} label={t('ask.field.penal')}>
          {({ id: fid }) => <MoneyBox id={fid} showWords={false} value={penalField(d)} onChange={(v: NumField) => apply((x) => setPenal(x, v, t('contingent.kind.bounce')))} />}
        </Field>
      )
    case 'prepayment':
      return grid(
        <>
          <Field id={`${pid}-allowed`} label={t('field.partAllowed')} as="fieldset" className="sm:col-span-2">
            {({ labelId }) => (
              <Segmented
                aria-labelledby={labelId}
                columns={3}
                value={d.prepayment.partAllowed}
                onValueChange={(v) => set({ prepayment: { ...d.prepayment, partAllowed: v } })}
                options={O.ynuOptions(t)}
              />
            )}
          </Field>
          <Field id={pid} label={t('ask.field.partCharge')}>
            {({ id: fid }) => (
              <PercentBox id={fid} value={d.prepayment.partCharge.value} onChange={(v) => set({ prepayment: { ...d.prepayment, partCharge: { mode: 'percent', value: v } } })} />
            )}
          </Field>
          <Field id={`${pid}-min`} label={t('field.minPart')} optional>
            {({ id: fid }) => <MoneyBox id={fid} value={d.prepayment.minPart} onChange={(v) => set({ prepayment: { ...d.prepayment, minPart: v } })} />}
          </Field>
        </>,
      )
    case 'foreclosure':
      return grid(
        <>
          <Field id={pid} label={t('ask.field.foreclosure')}>
            {({ id: fid }) => (
              <PercentBox id={fid} value={d.prepayment.foreclosure.value} onChange={(v) => set({ prepayment: { ...d.prepayment, foreclosure: { mode: 'percent', value: v } } })} />
            )}
          </Field>
          <Field id={`${pid}-lock`} label={t('field.lockIn')}>
            {({ id: fid }) => (
              <NumberBox
                id={fid}
                decimals={0}
                suffix={t('common.months')}
                value={d.prepayment.lockInMonths}
                onChange={(v) => set({ prepayment: { ...d.prepayment, lockInMonths: v } })}
              />
            )}
          </Field>
        </>,
      )
    default:
      return null
  }
}
