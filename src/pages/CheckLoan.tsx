import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, MessageSquareText, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { useDraft } from '@/features/check-loan/DraftContext'
import { useReport } from '@/features/check-loan/useReport'
import { StepProgress, STEP_KEYS } from '@/features/check-loan/StepProgress'
import { LiveEstimate } from '@/features/check-loan/LiveEstimate'
import { validateStep, type FieldErrors, type StepKey } from '@/features/check-loan/validation'
import { StepLoan } from '@/features/check-loan/steps/StepLoan'
import { StepInterest } from '@/features/check-loan/steps/StepInterest'
import { StepCharges } from '@/features/check-loan/steps/StepCharges'
import { StepRepayment } from '@/features/check-loan/steps/StepRepayment'
import { StepPrepayment } from '@/features/check-loan/steps/StepPrepayment'
import { useI18n, type TKey } from '@/lib/i18n'

export default function CheckLoanPage() {
  const { t } = useI18n()
  usePageTitle(t('wizard.title'))
  const { draft, setDraft, update, reset, loadExample, resumed } = useDraft()
  const report = useReport(draft)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const step = Math.min(4, Math.max(0, Number(params.get('step') ?? 1) - 1 || 0))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showResumed, setShowResumed] = useState(resumed)
  const stepKey = STEP_KEYS[step] as StepKey
  const emi = report?.analysis.status === 'ok' ? report.analysis.emi : undefined

  const goTo = (i: number) => {
    if (i >= 5) {
      navigate('/check-loan/results')
      return
    }
    setParams(i === 0 ? {} : { step: String(i + 1) }, { replace: false })
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => document.getElementById('wizard-heading')?.focus())
  }

  const next = () => {
    const e = validateStep(stepKey, draft)
    setErrors(e)
    if (Object.keys(e).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    goTo(step + 1)
  }

  const content = useMemo(() => {
    switch (stepKey) {
      case 'loan':
        return <StepLoan draft={draft} update={update} errors={errors} />
      case 'interest':
        return <StepInterest draft={draft} update={update} errors={errors} />
      case 'charges':
        return <StepCharges draft={draft} setDraft={setDraft} emi={emi} />
      case 'repayment':
        return <StepRepayment draft={draft} setDraft={setDraft} errors={errors} report={report} />
      case 'prepayment':
        return <StepPrepayment draft={draft} setDraft={setDraft} errors={errors} report={report} />
    }
  }, [stepKey, draft, update, setDraft, errors, emi, report])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="wizard-heading" tabIndex={-1} className="text-2xl font-bold sm:text-3xl">
            {t('wizard.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('wizard.subtitle')}</p>
          <Link to="/ask-lender" className="no-print mt-2 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-brand hover:underline">
            <MessageSquareText className="size-4" aria-hidden /> {t('ask.missingDetails')}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => loadExample()}>
            <Sparkles aria-hidden /> {t('wizard.tryExample')}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <RotateCcw aria-hidden /> {t('wizard.startOver')}
              </Button>
            </DialogTrigger>
            <DialogContent closeLabel={t('common.close')}>
              <DialogTitle>{t('wizard.startOver')}</DialogTitle>
              <DialogDescription>{t('wizard.startOverConfirm')}</DialogDescription>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">{t('common.no')}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="danger"
                    onClick={() => {
                      reset()
                      setErrors({})
                      goTo(0)
                    }}
                  >
                    {t('common.yes')}
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showResumed && (
        <Alert tone="success" className="mt-4" role="status">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{t('wizard.resumed')}</span>
            <Button variant="link" size="sm" onClick={() => setShowResumed(false)}>
              {t('common.close')}
            </Button>
          </div>
        </Alert>
      )}

      <div className="mt-6">
        <StepProgress current={step} onJump={goTo} />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground" aria-live="polite">
        {t('wizard.step', { n: step + 1, total: 5 })} · {t(`wizard.steps.${stepKey}` as TKey)}
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_17rem]">
        <div className="min-w-0">
          {Object.keys(errors).length > 0 && (
            <Alert tone="danger" className="mb-4" role="alert">
              {t('wizard.fixErrors')}
            </Alert>
          )}
          {content}
          <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-between gap-3 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-3">
            <Button variant="outline" onClick={() => goTo(step - 1)} disabled={step === 0}>
              <ArrowLeft aria-hidden /> {t('common.back')}
            </Button>
            <span className="hidden text-xs text-muted-foreground sm:inline">{t('wizard.autosaved')}</span>
            {step < 4 ? (
              <Button onClick={next}>
                {t('common.next')} <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button variant="brand" onClick={next}>
                {t('wizard.seeResults')} <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-20 space-y-3">
            <LiveEstimate report={report} />
            <p className="px-1 text-xs text-muted-foreground">{t('wizard.minimumNeeded')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
