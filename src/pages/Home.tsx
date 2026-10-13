import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, Calculator, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { buildReport, flatRateLoan } from '@/lib/finance'
import { draftToInput, exampleDraft } from '@/features/check-loan/draft'
import { useDraft } from '@/features/check-loan/DraftContext'
import { formatINR, formatPct, formatPp } from '@/lib/format'
import { useI18n } from '@/lib/i18n'

export function HomePage() {
  const { t } = useI18n()
  usePageTitle('')
  const navigate = useNavigate()
  const { loadExample } = useDraft()
  // The illustration is computed live by the same engine, so its numbers always reconcile.
  const example = useMemo(() => buildReport(draftToInput(exampleDraft())), [])
  const a = example.analysis
  const flat = useMemo(() => flatRateLoan(1_00_000, 10, 36), [])

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="grid gap-10 py-10 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        <div className="min-w-0 space-y-6">
          <h1 className="text-[2.5rem] leading-[1.1] font-bold tracking-tight text-primary sm:text-5xl">{t('home.heroTitle')}</h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{t('home.heroSub')}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" variant="brand" className="w-full sm:w-auto">
              <Link to="/check-loan">
                <Calculator aria-hidden /> {t('home.ctaCheck')}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="w-full text-muted-foreground sm:w-auto">
              <Link to="/learn">{t('home.ctaLearn')}</Link>
            </Button>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" aria-hidden /> {t('home.privacyLine')}
          </p>
        </div>

        <figure className="min-w-0 rounded-3xl border bg-card p-5 sm:p-7" aria-labelledby="example-title">
          <figcaption>
            <p id="example-title" className="font-semibold">
              {t('home.exampleTitle')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('common.illustrative')}</p>
          </figcaption>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t('home.exampleQuoted')}</p>
              <p className="num mt-1 text-3xl font-semibold">{formatPct(a.quotedRatePct)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('home.exampleEffective')}</p>
              <p className="num mt-1 text-3xl font-bold text-primary">{formatPct(a.effective?.aprStylePct)}</p>
              <p className="num mt-0.5 text-xs font-semibold text-warning">{formatPp(a.differencePp, 2, t('common.ppShort'))}</p>
            </div>
          </div>

          <dl className="mt-6 divide-y border-t text-sm">
            <Row value={formatINR(a.principal)} label={t('home.exampleSanctioned')} />
            <Row value={`− ${formatINR(a.totals.upfrontCharges)}`} label={t('home.exampleDeductions')} tone="text-warning" />
            <Row value={formatINR(a.netReceived)} label={t('home.exampleReceived')} strong />
            <Row value={formatINR(a.totals.totalRepayment)} label={t('home.exampleRepaid', { n: example.input.tenurePeriods, emi: formatINR(a.emi) })} />
          </dl>

          <p className="mt-4 text-sm text-muted-foreground">{t('home.exampleNote')}</p>
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => {
              loadExample()
              navigate('/check-loan/results')
            }}
          >
            {t('home.exampleCta')} <ArrowRight aria-hidden />
          </Button>
        </figure>
      </section>

      <section className="border-t py-10 sm:py-14" aria-labelledby="how-title">
        <h2 id="how-title" className="text-xl font-semibold sm:text-2xl">
          {t('home.stepsTitle')}
        </h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3 md:gap-8">
          {[
            { title: t('home.step1Title'), body: t('home.step1Body') },
            { title: t('home.step2Title'), body: t('home.step2Body') },
            { title: t('home.step3Title'), body: t('home.step3Body') },
          ].map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="num flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t py-10 sm:py-14" aria-labelledby="flat-title">
        <Link
          to="/learn/flat-vs-reducing"
          className="group flex flex-col gap-4 rounded-3xl border bg-card p-5 transition-colors duration-150 hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between sm:p-7"
        >
          <div className="min-w-0">
            <h2 id="flat-title" className="text-lg font-semibold">
              {t('home.flatTitle')}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t('home.flatBody')}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
              {t('home.flatCta')} <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
            </p>
          </div>
          <dl className="grid shrink-0 grid-cols-2 gap-6 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">10% flat · 3 yr</dt>
              <dd className="num text-lg font-semibold">{formatINR(flat.totalInterest)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">≈ reducing</dt>
              <dd className="num text-lg font-semibold text-primary">{formatPct(flat.reducingEquivalentPct)}</dd>
            </div>
          </dl>
        </Link>
      </section>
    </div>
  )
}

function Row({ value, label, tone, strong }: { value: string; label: string; tone?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className={strong ? 'font-medium text-foreground' : 'text-muted-foreground'}>{label}</dt>
      <dd className={`num shrink-0 text-right ${strong ? 'text-base font-bold text-primary' : 'font-medium'} ${tone ?? ''}`}>{value}</dd>
    </div>
  )
}
