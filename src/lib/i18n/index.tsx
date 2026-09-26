import * as React from 'react'
import { en, type TKey } from './en'
import { gu } from './gu'
import type { Lang } from '@/lib/format'
import { PREF_KEYS, readPref, writePref } from '@/lib/storage'

export type { TKey } from './en'
export type { Lang } from '@/lib/format'

/** Hindi is loaded on demand so English visitors don't download it. */
const DICTS: Record<Lang, Partial<Record<TKey, string>>> = { en, hi: {}, gu }
let hiLoaded = false
export async function loadLanguage(lang: Lang): Promise<void> {
  if (lang === 'hi' && !hiLoaded) {
    const mod = await import('./hi')
    DICTS.hi = mod.hi
    hiLoaded = true
  }
}

export const LANGUAGES: { code: Lang; label: string; available: boolean }[] = [
  { code: 'en', label: 'English', available: true },
  { code: 'hi', label: 'हिंदी', available: true },
  { code: 'gu', label: 'ગુજરાતી', available: false },
]

export type Params = Record<string, string | number>

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in params ? String(params[key]) : m))
}

export function translate(lang: Lang, key: string, params?: Params): string {
  const dict = DICTS[lang] as Record<string, string | undefined>
  const base = en as Record<string, string>
  const template = dict[key] ?? base[key]
  if (template === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`)
    return key
  }
  return interpolate(template, params)
}

/** Whether a key exists (used for optional engine codes). */
export function hasKey(key: string): boolean {
  return key in en
}

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Typed lookup for static UI strings. */
  t: (key: TKey, params?: Params) => string
  /** Dynamic lookup for keys built from engine codes. */
  tx: (key: string, params?: Params) => string
}

const I18nContext = React.createContext<I18nValue | null>(null)

function initialLang(): Lang {
  const saved = readPref(PREF_KEYS.lang)
  return saved === 'hi' || saved === 'en' ? saved : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(initialLang)
  // Bumped when a dictionary finishes loading so translations re-render.
  const [version, setVersion] = React.useState(0)
  React.useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : lang === 'gu' ? 'gu' : 'en-IN'
    let active = true
    loadLanguage(lang).then(() => active && setVersion((v) => v + 1))
    return () => {
      active = false
    }
  }, [lang])
  const value = React.useMemo<I18nValue>(
    () => ({
      lang,
      setLang: (l) => {
        setLangState(l)
        writePref(PREF_KEYS.lang, l)
      },
      t: (key, params) => translate(lang, key, params),
      tx: (key, params) => translate(lang, key, params),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, version],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = React.useContext(I18nContext)
  if (!ctx) {
    // Fallback for isolated component tests.
    return {
      lang: 'en',
      setLang: () => {},
      t: (key, params) => translate('en', key, params),
      tx: (key, params) => translate('en', key, params),
    }
  }
  return ctx
}
