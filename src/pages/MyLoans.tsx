import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Copy, FileText, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { useDraft } from '@/features/check-loan/DraftContext'
import { useI18n, type TKey } from '@/lib/i18n'
import { repository, type SavedLoan } from '@/lib/storage'
import { formatDate, formatINR, formatMonths, formatPct } from '@/lib/format'
import { uid } from '@/lib/utils'

export default function MyLoansPage() {
  const { t, lang } = useI18n()
  usePageTitle(t('nav.myLoans'))
  const [loans, setLoans] = useState<SavedLoan[]>(() => repository.listSaved())
  const { loadDraft } = useDraft()
  const navigate = useNavigate()
  const refresh = () => setLoans(repository.listSaved())

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('nav.myLoans')}</h1>
          <p className="mt-1 text-sm text-muted-foreground" lang="en">
            Saved only in this browser. Clearing your browser data removes them. Nothing is uploaded.
          </p>
        </div>
        <Button asChild>
          <Link to="/check-loan">{t('results.startCheck')}</Link>
        </Button>
      </header>

      {loans.length === 0 ? (
        <Alert tone="info" title={t('results.noData')}>
          <p lang="en">Run Check My Loan and press “{t('results.save')}” on the report to keep it here.</p>
        </Alert>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {loans.map((l) => {
            const s = l.summary
            return (
              <li key={l.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{l.label}</h2>
                    <p className="text-xs text-muted-foreground">
                      {t(`loanType.${l.draft.loanType}` as TKey)} · {formatDate(l.savedAt.slice(0, 10), lang)}
                    </p>
                  </div>
                  <Badge variant={s.confidence === 'high' ? 'success' : s.confidence === 'medium' ? 'info' : 'warning'}>
                    {t('results.confidence')}: {t(`confidence.${s.confidence}` as TKey)}
                  </Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Item label={t('results.effectiveLabel')} value={formatPct(s.effectivePct)} strong />
                  <Item label={t('results.quoted')} value={s.quotedPct === null ? '—' : formatPct(s.quotedPct)} />
                  <Item label={t('results.emi')} value={formatINR(s.emi)} />
                  <Item label={t('results.tenure')} value={formatMonths(s.tenurePeriods, { yr: t('common.yr'), mo: t('common.mo') })} />
                  <Item label={t('results.totalInterest')} value={formatINR(s.totalInterest)} />
                  <Item label={t('results.score')} value={s.score === null ? '—' : `${s.score}/100`} />
                  {s.potentialSavings !== null && <Item label="Save by paying 10% more EMI" value={formatINR(s.potentialSavings)} />}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                  <Button asChild size="sm">
                    <Link to={`/check-loan/results?id=${encodeURIComponent(l.id)}`}>
                      <FileText aria-hidden /> {t('results.title')}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      loadDraft(l.draft)
                      navigate('/check-loan')
                    }}
                  >
                    <Pencil aria-hidden /> {t('common.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const id = uid('loan')
                      repository.upsertSaved({ ...l, id, label: `${l.label} (copy)`, savedAt: new Date().toISOString(), draft: { ...l.draft, id } })
                      refresh()
                    }}
                  >
                    <Copy aria-hidden /> Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => {
                      repository.removeSaved(l.id)
                      refresh()
                    }}
                    aria-label={`${t('common.delete')} ${l.label}`}
                  >
                    <Trash2 aria-hidden /> {t('common.delete')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {loans.length > 0 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-danger">
              <Trash2 aria-hidden /> Clear all saved data
            </Button>
          </DialogTrigger>
          <DialogContent closeLabel={t('common.close')}>
            <DialogTitle>Clear all saved data?</DialogTitle>
            <DialogDescription>This removes every saved loan and your in-progress answers from this browser. It cannot be undone.</DialogDescription>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">{t('common.no')}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="danger"
                  onClick={() => {
                    repository.clearAll()
                    refresh()
                  }}
                >
                  {t('common.yes')}
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function Item({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`num ${strong ? 'text-lg font-bold text-primary' : 'font-semibold'}`}>{value}</dd>
    </div>
  )
}
