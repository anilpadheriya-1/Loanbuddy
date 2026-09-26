import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Languages, Menu, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { useI18n, LANGUAGES, type TKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { useTheme } from './theme'
import { Disclaimer } from './Disclaimer'

const NAV: { to: string; key: TKey; end?: boolean }[] = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/check-loan', key: 'nav.check' },
  { to: '/my-loans', key: 'nav.myLoans' },
  { to: '/savings', key: 'nav.savings' },
  { to: '/compare', key: 'nav.compare' },
  { to: '/learn', key: 'nav.learn' },
  { to: '/rules', key: 'nav.rules' },
  { to: '/about', key: 'nav.about' },
]

export function Layout() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('common.skipToContent')}
      </a>
      <Header />
      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  const { t } = useI18n()
  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 rounded-md font-bold text-primary" aria-label={t('brand.name')}>
          <Logo className="size-8 shrink-0 text-primary" />
          <span className="truncate text-sm leading-tight min-[380px]:text-[15px] sm:text-base">
            Loan Reality <span className="text-brand">India</span>
          </span>
        </Link>
        <nav aria-label={t('nav.main')} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {NAV.slice(1).map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex h-10 items-center rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
                      isActive && 'bg-accent text-foreground',
                    )
                  }
                >
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 lg:ml-2">
          <LanguageSwitch />
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n()
  const next = lang === 'hi' ? 'en' : 'hi'
  const label = LANGUAGES.find((l) => l.code === next)!.label
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-10 gap-1.5 px-2 sm:px-2.5', className)}
      onClick={() => setLang(next)}
      aria-label={`${t('common.language')}: ${label}`}
      lang={next === 'hi' ? 'hi' : 'en'}
    >
      <Languages aria-hidden className="hidden sm:block" />
      <span>{label}</span>
    </Button>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useI18n()
  return (
    <Button variant="ghost" size="icon" className="size-10" onClick={toggle} aria-label={t('common.toggleTheme')} aria-pressed={theme === 'dark'}>
      {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  )
}

function MobileMenu() {
  const { t } = useI18n()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-10 lg:hidden" aria-label={t('common.menu')}>
          <Menu aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent side="right" closeLabel={t('common.close')} aria-describedby={undefined}>
        <DialogTitle>{t('common.menu')}</DialogTitle>
        <nav aria-label={t('nav.main')}>
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <DialogClose asChild>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn('flex min-h-12 items-center rounded-lg px-3 text-base font-medium hover:bg-accent', isActive && 'bg-accent text-accent-foreground')
                    }
                  >
                    {t(item.key)}
                  </NavLink>
                </DialogClose>
              </li>
            ))}
            <li className="mt-2 border-t pt-2">
              <DialogClose asChild>
                <NavLink to="/documents" className="flex min-h-12 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent">
                  {t('nav.documents')}
                </NavLink>
              </DialogClose>
            </li>
            <li>
              <DialogClose asChild>
                <NavLink to="/help" className="flex min-h-12 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent">
                  {t('nav.help')}
                </NavLink>
              </DialogClose>
            </li>
            <li>
              <DialogClose asChild>
                <NavLink to="/privacy" className="flex min-h-12 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-accent">
                  {t('nav.privacy')}
                </NavLink>
              </DialogClose>
            </li>
          </ul>
        </nav>
      </DialogContent>
    </Dialog>
  )
}

function Footer() {
  const { t } = useI18n()
  const links: { to: string; key: TKey }[] = [
    { to: '/check-loan', key: 'nav.check' },
    { to: '/savings', key: 'nav.savings' },
    { to: '/compare', key: 'nav.compare' },
    { to: '/learn', key: 'nav.learn' },
    { to: '/rules', key: 'nav.rules' },
    { to: '/documents', key: 'nav.documents' },
    { to: '/help', key: 'nav.help' },
    { to: '/about', key: 'nav.about' },
    { to: '/privacy', key: 'nav.privacy' },
  ]
  return (
    <footer className="no-print mt-16 border-t bg-card">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div className="max-w-sm space-y-2">
            <p className="flex items-center gap-2 font-bold text-primary">
              <Logo className="size-7 text-primary" /> {t('brand.name')}
            </p>
            <p className="text-sm text-muted-foreground">{t('brand.tagline')}</p>
            <p className="text-sm text-muted-foreground">{t('footer.notLender')}</p>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
              {links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="inline-flex min-h-10 items-center text-muted-foreground hover:text-foreground hover:underline">
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <Disclaimer />
        <p className="text-xs text-muted-foreground">
          {t('footer.built')} {t('footer.privacy')}
        </p>
      </div>
    </footer>
  )
}
