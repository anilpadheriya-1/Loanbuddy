import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, BookOpen, Calculator, Eye, FileSearch, Lock, MessageSquareText, PiggyBank, Scale, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Disclaimer } from '@/components/layout/Disclaimer'
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
    <div>
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="min-w-0 space-y-6">
            <Badge variant="info" className="text-xs whitespace-normal">
              <ShieldCheck aria-hidden /> {t('footer.notLender')}
            </Badge>
            <h1 className="text-4xl leading-tight font-bold text-primary sm:text-5xl">{t('home.heroTitle')}</h1>
            <p className="max-w-xl text-lg text-muted-foreground">{t('home.heroSub')}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="brand">
                <Link to="/check-loan">
                  <Calculator aria-hidden /> {t('home.ctaCheck')}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/learn">
                  <BookOpen aria-hidden /> {t('home.ctaLearn')}
                </Link>
              </Button>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" aria-hidden /> {t('home.privacyLine')}
            </p>
          </div>

          <figure className="min-w-0 rounded-2xl border-2 border-primary/15 bg-background p-5 shadow-sm sm:p-6" aria-labelledby="example-title">
            <figcaption>
              <p id="example-title" className="font-semibold">
                {t('home.exampleTitle')}
              </p>
              <p className="mt-1 text-xs font-medium text-warning">{t('common.illustrative')}</p>
            </figcaption>
            <dl className="mt-4 space-y-2">
              <Row value={formatINR(a.principal)} label={t('home.exampleSanctioned')} />
              <Row value={`− ${formatINR(a.totals.upfrontCharges)}`} label={t('home.exampleDeductions')} tone="text-warning" />
              <Row value={formatINR(a.netReceived)} label={t('home.exampleReceived')} strong />
              <Row
                value={formatINR(a.totals.totalRepayment)}
                label={t('home.exampleRepaid', { n: example.input.tenurePeriods, emi: formatINR(a.emi) })}
              />
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('home.exampleQuoted')}</p>
                <p className="num text-2xl font-bold">{formatPct(a.quotedRatePct)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('home.exampleEffective')}</p>
                <p className="num text-2xl font-bold text-primary">{formatPct(a.effective?.aprStylePct)}</p>
                <p className="num text-xs font-semibold text-warning">{formatPp(a.differencePp, 2, t('common.ppShort'))}</p>
              </div>
            </div>
            <p className="mt-4 text-sm">{t('home.exampleNote')}</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => {
                loadExample()
                navigate('/check-loan/results')
              }}
            >
              {t('home.exampleCta')} <ArrowRight aria-hidden />
            </Button>
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-bold">
          {t('home.stepsTitle')}
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: FileSearch, title: t('home.step1Title'), body: t('home.step1Body') },
            { icon: Calculator, title: t('home.step2Title'), body: t('home.step2Body') },
            { icon: Eye, title: t('home.step3Title'), body: t('home.step3Body') },
          ].map((s, i) => (
            <li key={s.title} className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
                <s.icon className="size-5 text-brand" aria-hidden />
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14" aria-labelledby="ask-title">
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand/20 bg-info-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-4">
            <MessageSquareText className="mt-1 size-8 shrink-0 text-brand" aria-hidden />
            <div>
              <h2 id="ask-title" className="text-xl font-bold">
                {t('home.askTitle')}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('home.askBody')}</p>
            </div>
          </div>
          <Button asChild variant="brand" className="shrink-0">
            <Link to="/ask-lender">
              {t('nav.ask')} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">{t('home.flatTitle')}</h2>
            <p className="mt-3 text-muted-foreground">{t('home.flatBody')}</p>
            <dl className="mt-4 grid max-w-sm grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-background p-3">
                <dt className="text-muted-foreground">10% flat · 3 yr</dt>
                <dd className="num text-lg font-bold">{formatINR(flat.totalInterest)}</dd>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <dt className="text-muted-foreground">≈ reducing</dt>
                <dd className="num text-lg font-bold text-primary">{formatPct(flat.reducingEquivalentPct)}</dd>
              </div>
            </dl>
            <Button asChild variant="link" className="mt-3">
              <Link to="/learn/flat-vs-reducing">
                {t('home.flatCta')} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('home.featuresTitle')}</h2>
            <ul className="mt-4 space-y-3">
              {[t('home.feature1'), t('home.feature2'), t('home.feature3'), t('home.feature4')].map((f) => (
                <li key={f} className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-savings" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="tools-title">
        <h2 id="tools-title" className="text-2xl font-bold">
          {t('home.toolsTitle')}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/savings', icon: PiggyBank, title: t('nav.savings') },
            { to: '/compare', icon: Scale, title: t('nav.compare') },
            { to: '/documents', icon: FileSearch, title: t('nav.documents') },
            { to: '/help', icon: ShieldCheck, title: t('nav.help') },
          ].map((tool) => (
            <li key={tool.to}>
              <Link to={tool.to} className="flex h-full min-h-20 items-center gap-3 rounded-xl border bg-card p-4 font-medium hover:bg-accent">
                <tool.icon className="size-6 shrink-0 text-brand" aria-hidden />
                {tool.title}
              </Link>
            </li>
          ))}
        </ul>
        <Disclaimer className="mt-10" />
      </section>
    </div>
  )
}

function Row({ value, label, tone, strong }: { value: string; label: string; tone?: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? 'rounded-lg bg-accent px-3 py-2' : 'px-3'}`}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`num shrink-0 text-right ${strong ? 'text-xl font-bold text-primary' : 'font-semibold'} ${tone ?? ''}`}>{value}</dd>
    </div>
  )
}
