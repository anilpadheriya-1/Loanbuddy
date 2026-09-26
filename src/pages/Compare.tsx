import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { z } from 'zod/mini'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Alert } from '@/components/ui/alert'
import { Field } from '@/components/loan/Field'
import { ChoiceSelect } from '@/components/loan/ChoiceSelect'
import { MoneyBox, NumberBox, PercentBox } from '@/components/loan/inputs'
import { Disclaimer } from '@/components/layout/Disclaimer'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { draftToInput } from '@/features/check-loan/draft'
import { newOffer, offerInput, QuickOfferSchema, type QuickOffer } from '@/features/compare/offers'
import { buildReport, differenceFromLowest, sortComparison, toComparisonRow, type CompareSortKey, type ComparisonRow } from '@/lib/finance'
import { formatINR, formatMonths, formatPct } from '@/lib/format'
import { PREF_KEYS, readPref, repository, writePref } from '@/lib/storage'

const StoredSchema = z.array(QuickOfferSchema)

function loadOffers(): QuickOffer[] {
  try {
    const parsed = StoredSchema.safeParse(JSON.parse(readPref(PREF_KEYS.compare) ?? 'null'))
    if (parsed.success && parsed.data.length >= 2) return parsed.data
  } catch {
    /* ignore */
  }
  return [
    newOffer('Loan A', { rate: { value: 11.5, unknown: false }, processing: { value: 10_000, unknown: false }, insurance: { value: 8_000, unknown: false } }),
    newOffer('Loan B', { rate: { value: 12.25, unknown: false }, processing: { value: 2_500, unknown: false } }),
  ]
}

const SORTS: { value: CompareSortKey; label: string }[] = [
  { value: 'effective', label: 'Lowest effective cost' },
  { value: 'repayment', label: 'Lowest total repayment' },
  { value: 'emi', label: 'Lowest EMI' },
  { value: 'tenure', label: 'Shortest tenure' },
]

export default function ComparePage() {
  usePageTitle('Compare Loans')
  const saved = useMemo(() => repository.listSaved(), [])
  const [offers, setOffers] = useState<QuickOffer[]>(loadOffers)
  const [sort, setSort] = useState<CompareSortKey>('effective')
  useEffect(() => writePref(PREF_KEYS.compare, JSON.stringify(offers)), [offers])

  const rows: ComparisonRow[] = useMemo(
    () =>
      offers.map((o) => {
        const s = o.kind === 'saved' ? saved.find((x) => x.id === o.savedId) : undefined
        const input = s ? draftToInput(s.draft) : offerInput(o)
        const r = buildReport(input)
        return toComparisonRow(o.id, s ? s.label : o.label, input, r.analysis, r.score, r.confidence.level)
      }),
    [offers, saved],
  )
  const sorted = sortComparison(rows, sort)
  const update = (id: string, patch: Partial<QuickOffer>) => setOffers((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)))

  const diff = (metric: keyof ComparisonRow) => differenceFromLowest(rows, metric)
  const dEff = diff('effectivePct')
  const dRep = diff('totalRepayment')
  const dCost = diff('totalCost')

  const metrics: { label: string; render: (r: ComparisonRow) => React.ReactNode }[] = [
    { label: 'Quoted rate', render: (r) => (r.quotedRatePct === null ? '—' : formatPct(r.quotedRatePct)) },
    { label: 'Rate type', render: (r) => r.rateType },
    { label: 'Estimated effective annualized cost', render: (r) => <Emph value={r.effectivePct === null ? '—' : formatPct(r.effectivePct)} diff={dEff.get(r.id)} fmt={(d) => `+${d.toFixed(2)} pp`} /> },
    { label: 'EMI', render: (r) => formatINR(r.emi) },
    { label: 'Tenure', render: (r) => formatMonths(r.tenurePeriods) },
    { label: 'Net amount received', render: (r) => formatINR(r.netReceived) },
    { label: 'Processing fees', render: (r) => formatINR(r.processingFees) },
    { label: 'Insurance', render: (r) => formatINR(r.insurance) },
    { label: 'All charges', render: (r) => formatINR(r.totalCharges) },
    { label: 'Total interest', render: (r) => formatINR(r.totalInterest) },
    { label: 'Total repayment', render: (r) => <Emph value={formatINR(r.totalRepayment)} diff={dRep.get(r.id)} fmt={(d) => `+${formatINR(d)}`} /> },
    { label: 'Total cost of borrowing', render: (r) => <Emph value={formatINR(r.totalCost)} diff={dCost.get(r.id)} fmt={(d) => `+${formatINR(d)}`} /> },
    { label: 'Foreclosure charge', render: (r) => (r.prepaymentKnown && r.prepaymentCharge ? (r.prepaymentCharge.mode === 'percent' ? `${r.prepaymentCharge.value}%` : formatINR(r.prepaymentCharge.value)) : 'Unknown') },
    { label: 'Loan Deal Score', render: (r) => (r.score === null ? 'Withheld' : `${r.score} / 100`) },
    { label: 'Data confidence', render: (r) => r.confidence },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-10" lang="en">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Compare Loans</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Compare 2–3 offers on what they actually cost — not on the headline rate. We don’t pick a “best” loan: a lower EMI, a shorter tenure or better flexibility can each matter
          more to you than the lowest cost.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((o, i) => (
          <OfferCard key={o.id} offer={o} index={i} saved={saved.map((s) => ({ value: s.id, label: s.label }))} onChange={(p) => update(o.id, p)} onRemove={offers.length > 2 ? () => setOffers((os) => os.filter((x) => x.id !== o.id)) : undefined} />
        ))}
        {offers.length < 3 && (
          <button
            type="button"
            onClick={() => setOffers((os) => [...os, newOffer(`Loan ${String.fromCharCode(65 + os.length)}`)])}
            className="flex min-h-40 items-center justify-center gap-2 rounded-xl border-2 border-dashed text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus aria-hidden /> Add Loan {String.fromCharCode(65 + offers.length)}
          </button>
        )}
      </div>

      <section className="rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="cmp-t">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="cmp-t" className="text-lg font-semibold">
            Side by side
          </h2>
          <div className="w-60">
            <ChoiceSelect id="sort" value={sort} onValueChange={setSort} options={SORTS} />
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">Loan comparison, ordered by {SORTS.find((s) => s.value === sort)?.label.toLowerCase()}</caption>
            <thead className="bg-muted/60">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Metric
                </th>
                {sorted.map((r) => (
                  <th key={r.id} scope="col" className="px-3 py-2 text-right font-semibold">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="num">
              {metrics.map((m) => (
                <tr key={m.label} className="border-t">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    {m.label}
                  </th>
                  {sorted.map((r) => (
                    <td key={r.id} className="px-3 py-2 text-right">
                      {m.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Alert tone="info" className="mt-4">
          Small grey figures show how much more an offer costs than the lowest one on that line. Consider EMI affordability, tenure, prepayment flexibility and the lender’s service —
          not just cost.
        </Alert>
      </section>
      <Disclaimer />
    </div>
  )
}

function Emph({ value, diff, fmt }: { value: string; diff?: number; fmt: (d: number) => string }) {
  return (
    <span className="inline-flex flex-col items-end">
      <span className="font-semibold">{value}</span>
      {diff !== undefined && diff > 0.004 && <span className="text-xs text-muted-foreground">{fmt(diff)}</span>}
    </span>
  )
}

function OfferCard({
  offer: o,
  index,
  saved,
  onChange,
  onRemove,
}: {
  offer: QuickOffer
  index: number
  saved: { value: string; label: string }[]
  onChange: (p: Partial<QuickOffer>) => void
  onRemove?: () => void
}) {
  const p = `o${index}`
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4" aria-label={o.label}>
      <div className="flex items-center gap-2">
        <Input aria-label="Offer name" value={o.label} maxLength={40} onChange={(e) => onChange({ label: e.target.value })} className="font-semibold" />
        {onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${o.label}`} className="shrink-0 text-muted-foreground hover:text-danger">
            <Trash2 aria-hidden />
          </Button>
        )}
      </div>
      <Segmented
        aria-label="Offer source"
        columns={2}
        value={o.kind}
        onValueChange={(k) => onChange({ kind: k, savedId: k === 'saved' ? saved[0]?.value ?? '' : o.savedId })}
        options={[
          { value: 'quick', label: 'Quick entry' },
          { value: 'saved', label: 'Saved loan' },
        ]}
      />
      {o.kind === 'saved' ? (
        saved.length ? (
          <ChoiceSelect id={`${p}-saved`} value={o.savedId} onValueChange={(v) => onChange({ savedId: v })} options={saved} />
        ) : (
          <p className="text-sm text-muted-foreground">No saved loans yet. Save one from a Loan Cost Report.</p>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${p}-amt`} label="Loan amount" className="col-span-2">
            {({ id }) => <MoneyBox id={id} value={o.amount} onChange={(v) => onChange({ amount: v })} />}
          </Field>
          <Field id={`${p}-rate`} label="Quoted rate">
            {({ id }) => <PercentBox id={id} value={o.rate} onChange={(v) => onChange({ rate: v })} />}
          </Field>
          <Field id={`${p}-method`} label="Method">
            {({ id }) => (
              <ChoiceSelect
                id={id}
                value={o.method}
                onValueChange={(v) => onChange({ method: v })}
                options={[
                  { value: 'reducing', label: 'Reducing' },
                  { value: 'flat', label: 'Flat' },
                ]}
              />
            )}
          </Field>
          <Field id={`${p}-months`} label="Tenure (months)">
            {({ id }) => <NumberBox id={id} decimals={0} value={o.months} onChange={(v) => onChange({ months: v })} />}
          </Field>
          <Field id={`${p}-type`} label="Rate type">
            {({ id }) => (
              <ChoiceSelect
                id={id}
                value={o.rateType}
                onValueChange={(v) => onChange({ rateType: v })}
                options={[
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'floating', label: 'Floating' },
                  { value: 'unknown', label: 'Unknown' },
                ]}
              />
            )}
          </Field>
          <Field id={`${p}-emi`} label="EMI (if quoted)" className="col-span-2" optional>
            {({ id }) => <MoneyBox id={id} showWords={false} value={o.emi} onChange={(v) => onChange({ emi: v })} />}
          </Field>
          <Field id={`${p}-pf`} label="Processing fee (₹)">
            {({ id }) => <MoneyBox id={id} showWords={false} value={o.processing} onChange={(v) => onChange({ processing: v })} allowUnknown />}
          </Field>
          <Field id={`${p}-ins`} label="Insurance (₹)">
            {({ id }) => <MoneyBox id={id} showWords={false} value={o.insurance} onChange={(v) => onChange({ insurance: v })} allowUnknown />}
          </Field>
          <Field id={`${p}-oth`} label="Other charges (₹)">
            {({ id }) => <MoneyBox id={id} showWords={false} value={o.other} onChange={(v) => onChange({ other: v })} allowUnknown />}
          </Field>
          <Field id={`${p}-fc`} label="Foreclosure %">
            {({ id }) => <PercentBox id={id} value={o.foreclosurePct} onChange={(v) => onChange({ foreclosurePct: v })} allowUnknown />}
          </Field>
        </div>
      )}
    </section>
  )
}
