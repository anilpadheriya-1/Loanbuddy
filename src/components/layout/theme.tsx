import * as React from 'react'
import { PREF_KEYS, readPref, writePref } from '@/lib/storage'
import { syncSystemBars } from '@/lib/native'

type Theme = 'light' | 'dark'
const ThemeContext = React.createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} })

/** Light by default; the user's choice is remembered on this device. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(() => (readPref(PREF_KEYS.theme) === 'dark' ? 'dark' : 'light'))
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a1222' : '#0b2a5b')
    syncSystemBars(theme)
  }, [theme])
  const value = React.useMemo(
    () => ({
      theme,
      toggle: () =>
        setTheme((t) => {
          const next = t === 'dark' ? 'light' : 'dark'
          writePref(PREF_KEYS.theme, next)
          return next
        }),
    }),
    [theme],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return React.useContext(ThemeContext)
}
