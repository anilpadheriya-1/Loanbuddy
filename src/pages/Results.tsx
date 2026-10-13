import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, Check, ChevronDown, Pencil, Printer, Save, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { useDraft } from '@/features/check-loan/DraftContext'
import { useReport } from '@/features/check-loan/useReport'
import { toSavedLoan } from '@/features/check-loan/saved'
import { repository } from '@/lib/storage'
import { isNativeApp, shareText } from '@/lib/native'
import { formatDate, formatINR, formatMonths, formatPct, formatPp } from '@/lib/format'
import { useI18n, type TKey } from '@/lib/i18n'
import { renderMessage } from '@/lib/i18n/messages'
import { PERIODS_PER_YEAR, type LoanReport } from '@/lib/finance'
import { buildSummary } from '@/components/results/summary'
import { WhatYouPay } from '@/components/results/WhatYouPay'
import { Waterfall } from '@/components/results/Waterfall'
import { CostBreakdown } from '@/components/results/CostBreakdown'
import { AmortizationView } from '@/components/results/AmortizationView'
import { ScoreBreakdown } from '@/components/results/ScoreBreakdown'
import { ScoreGauge } from '@/components/results/ScoreGauge'
import { ConfidenceBadge } from '@/components/results/ConfidenceBadge'
import { LenderQuestions } from '@/components/results/LenderQuestions'
import { RulesThatMayApply } from '@/components/results/RulesThatMayApply'
import { Methodology } from '@/components/results/Methodology'
import { SavingsPreview } from '@/components/results/SavingsPreview'
import { ExistingLoanCard } from '@/components/results/ExistingLoanCard'
import { ReconcileAlert } from '@/components/results/ReconcileAlert'

export default function ResultsPage() {
  const { t } = useI18n()
  usePageTitle(t('results.title'))
  const [params] = useSearchParams()
  const savedId = params.get('id')
  const { draft: currentDraft, loadDraft } = useDraft()
  const saved = useMemo(() => (savedId ? repository.getSaved(savedId) : null), [savedId])
  const draft = saved ? saved.draft : currentDraft
  const report = useReport(draft)
  const navigate = useNavigate()

  if (savedId && !saved) {
    return (
      <Shell>
        <Alert tone="warning" title={t('results.noData')}>
          <Button asChild variant="link">
            <Link to="/check-loan">{t('results.startCheck')}</Link>
          </Button>
        </Alert>
      </Shell>
    )
  }
  if (!report) return null
  const a = report.analysis

  if (a.status !== 'ok' || !a.effective) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">{t('results.title')}</h1>
        <Alert tone="warning" title={t('results.insufficientTitle')} className="mt-4">
          <p>{t('results.insufficientBody')}</p>
          <ul className="mt-1 list-disc pl-5">
            {(a.missing.length ? a.missing : (['emi-or-rate'] as const)).map((m) => (
              <li key={m}>{t(`results.missing.${m}` as TKey)}</li>
            ))}
          </ul>
          <Button asChild className="mt-3">
            <Link to="/check-loan">
              <ArrowLeft aria-hidden /> {t('results.goToWizard')}
            </Link>
          </Button>
        </Alert>
      </Shell>
    )
  }

  const editThis = () => {
    if (saved) loadDraft(saved.draft)
    navigate('/check-loan')
  }

  return (
    <Shell>
      <ReportBody report={report} savedAt={saved?.savedAt} onEdit={editThis} draftForSave={draft} />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 pt-6 sm:pt-10">{children}</div>
}

const SECTIONS: { id: string; key: TKey }[] = [
  { id: 'paying', key: 'results.s1' },
  { id: 'why', key: 'results.s2' },
  { id: 'breakdown', key: 'results.s3' },
  { id: 'schedule', key: 'results.s4' },
  { id: 'save', key: 'results.s5' },
  { id: 'score', key: 'results.s7' },
  { id: 'questions', key: 'results.s8' },
  { id: 'rules', key: 'results.s9' },
  { id: 'method', key: 'results.s10' },
]

function ReportBody({
  report,
  savedAt,
  onEdit,
  draftForSave,
}: {
  report: LoanReport
  savedAt?: string
  onEdit: () => void
  draftForSave: Parameters<typeof toSavedLoan>[0]
}) {
  const { t, lang } = useI18n()
  const a = report.analysis
  const effective = a.effective!
  const [savedNow, setSavedNow] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const k = PERIODS_PER_YEAR[report.input.frequency]
  const summary = buildSummary(report, lang)
  const typeLabel = t(`loanType.${report.input.loanType}` as TKey)
  const lender = report.input.lenderName?.trim()
  const gap = a.differencePp
  // Amber, never red: a cost gap is something to review, not an error.
  const gapTone = gap === null ? '' : gap > 0.25 ? 'text-warning' : 'text-savings'
  const title = draftForSave.label.trim() || (lender ? `${typeLabel} · ${lender}` : typeLabel)
  const sections = SECTIONS.filter((s) => s.id !== 'save' || report.savingsPreview)

  // Print the whole report: open collapsed sections for the print, then restore them.
  useEffect(() => {
    let opened: HTMLDetailsElement[] = []
    const before = () => {
      opened = Array.from(document.querySelectorAll<HTMLDetailsElement>('details:not([open])'))
      opened.forEach((d) => (d.open = true))
    }
    const after = () => {
      opened.forEach((d) => (d.open = false))
      opened = []
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  const share = async () => {
    const text = t('results.shareText', {
      title,
      quoted: a.quotedRatePct !== null ? formatPct(a.quotedRatePct) : '—',
      effective: formatPct(effective.aprStylePct),
      net: formatINR(a.netReceived),
      repay: formatINR(a.totals.totalRepayment),
    })
    const result = await shareText(t('results.title'), text)
    if (result === 'copied') setShareMsg(t('results.shareFallback'))
  }

  const warnings = a.warnings.filter((w) => w.code !== 'emi-mismatch' && w.code !== 'emi-matches-flat')
  const tenureLabel = k === 12 ? formatMonths(report.input.tenurePeriods, { yr: t('common.yr'), mo: t('common.mo') }) : String(report.input.tenurePeriods)

  return (
    <article className="space-y-6 sm:space-y-8">
      <header className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-brand uppercase">{t('results.title')}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {savedAt && <p className="mt-1 text-sm text-muted-foreground">{t('results.savedView', { date: formatDate(savedAt.slice(0, 10), lang) })}</p>}
          </div>
          <div className="no-print flex w-full items-center gap-2 sm:w-auto">
            <Button
              className="flex-1 sm:flex-none"
              variant={savedNow ? 'outline' : 'default'}
              onClick={() => {
                repository.upsertSaved(toSavedLoan(draftForSave, report, typeLabel))
                setSavedNow(true)
              }}
            >
              {savedNow ? <Check aria-hidden /> : <Save aria-hidden />} {savedNow ? t('results.saved') : t('results.save')}
            </Button>
            <ActionButton icon={Pencil} label={t('results.edit')} onClick={onEdit} />
            {/* Android's WebView cannot print, so the app offers Share instead. */}
            {!isNativeApp() && <ActionButton icon={Printer} label={t('results.print')} onClick={() => window.print()} />}
            <ActionButton icon={Share2} label={t('results.share')} onClick={share} />
          </div>
        </div>
        {shareMsg && (
          <p className="text-sm text-savings" role="status">
            {shareMsg}
          </p>
        )}

        {/* Hero: understandable in 10 seconds */}
        <section aria-labelledby="hero-effective" className="rounded-3xl border bg-card p-5 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p id="hero-effective" className="text-sm font-medium text-muted-foreground">
                {t('results.effectiveLabel')}
              </p>
              <p className="num mt-1 text-5xl font-bold tracking-tight text-primary sm:text-6xl">{formatPct(effective.aprStylePct)}</p>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                <div>
                  <dt className="text-xs text-muted-foreground">{t('results.quoted')}</dt>
                  <dd className="num text-lg font-semibold">{a.quotedRatePct !== null ? formatPct(a.quotedRatePct) : t('results.noQuote')}</dd>
                  {a.quotedRatePct !== null && <dd className="text-xs text-muted-foreground">{t(`rateMethod.${a.rateMethod}` as TKey)}</dd>}
                </div>
                {gap !== null && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('results.difference')}</dt>
                    <dd className={`num text-lg font-semibold ${gapTone}`}>{formatPp(gap, 2, t('common.pp'))}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-4 max-w-xl text-xs leading-relaxed text-muted-foreground">{t('results.effectiveNote')}</p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-4 rounded-2xl bg-muted/60 p-4 md:w-64">
              <ScoreGauge score={report.score} size={104} />
              <ConfidenceBadge level={report.confidence.level} />
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t pt-6 sm:grid-cols-4">
            <HeroStat label={t('results.emi')} value={formatINR(a.emi)} sub={a.emiDerived ? t('results.derived') : undefined} />
            <HeroStat label={t('results.totalRepayment')} value={formatINR(a.totals.totalRepayment)} />
            <HeroStat label={t('results.netReceived')} value={formatINR(a.netReceived)} sub={a.netDerived ? t('common.estimated') : undefined} />
            <HeroStat label={t('results.totalCost')} value={formatINR(a.totals.totalCost)} sub={t('results.costPct', { pct: formatPct(a.totals.costPctOfNet, 1) })} />
          </dl>
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <MinorStat label={t('results.tenure')} value={tenureLabel} />
            <MinorStat label={t('results.totalInterest')} value={formatINR(a.totals.totalInterest)} />
            <MinorStat label={t('results.totalCharges')} value={formatINR(a.totals.totalCharges)} />
          </dl>
        </section>

        {/* Important notes stay visible: reconciliation, warnings and missing information. */}
        {a.reconciliation && a.quotedRatePct !== null && <ReconcileAlert rec={a.reconciliation} n={report.input.tenurePeriods} quotedRate={a.quotedRatePct} />}

        {warnings.length > 0 && (
          <Alert tone="warning" title={t('results.warningsTitle')}>
            <ul className="list-disc space-y-1 pl-5">
              {warnings.map((w, i) => (
                <li key={i}>{renderMessage('warn', w, lang)}</li>
              ))}
            </ul>
          </Alert>
        )}

        {a.unknowns.length > 0 && (
          <Alert tone="info" title={t('results.mayDiffer')}>
            <ul className="list-disc space-y-0.5 pl-5">
              {a.unknowns.map((u, i) => (
                <li key={i}>{renderMessage('unknown', u, lang)}</li>
              ))}
            </ul>
          </Alert>
        )}

        <div className="space-y-2 px-1 text-[15px] leading-relaxed">
          {summary.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="text-sm text-muted-foreground">{t('results.notMisconduct')}</p>
        </div>

        <nav aria-label={t('results.onThisPage')} className="no-print">
          <p className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t('results.onThisPage')}</p>
          <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  onClick={() => {
                    // Collapsed sections open when you jump to them.
                    const el = document.getElementById(s.id)
                    if (el instanceof HTMLDetailsElement) el.open = true
                  }}
                  className="inline-flex min-h-10 items-center rounded-full bg-muted px-4 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:bg-accent hover:text-foreground"
                >
                  {t(s.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <ReportSection id="paying" title={t('results.s1')}>
        <WhatYouPay analysis={a} />
      </ReportSection>

      <ReportSection id="why" title={t('results.s2')} intro={t('results.s2Intro')}>
        <Waterfall steps={a.attribution} effective={effective.aprStylePct} />
        {a.flatEquivalentPct !== null && a.quotedRatePct !== null && (
          <Alert tone="info" title={t('results.flatExplainerTitle')} className="mt-4">
            {t('results.flatExplainer', { flat: formatPct(a.quotedRatePct), reducing: formatPct(a.flatEquivalentPct) })}
          </Alert>
        )}
      </ReportSection>

      <ReportSection id="breakdown" title={t('results.s3')}>
        <CostBreakdown analysis={a} />
      </ReportSection>

      {a.schedule && a.scheduleRatePct !== null && a.scheduleBasis && (
        <ReportSection id="schedule" title={t('results.s4')} className="print-break">
          <AmortizationView schedule={a.schedule} ratePct={a.scheduleRatePct} basis={a.scheduleBasis} periodsPerYear={k} />
        </ReportSection>
      )}

      {report.savingsPreview && (
        <ReportSection id="save" title={t('results.s5')}>
          <SavingsPreview preview={report.savingsPreview} />
        </ReportSection>
      )}

      {report.input.status === 'existing' && report.existing && (
        <ReportSection id="today" title={t('results.s6')}>
          <ExistingLoanCard existing={report.existing} />
        </ReportSection>
      )}

      <ReportSection id="score" title={t('results.s7')}>
        <ScoreBreakdown score={report.score} confidence={report.confidence} />
      </ReportSection>

      <CollapsibleSection id="questions" title={t('results.s8')}>
        <LenderQuestions questions={report.questions} />
      </CollapsibleSection>

      <CollapsibleSection id="rules" title={t('results.s9')}>
        <RulesThatMayApply report={report} />
      </CollapsibleSection>

      <CollapsibleSection id="method" title={t('results.s10')}>
        <Methodology analysis={a} />
      </CollapsibleSection>

      <p className="px-1 text-xs text-muted-foreground">{t('common.lastVerified', { date: 'September 2026' })}</p>
    </article>
  )
}

function ActionButton({ icon: Icon, label, onClick }: { icon: typeof Pencil; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="max-lg:w-12 max-lg:px-0" title={label}>
      <Icon aria-hidden />
      <span className="max-lg:sr-only">{label}</span>
    </Button>
  )
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 truncate text-lg font-semibold sm:text-xl">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  )
}

function MinorStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt>{label}:</dt>
      <dd className="num font-medium text-foreground">{value}</dd>
    </div>
  )
}

function ReportSection({ id, title, intro, children, className }: { id: string; title: string; intro?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`print-avoid-break scroll-mt-20 rounded-3xl border bg-card p-5 sm:p-8 ${className ?? ''}`}>
      <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      {intro && <p className="mt-1 text-sm text-muted-foreground">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Advanced detail: collapsed on screen, always expanded when printed (see index.css and the beforeprint handler). */
function CollapsibleSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-20 rounded-3xl border bg-card">
      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-3xl px-5 py-4 transition-colors duration-150 hover:bg-accent/40 sm:px-8 sm:py-5">
        <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h2>
        <ChevronDown className="details-chevron size-5 shrink-0 text-muted-foreground transition-transform duration-200" aria-hidden />
      </summary>
      <div className="px-5 pb-5 sm:px-8 sm:pb-8">{children}</div>
    </details>
  )
}
