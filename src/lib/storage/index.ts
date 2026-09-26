import { z } from 'zod/mini'
import { LoanDraftSchema, type LoanDraft } from '@/features/check-loan/draft'

/**
 * Where calculations are kept. The MVP stores everything in this browser only
 * (localStorage) — nothing is sent to a server. The repository interface lets
 * a future authenticated backend (e.g. Supabase) replace this without
 * touching the UI.
 */

export const SavedSummarySchema = z.object({
  effectivePct: z.nullable(z.number()),
  quotedPct: z.nullable(z.number()),
  emi: z.number(),
  tenurePeriods: z.number(),
  totalInterest: z.number(),
  totalCost: z.number(),
  potentialSavings: z.nullable(z.number()),
  score: z.nullable(z.number()),
  confidence: z.enum(['high', 'medium', 'low']),
})
export type SavedSummary = z.infer<typeof SavedSummarySchema>

export const SavedLoanSchema = z.object({
  id: z.string(),
  label: z.string(),
  savedAt: z.string(),
  draft: LoanDraftSchema,
  summary: SavedSummarySchema,
})
export type SavedLoan = z.infer<typeof SavedLoanSchema>

export interface LoanRepository {
  getDraft(): LoanDraft | null
  saveDraft(draft: LoanDraft): void
  clearDraft(): void
  listSaved(): SavedLoan[]
  getSaved(id: string): SavedLoan | null
  upsertSaved(loan: SavedLoan): void
  removeSaved(id: string): void
  clearAll(): void
}

const KEYS = {
  draft: 'lri.v1.draft',
  saved: 'lri.v1.saved',
} as const

/** Other per-device preferences we store (not financial data). */
export const PREF_KEYS = {
  theme: 'lri.theme',
  lang: 'lri.lang',
  compare: 'lri.v1.compare',
} as const

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked (private mode): the calculator still works, it just can't remember.
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function createLocalRepository(): LoanRepository {
  return {
    getDraft() {
      const parsed = LoanDraftSchema.safeParse(read(KEYS.draft))
      return parsed.success ? parsed.data : null
    },
    saveDraft(draft) {
      write(KEYS.draft, draft)
    },
    clearDraft() {
      remove(KEYS.draft)
    },
    listSaved() {
      const raw = read(KEYS.saved)
      if (!Array.isArray(raw)) return []
      // Drop entries that no longer match the schema instead of crashing.
      return raw
        .map((item) => SavedLoanSchema.safeParse(item))
        .filter((r) => r.success)
        .map((r) => r.data!)
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    },
    getSaved(id) {
      return this.listSaved().find((l) => l.id === id) ?? null
    },
    upsertSaved(loan) {
      const all = this.listSaved().filter((l) => l.id !== loan.id)
      write(KEYS.saved, [loan, ...all])
    },
    removeSaved(id) {
      write(
        KEYS.saved,
        this.listSaved().filter((l) => l.id !== id),
      )
    },
    clearAll() {
      remove(KEYS.draft)
      remove(KEYS.saved)
      remove(PREF_KEYS.compare)
    },
  }
}

export const repository: LoanRepository = createLocalRepository()

export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
export function writePref(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}
