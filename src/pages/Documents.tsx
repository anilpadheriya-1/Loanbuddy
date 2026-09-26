import { useState } from 'react'
import { Link } from 'react-router'
import { FileText, Upload } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { DOCUMENT_TYPES, KFS_CHECKLIST } from '@/content/checklists'

export default function DocumentsPage() {
  usePageTitle('Check My Loan Documents')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const done = Object.values(checked).filter(Boolean).length
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-10" lang="en">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Check My Loan Documents</h1>
        <p className="mt-2 text-muted-foreground">Which documents matter, and a checklist to read your Key Facts Statement.</p>
      </header>

      <Alert tone="info" title="Document analysis coming soon">
        <p>
          We don’t read or upload documents yet — and we won’t pretend to. For now, copy the numbers from your documents into{' '}
          <Link to="/check-loan" className="text-brand underline">
            Check My Loan
          </Link>
          . Ticking which documents you have there raises the result’s Data Confidence.
        </p>
      </Alert>

      <section aria-labelledby="types">
        <h2 id="types" className="text-lg font-semibold">
          Documents to keep
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {DOCUMENT_TYPES.map((d) => (
            <li key={d.id} className="flex gap-3 rounded-xl border bg-card p-4">
              <FileText className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              <div>
                <p className="font-semibold">{d.title}</p>
                <p className="text-sm text-muted-foreground">{d.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <Button variant="outline" disabled className="mt-4" aria-describedby="upload-note">
          <Upload aria-hidden /> Upload a document
        </Button>
        <p id="upload-note" className="mt-1 text-xs text-muted-foreground">
          Not available yet. Files would stay on your device when this is built.
        </p>
      </section>

      <section aria-labelledby="kfs" className="rounded-xl border bg-card p-4 sm:p-6">
        <h2 id="kfs" className="text-lg font-semibold">
          KFS checklist
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tick what you can confirm. {done} of {KFS_CHECKLIST.length} checked.
        </p>
        <Progress value={(done / KFS_CHECKLIST.length) * 100} className="mt-2" aria-label="KFS checklist progress" indicatorClassName="bg-savings" />
        <ul className="mt-4 space-y-2">
          {KFS_CHECKLIST.map((item) => (
            <li key={item.id}>
              <label className="flex min-h-11 cursor-pointer gap-3 rounded-lg border bg-background/60 p-3 hover:bg-accent">
                <Checkbox className="mt-0.5" checked={!!checked[item.id]} onCheckedChange={(c) => setChecked((s) => ({ ...s, [item.id]: c === true }))} />
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.help}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {done < KFS_CHECKLIST.length && done > 0 && (
          <p className="mt-4 text-sm">
            For anything you couldn’t tick, ask the lender in writing. The questions in your{' '}
            <Link to="/check-loan/results" className="text-brand underline">
              Loan Cost Report
            </Link>{' '}
            are a good start.
          </p>
        )}
      </section>
    </div>
  )
}
