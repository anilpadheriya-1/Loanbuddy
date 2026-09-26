import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Segmented } from '@/components/ui/segmented'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Field } from '@/components/loan/Field'
import { MoneyBox, NumberBox, PercentBox } from '@/components/loan/inputs'
import { ChoiceSelect } from '@/components/loan/ChoiceSelect'
import { Disclaimer } from '@/components/layout/Disclaimer'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { LabCard, Metric, ScenarioOutcome, months } from '@/components/savings/shared'
import { useDraft } from '@/features/check-loan/DraftContext'
import { draftToInput, emptyNum, num, type NumField } from '@/features/check-loan/draft'
import { repository } from '@/lib/storage'
import {
  annualLumpSumScenario,
  balanceTransfer,
  buildReport,
  contingentCost,
  extraPaymentScenario,
  lumpSumScenario,
  optionalChargeImpacts,
  rateChangeScenario,
  savingsState,
  tenureVsEmi,
  valueOf,
  type ChargeRate,
  type LoanInput,
  type LoanState,
} from '@/lib/finance'
import { formatINR, formatPct, formatPp } from '@/lib/format'

type SourceKind = 'current' | 'saved' | 'manual'
const n = (f: NumField) => (f.unknown || f.value === null ? null : f.value)

export default function SavingsPage() {
  usePageTitle('Savings Lab — How can I pay less?')
  const { draft, hasContent } = useDraft()
  const saved = useMemo(() => repository.listSaved(), [])
  const [source, setSource] = useState<SourceKind>(hasContent ? 'current' : saved.length ? 'saved' : 'manual')
  const [savedId, setSavedId] = useState(saved[0]?.id ?? '')
  const [manual, setManual] = useState({ outstanding: num(20_00_000), rate: num(9), months: num(180), emi: emptyNum() })

  const input: LoanInput | null = useMemo(() => {
    if (source === 'current') return hasContent ? draftToInput(draft) : null
    if (source === 'saved') {
      const s = saved.find((x) => x.id === savedId)
      return s ? draftToInput(s.draft) : null
    }
    return null
  }, [source, draft, hasContent, saved, savedId])

  const state: LoanState | null = useMemo(() => {
    if (source === 'manual') {
      const o = n(manual.outstanding)
      const r = n(manual.rate)
      const m = n(manual.months)
      if (!o || r === null || !m) return null
      return { outstanding: o, annualRatePct: r, remainingPeriods: Math.round(m), emi: n(manual.emi) ?? undefined, periodsPerYear: 12 }
    }
    if (!input) return null
    const report = buildReport(input)
    return savingsState(input, report.analysis, report.existing)
  }, [source, manual, input])

  const terms = input?.prepayment
  const defaultPartCharge = (terms && valueOf(terms.partPrepaymentCharge)) || null
  const defaultGst = (terms && valueOf(terms.gstOnChargesPct)) ?? 0

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10" lang="en">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">How Can I Pay Less?</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Try strategies on your own loan and see interest saved, months saved, the charges each strategy causes, and the net result. Nothing here tells you to prepay — it shows when it
          pays off.
        </p>
      </header>

      <section className="rounded-xl border bg-card p-4 sm:p-6" aria-labelledby="src-t">
        <h2 id="src-t" className="font-semibold">
          Which loan?
        </h2>
        <Segmented
          aria-label="Loan source"
          className="mt-3 grid grid-cols-1 sm:grid-cols-3"
          value={source}
          onValueChange={setSource}
          options={[
            { value: 'current', label: 'My current Check My Loan', description: hasContent ? undefined : 'Nothing entered yet' },
            { value: 'saved', label: 'A saved loan', description: saved.length ? `${saved.length} saved` : 'None saved yet' },
            { value: 'manual', label: 'Quick entry' },
          ]}
        />
        {source === 'saved' && saved.length > 0 && (
          <div className="mt-4 max-w-sm">
            <ChoiceSelect id="saved-pick" value={savedId} onValueChange={setSavedId} options={saved.map((s) => ({ value: s.id, label: s.label }))} />
          </div>
        )}
        {source === 'manual' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Field id="m-out" label="Outstanding principal">
              {({ id }) => <MoneyBox id={id} value={manual.outstanding} onChange={(v) => setManual((m) => ({ ...m, outstanding: v }))} />}
            </Field>
            <Field id="m-rate" label="Interest rate (reducing)">
              {({ id }) => <PercentBox id={id} value={manual.rate} onChange={(v) => setManual((m) => ({ ...m, rate: v }))} />}
            </Field>
            <Field id="m-months" label="Remaining months">
              {({ id }) => <NumberBox id={id} decimals={0} value={manual.months} onChange={(v) => setManual((m) => ({ ...m, months: v }))} />}
            </Field>
            <Field id="m-emi" label="Current EMI" optional>
              {({ id }) => <MoneyBox id={id} showWords={false} value={manual.emi} onChange={(v) => setManual((m) => ({ ...m, emi: v }))} />}
            </Field>
          </div>
        )}
        {state ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Metric label="Outstanding" value={formatINR(state.outstanding)} />
            <Metric label="Rate used" value={formatPct(state.annualRatePct)} />
            <Metric label="Remaining" value={months(state.remainingPeriods)} />
            <Metric label="EMI" value={formatINR(state.emi ?? 0)} />
          </dl>
        ) : (
          <Alert tone="info" className="mt-4">
            {source === 'current' ? (
              <>
                Enter a loan in <Link className="text-brand underline" to="/check-loan">Check My Loan</Link> first, or use Quick entry.
              </>
            ) : (
              'Enter the outstanding amount, rate and remaining months to start.'
            )}
          </Alert>
        )}
      </section>

      {state && (
        <>
          <nav aria-label="Strategies" className="flex flex-wrap gap-2">
            {[
              ['extra', 'Extra every month'],
              ['lump', 'One-time prepayment'],
              ['annual', 'Annual lump sum'],
              ['tenure-emi', 'Reduce EMI vs tenure'],
              ['rate', 'Lower rate'],
              ['bt', 'Balance transfer'],
              ['optional', 'Optional charges'],
              ['penalties', 'Late & bounce costs'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="inline-flex min-h-9 items-center rounded-full border bg-card px-3 text-sm hover:bg-accent">
                {label}
              </a>
            ))}
          </nav>
          <ExtraMonthly state={state} />
          <LumpSum state={state} defaultCharge={defaultPartCharge} defaultGst={defaultGst} />
          <AnnualLump state={state} defaultCharge={defaultPartCharge} defaultGst={defaultGst} />
          <TenureVsEmi state={state} defaultCharge={defaultPartCharge} defaultGst={defaultGst} />
          <RateChange state={state} />
          <BalanceTransfer state={state} defaultForeclosure={(terms && valueOf(terms.foreclosureCharge)) || null} defaultGst={defaultGst} />
          <OptionalCharges input={input} />
          <Penalties input={input} />
        </>
      )}
      <Disclaimer />
    </div>
  )
}

const CHIPS = [1_000, 2_000, 5_000, 10_000, 20_000]

function ExtraMonthly({ state }: { state: LoanState }) {
  const [extra, setExtra] = useState(5_000)
  const r = useMemo(() => extraPaymentScenario(state, extra), [state, extra])
  const max = Math.max(50_000, Math.round((state.emi ?? 0) / 1000) * 1000)
  return (
    <LabCard
      id="extra"
      title="Pay a little extra every month"
      description="Extra money goes straight to principal, so the loan ends sooner and total interest falls."
      notWorth="If you have no emergency fund, carry costlier debt (credit cards), or can reliably earn more after tax elsewhere, extra payments may not be the best use of money."
    >
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="extra-slider" className="text-sm font-medium">
            How much extra can you pay every month?
          </label>
          <span className="num text-xl font-bold text-savings">{formatINR(extra)}</span>
        </div>
        <Slider id="extra-slider" aria-label="Extra payment per month" min={0} max={max} step={500} value={[extra]} onValueChange={(v) => setExtra(v[0])} />
        <div className="flex flex-wrap gap-2">
          {[0, ...CHIPS].map((c) => (
            <Button key={c} variant={c === extra ? 'secondary' : 'outline'} size="sm" onClick={() => setExtra(c)} aria-pressed={c === extra}>
              {formatINR(c)}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-lg">
        Save <strong className="num text-savings">{formatINR(r.interestSaved)}</strong> interest · finish <strong className="num">{months(r.periodsSaved)}</strong> earlier · net
        benefit <strong className="num text-savings">{formatINR(r.netSavings)}</strong>
      </p>
      <ScenarioOutcome r={r} />
    </LabCard>
  )
}

function ChargeEditor({
  charge,
  setCharge,
  gst,
  setGst,
  idPrefix,
}: {
  charge: ChargeRate | null
  setCharge: (c: ChargeRate | null) => void
  gst: number
  setGst: (g: number) => void
  idPrefix: string
}) {
  const mode = charge?.mode ?? 'percent'
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id={`${idPrefix}-charge`} label="Prepayment charge" hint="Leave 0 if none applies.">
        {({ id, describedBy }) => (
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <NumberBox
              id={id}
              describedBy={describedBy}
              value={num(charge?.value ?? 0)}
              suffix={mode === 'percent' ? '%' : undefined}
              prefix={mode === 'fixed' ? '₹' : undefined}
              onChange={(v) => setCharge({ mode, value: v.value ?? 0 } as ChargeRate)}
            />
            <ChoiceSelect
              id={`${idPrefix}-mode`}
              value={mode}
              onValueChange={(m) => setCharge({ mode: m, value: charge?.value ?? 0 } as ChargeRate)}
              options={[
                { value: 'percent', label: '% of prepaid' },
                { value: 'fixed', label: 'Fixed ₹' },
              ]}
            />
          </div>
        )}
      </Field>
      <Field id={`${idPrefix}-gst`} label="GST on charge (%)">
        {({ id }) => <PercentBox id={id} value={num(gst)} onChange={(v) => setGst(v.value ?? 0)} />}
      </Field>
    </div>
  )
}

function LumpSum({ state, defaultCharge, defaultGst }: { state: LoanState; defaultCharge: ChargeRate | null; defaultGst: number }) {
  const [amount, setAmount] = useState(num(Math.round(state.outstanding * 0.1)))
  const [at, setAt] = useState(num(1))
  const [recast, setRecast] = useState<'tenure' | 'emi'>('tenure')
  const [charge, setCharge] = useState<ChargeRate | null>(defaultCharge)
  const [gst, setGst] = useState(defaultGst)
  const r = useMemo(
    () => lumpSumScenario(state, { amount: amount.value ?? 0, atPeriod: at.value ?? 1, recast, charge, gstPct: gst }),
    [state, amount, at, recast, charge, gst],
  )
  const before = state.outstanding
  return (
    <LabCard
      id="lump"
      title="One-time part-prepayment"
      description="Pay a lump sum once (a bonus, maturity proceeds) towards principal."
      notWorth="If it empties your emergency fund, if a charge outweighs the saving, or if the loan is nearly finished and little interest remains."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="lump-amt" label="Prepayment amount">
          {({ id }) => <MoneyBox id={id} value={amount} onChange={setAmount} />}
        </Field>
        <Field id="lump-at" label="Made with EMI number" hint="1 = with your next EMI">
          {({ id, describedBy }) => <NumberBox id={id} describedBy={describedBy} decimals={0} value={at} onChange={setAt} />}
        </Field>
        <Field id="lump-recast" label="After prepaying, reduce…" as="fieldset">
          {({ labelId }) => (
            <Segmented
              aria-labelledby={labelId}
              columns={2}
              value={recast}
              onValueChange={setRecast}
              options={[
                { value: 'tenure', label: 'Tenure' },
                { value: 'emi', label: 'EMI' },
              ]}
            />
          )}
        </Field>
      </div>
      <ChargeEditor charge={charge} setCharge={setCharge} gst={gst} setGst={setGst} idPrefix="lump" />
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Metric label="Outstanding before" value={formatINR(before)} />
        <Metric label="Prepayment" value={formatINR(r.scenario.totalExtra)} />
        <Metric label="Remaining principal after" value={formatINR(Math.max(0, before - r.scenario.totalExtra))} />
        <Metric label="Remaining interest after" value={formatINR(r.scenario.totalInterest)} />
      </dl>
      <ScenarioOutcome r={r} />
    </LabCard>
  )
}

function AnnualLump({ state, defaultCharge, defaultGst }: { state: LoanState; defaultCharge: ChargeRate | null; defaultGst: number }) {
  const [amount, setAmount] = useState(num(50_000))
  const r = useMemo(() => annualLumpSumScenario(state, amount.value ?? 0, { charge: defaultCharge, gstPct: defaultGst }), [state, amount, defaultCharge, defaultGst])
  return (
    <LabCard
      id="annual"
      title="An annual lump sum"
      description="Prepay once a year — for example from a bonus — with the EMI kept the same."
      notWorth="If yearly bonuses are uncertain, or you need the money for goals with a fixed date (education, a house down payment)."
    >
      <div className="max-w-xs">
        <Field id="annual-amt" label="Amount every year">
          {({ id }) => <MoneyBox id={id} value={amount} onChange={setAmount} />}
        </Field>
      </div>
      <ScenarioOutcome r={r} />
    </LabCard>
  )
}

function TenureVsEmi({ state, defaultCharge, defaultGst }: { state: LoanState; defaultCharge: ChargeRate | null; defaultGst: number }) {
  const [amount, setAmount] = useState(num(Math.round(state.outstanding * 0.1)))
  const { reduceEmi, reduceTenure } = useMemo(() => tenureVsEmi(state, amount.value ?? 0, defaultCharge, defaultGst), [state, amount, defaultCharge, defaultGst])
  return (
    <LabCard
      id="tenure-emi"
      title="Same prepayment: reduce EMI or reduce tenure?"
      description="Reducing tenure generally reduces future interest because the loan is repaid sooner, but maintaining liquidity may be more important for some borrowers."
    >
      <div className="max-w-xs">
        <Field id="tve-amt" label="Prepayment amount">
          {({ id }) => <MoneyBox id={id} value={amount} onChange={setAmount} />}
        </Field>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[30rem] text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Metric
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Option A: lower EMI
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Option B: shorter tenure
              </th>
            </tr>
          </thead>
          <tbody className="num">
            {[
              ['New EMI', formatINR(reduceEmi.newEmi), formatINR(reduceTenure.newEmi)],
              ['New tenure', months(reduceEmi.newTenure), months(reduceTenure.newTenure)],
              ['Total interest', formatINR(reduceEmi.scenario.totalInterest), formatINR(reduceTenure.scenario.totalInterest)],
              ['Interest saved', formatINR(reduceEmi.interestSaved), formatINR(reduceTenure.interestSaved)],
              ['Net savings', formatINR(reduceEmi.netSavings), formatINR(reduceTenure.netSavings)],
              ['Monthly cash freed', formatINR((state.emi ?? 0) - reduceEmi.newEmi), formatINR(0)],
            ].map(([label, x, y]) => (
              <tr key={label} className="border-t">
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {label}
                </th>
                <td className="px-3 py-2 text-right">{x}</td>
                <td className="px-3 py-2 text-right">{y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        Option B saves {formatINR(reduceTenure.interestSaved - reduceEmi.interestSaved)} more interest. Option A lowers your monthly commitment, which can matter if income is uncertain. There
        is no universal right answer.
      </p>
    </LabCard>
  )
}

function RateChange({ state }: { state: LoanState }) {
  const [rate, setRate] = useState(num(Math.max(0, Math.round((state.annualRatePct - 0.5) * 100) / 100)))
  const [cost, setCost] = useState(num(0))
  const keepEmi = useMemo(() => rateChangeScenario(state, rate.value ?? state.annualRatePct, 'emi', cost.value ?? 0), [state, rate, cost])
  const keepTenure = useMemo(() => rateChangeScenario(state, rate.value ?? state.annualRatePct, 'tenure', cost.value ?? 0), [state, rate, cost])
  return (
    <LabCard
      id="rate"
      title="Negotiate a lower rate with your lender"
      description="Many lenders reprice existing loans (sometimes for a conversion fee). Compare keeping the EMI vs keeping the tenure."
      notWorth="If the conversion fee is larger than the interest saved over the time you expect to keep the loan."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="rate-new" label="New rate">
          {({ id }) => <PercentBox id={id} value={rate} onChange={setRate} />}
        </Field>
        <Field id="rate-cost" label="Conversion / repricing fee">
          {({ id }) => <MoneyBox id={id} showWords={false} value={cost} onChange={setCost} />}
        </Field>
        <div className="self-end text-sm text-muted-foreground">
          Change: <span className="num font-semibold">{formatPp((rate.value ?? state.annualRatePct) - state.annualRatePct)}</span>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Keep EMI, finish sooner</h3>
          <ScenarioOutcome r={keepEmi} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Keep tenure, lower EMI</h3>
          <ScenarioOutcome r={keepTenure} />
        </div>
      </div>
    </LabCard>
  )
}

function BalanceTransfer({ state, defaultForeclosure, defaultGst }: { state: LoanState; defaultForeclosure: ChargeRate | null; defaultGst: number }) {
  const [rate, setRate] = useState(num(Math.max(0, Math.round((state.annualRatePct - 0.75) * 100) / 100)))
  const [tenure, setTenure] = useState(num(state.remainingPeriods))
  const [fee, setFee] = useState(num(10_000))
  const [legal, setLegal] = useState(num(5_000))
  const [other, setOther] = useState(num(0))
  const [gst, setGst] = useState(defaultGst || 18)
  const [fc, setFc] = useState<ChargeRate | null>(defaultForeclosure)
  const r = useMemo(
    () =>
      balanceTransfer({
        current: state,
        newRatePct: rate.value ?? state.annualRatePct,
        newTenurePeriods: tenure.value ?? state.remainingPeriods,
        newProcessingFee: fee.value ?? 0,
        legalValuationFees: legal.value ?? 0,
        otherCosts: other.value ?? 0,
        currentForeclosureCharge: fc,
        gstPct: gst,
      }),
    [state, rate, tenure, fee, legal, other, gst, fc],
  )
  return (
    <LabCard
      id="bt"
      title="Balance transfer / refinance"
      description="A lower rate does not automatically mean the transfer saves money — costs and tenure matter."
      notWorth="Near the end of the loan, when costs are high relative to the balance, or if the new tenure is longer (lower EMI but more total interest)."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="bt-rate" label="New lender’s rate">
          {({ id }) => <PercentBox id={id} value={rate} onChange={setRate} />}
        </Field>
        <Field id="bt-tenure" label="New tenure (months)">
          {({ id }) => <NumberBox id={id} decimals={0} value={tenure} onChange={setTenure} />}
        </Field>
        <Field id="bt-fee" label="New processing fee">
          {({ id }) => <MoneyBox id={id} showWords={false} value={fee} onChange={setFee} />}
        </Field>
        <Field id="bt-legal" label="Legal / valuation fees">
          {({ id }) => <MoneyBox id={id} showWords={false} value={legal} onChange={setLegal} />}
        </Field>
        <Field id="bt-other" label="Other transfer costs" hint="e.g. stamp duty, MOD charges">
          {({ id, describedBy }) => <MoneyBox id={id} describedBy={describedBy} showWords={false} value={other} onChange={setOther} />}
        </Field>
        <Field id="bt-gst" label="GST on fees (%)">
          {({ id }) => <PercentBox id={id} value={num(gst)} onChange={(v) => setGst(v.value ?? 0)} />}
        </Field>
      </div>
      <ChargeEditor charge={fc} setCharge={setFc} gst={gst} setGst={setGst} idPrefix="bt-fc" />
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Metric label="Current EMI" value={formatINR(r.currentEmi)} />
        <Metric label="New EMI" value={formatINR(r.newEmi)} />
        <Metric label="Interest if you stay" value={formatINR(r.currentRemainingInterest)} />
        <Metric label="Interest on new loan" value={formatINR(r.newInterest)} />
        <Metric label="Total transfer costs" value={formatINR(r.transferCosts)} />
        <Metric label="Total outflow if you stay" value={formatINR(r.currentTotalOutflow)} />
        <Metric label="Total outflow if you switch" value={formatINR(r.newTotalOutflow)} />
        <Metric label="Break-even" value={r.breakEvenPeriod ? months(r.breakEvenPeriod) : '—'} />
      </dl>
      <Alert tone={r.worthConsidering ? 'success' : 'warning'} title={r.worthConsidering ? `Estimated net saving: ${formatINR(r.netSavings)}` : `Switching costs more: ${formatINR(-r.netSavings)}`}>
        {r.worthConsidering
          ? 'Based on these inputs the transfer appears to save money over the loan. Ask your current lender to match the rate first — it may save the transfer costs.'
          : 'Based on these inputs the lower rate does not cover the costs of switching (or the longer tenure adds interest).'}
      </Alert>
    </LabCard>
  )
}

function OptionalCharges({ input }: { input: LoanInput | null }) {
  const impacts = useMemo(() => (input ? optionalChargeImpacts(input) : []), [input])
  return (
    <LabCard
      id="optional"
      title="Review optional add-on costs"
      description="Charges you marked as not mandatory (or unknown): how much lower the effective cost would be without each. Check your contract before declining anything — some insurance can be valuable."
    >
      {!input ? (
        <p className="text-sm text-muted-foreground">Available when the loan comes from Check My Loan or a saved loan.</p>
      ) : impacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No optional or unknown-status charges with an amount were entered.</p>
      ) : (
        <ul className="space-y-3">
          {impacts.map((i) => (
            <li key={i.chargeId} className="rounded-lg border bg-background/60 p-3 text-sm">
              <p className="font-semibold">
                {i.name} <span className="font-normal text-muted-foreground">({i.mandatory === 'no' ? 'marked optional' : 'mandatory status unknown'})</span>
              </p>
              <p className="mt-1">
                Effective cost {formatPct(i.effectiveWith)} → <strong className="num text-savings">{formatPct(i.effectiveWithout)}</strong> ({formatPp(-i.ppSaved)}); total cost lower by{' '}
                <strong className="num">{formatINR(i.rupeesSaved)}</strong>.
              </p>
            </li>
          ))}
        </ul>
      )}
    </LabCard>
  )
}

function Penalties({ input }: { input: LoanInput | null }) {
  const fromLoan = input?.contingent.find((c) => c.amount.kind === 'known')
  const [perEvent, setPerEvent] = useState(num(fromLoan && fromLoan.amount.kind === 'known' ? fromLoan.amount.value : 500))
  const [events, setEvents] = useState(num(2))
  const cost = contingentCost(perEvent.value ?? 0, events.value ?? 0)
  return (
    <LabCard
      id="penalties"
      title="Avoid late, bounce and penal charges"
      description="These are not part of the base cost, but they add up — and late payments also affect your credit history."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="pen-amt" label="Charge per event">
          {({ id }) => <MoneyBox id={id} showWords={false} value={perEvent} onChange={setPerEvent} />}
        </Field>
        <Field id="pen-n" label="Events per year">
          {({ id }) => <NumberBox id={id} decimals={0} value={events} onChange={setEvents} />}
        </Field>
        <div className="self-end rounded-lg bg-warning-soft p-3">
          <p className="text-xs text-muted-foreground">Cost per year</p>
          <p className="num text-xl font-bold text-warning">{formatINR(cost)}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Tip: keep a buffer in the EMI account or ask to move the EMI date a few days after your salary credit. Penal charges must be disclosed and cannot carry interest — see{' '}
        <Link to="/learn/penal-charges" className="text-brand underline">
          penal charges
        </Link>
        .
      </p>
    </LabCard>
  )
}
