import * as React from 'react'
import { repository } from '@/lib/storage'
import { createDraft, exampleDraft, type LoanDraft } from './draft'

interface DraftContextValue {
  draft: LoanDraft
  /** Replace or update the draft. Autosaved (debounced) to this browser. */
  setDraft: (updater: LoanDraft | ((d: LoanDraft) => LoanDraft)) => void
  update: (patch: Partial<LoanDraft>) => void
  reset: () => void
  loadExample: () => void
  /** Load a saved loan into the editor. */
  loadDraft: (d: LoanDraft) => void
  /** True if answers were restored from a previous visit. */
  resumed: boolean
  hasContent: boolean
}

const DraftContext = React.createContext<DraftContextValue | null>(null)

function hasMeaningfulContent(d: LoanDraft): boolean {
  return d.sanctionedAmount.value !== null || d.quotedRate.value !== null || d.emi.value !== null || d.charges.length > 0
}

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [initial] = React.useState(() => repository.getDraft())
  const [draft, setDraftState] = React.useState<LoanDraft>(() => initial ?? createDraft())
  const [resumed, setResumed] = React.useState(() => !!initial && hasMeaningfulContent(initial))

  // Debounced autosave while typing…
  const latest = React.useRef(draft)
  React.useEffect(() => {
    latest.current = draft
    const id = window.setTimeout(() => repository.saveDraft(draft), 300)
    return () => window.clearTimeout(id)
  }, [draft])
  // …and flushed immediately when the page is hidden or closed, so nothing typed is lost.
  React.useEffect(() => {
    const flush = () => repository.saveDraft(latest.current)
    const onVisibility = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  /** Replace the whole draft and save it right away (explicit user actions). */
  const replaceNow = React.useCallback((d: LoanDraft) => {
    setResumed(false)
    repository.saveDraft(d)
    setDraftState(d)
  }, [])

  const value = React.useMemo<DraftContextValue>(
    () => ({
      draft,
      setDraft: (updater) =>
        setDraftState((prev) => {
          const next = typeof updater === 'function' ? updater(prev) : updater
          return { ...next, updatedAt: new Date().toISOString() }
        }),
      update: (patch) => setDraftState((prev) => ({ ...prev, ...patch, updatedAt: new Date().toISOString() })),
      reset: () => replaceNow(createDraft()),
      loadExample: () => replaceNow(exampleDraft()),
      loadDraft: (d) => replaceNow(d),
      resumed,
      hasContent: hasMeaningfulContent(draft),
    }),
    [draft, resumed, replaceNow],
  )
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}

export function useDraft(): DraftContextValue {
  const ctx = React.useContext(DraftContext)
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider')
  return ctx
}
