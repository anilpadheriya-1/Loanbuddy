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

  // Debounced autosave.
  React.useEffect(() => {
    const id = window.setTimeout(() => repository.saveDraft(draft), 300)
    return () => window.clearTimeout(id)
  }, [draft])

  const value = React.useMemo<DraftContextValue>(
    () => ({
      draft,
      setDraft: (updater) =>
        setDraftState((prev) => {
          const next = typeof updater === 'function' ? updater(prev) : updater
          return { ...next, updatedAt: new Date().toISOString() }
        }),
      update: (patch) => setDraftState((prev) => ({ ...prev, ...patch, updatedAt: new Date().toISOString() })),
      reset: () => {
        setResumed(false)
        setDraftState(createDraft())
      },
      loadExample: () => {
        setResumed(false)
        setDraftState(exampleDraft())
      },
      loadDraft: (d) => {
        setResumed(false)
        setDraftState(d)
      },
      resumed,
      hasContent: hasMeaningfulContent(draft),
    }),
    [draft, resumed],
  )
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}

export function useDraft(): DraftContextValue {
  const ctx = React.useContext(DraftContext)
  if (!ctx) throw new Error('useDraft must be used inside DraftProvider')
  return ctx
}
