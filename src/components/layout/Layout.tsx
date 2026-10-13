import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import {
  BookOpen,
  Calculator,
  ChevronRight,
  FileSearch,
  Home,
  Info,
  Landmark,
  LifeBuoy,
  Lock,
  Menu,
  Moon,
  PiggyBank,
  Scale,
  Sun,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { useI18n, LANGUAGES, type TKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { useTheme } from './theme'
import { Disclaimer } from './Disclaimer'

type NavItem = { to: string; key: TKey; icon: LucideIcon; end?: boolean }

/** Desktop header links: the five core destinations. */
const PRIMARY: NavItem[] = [
  { to: '/check-loan', key: 'nav.check', icon: Calculator },
  { to: '/my-loans', key: 'nav.myLoans', icon: Wallet },
  { to: '/savings', key: 'nav.savings', icon: PiggyBank },
  { to: '/compare', key: 'nav.compare', icon: Scale },
  { to: '/learn', key: 'nav.learn', icon: BookOpen },
]

/** Mobile bottom tabs (the fifth tab is "More"). */
const TABS: NavItem[] = [
  { to: '/', key: 'tab.home', icon: Home, end: true },
  { to: '/check-loan', key: 'tab.check', icon: Calculator },
  { to: '/my-loans', key: 'tab.myLoans', icon: Wallet },
  { to: '/savings', key: 'tab.savings', icon: PiggyBank },
]

/** Everything else, in the "More" sheet. */
const MORE: NavItem[] = [
  { to: '/compare', key: 'nav.compare', icon: Scale },
  { to: '/learn', key: 'nav.learn', icon: BookOpen },
  { to: '/rules', key: 'nav.rules', icon: Landmark },
  { to: '/documents', key: 'nav.documents', icon: FileSearch },
  { to: '/help', key: 'nav.help', icon: LifeBuoy },
  { to: '/about', key: 'nav.about', icon: Info },
  { to: '/privacy', key: 'nav.privacy', icon: Lock },
]
const MORE_PATHS = MORE.map((m) => m.to)

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
      <BottomTabs />
    </div>
  )
}

function Header() {
  const { t } = useI18n()
  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background/85 pt-[var(--safe-top)] backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 lg:h-16">
        <Link to="/" className="flex min-w-0 items-center gap-2 rounded-lg font-semibold text-primary" aria-label={t('brand.name')}>
          <Logo className="size-8 shrink-0 text-primary" />
          <span className="truncate text-[15px] leading-tight sm:text-base">
            Loan Reality <span className="text-brand">India</span>
          </span>
        </Link>
        <nav aria-label={t('nav.main')} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {PRIMARY.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground',
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
        <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-2">
          <LanguageSwitch />
          <ThemeToggle />
          <DesktopMore />
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
      className={cn('px-3', className)}
      onClick={() => setLang(next)}
      aria-label={`${t('common.language')}: ${label}`}
      lang={next === 'hi' ? 'hi' : 'en'}
    >
      <span>{label}</span>
    </Button>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useI18n()
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t('common.toggleTheme')} aria-pressed={theme === 'dark'}>
      {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  )
}

/** Desktop: the secondary pages live behind a small menu button in the header. */
function DesktopMore() {
  const { t } = useI18n()
  return (
    <MoreSheet side="right">
      <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label={t('common.menu')}>
        <Menu aria-hidden />
      </Button>
    </MoreSheet>
  )
}

function MoreSheet({ children, side, open, onOpenChange }: { children: React.ReactNode; side: 'right' | 'bottom'; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        side={side}
        closeLabel={t('common.close')}
        aria-describedby={undefined}
        className={side === 'right' ? 'pt-[calc(1.25rem+var(--safe-top))]' : undefined}
      >
        <DialogTitle>{t('nav.more')}</DialogTitle>
        <nav aria-label={t('nav.main')}>
          <ul className="flex flex-col gap-1">
            {MORE.map((item) => (
              <li key={item.to}>
                <DialogClose asChild>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-150 hover:bg-accent',
                        isActive && 'bg-accent text-accent-foreground',
                      )
                    }
                  >
                    <item.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">{t(item.key)}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
                  </NavLink>
                </DialogClose>
              </li>
            ))}
          </ul>
        </nav>
      </DialogContent>
    </Dialog>
  )
}

/** Mobile/tablet: app-style bottom tab bar, clear of the Android navigation bar. */
function BottomTabs() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = MORE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const tabCls = (active: boolean) =>
    cn(
      'flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] leading-none font-medium transition-colors duration-150',
      active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
    )
  const pill = (active: boolean) => cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150', active && 'bg-accent')

  return (
    <nav
      aria-label={t('nav.tabs')}
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[var(--safe-bottom)] pl-[var(--safe-left)] pr-[var(--safe-right)] backdrop-blur-md supports-[backdrop-filter]:bg-background/80 lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <NavLink to={tab.to} end={tab.end} className={({ isActive }) => tabCls(isActive)}>
              {({ isActive }) => (
                <>
                  <span className={pill(isActive)}>
                    <tab.icon className="size-5" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                  </span>
                  <span className="max-w-full truncate px-0.5">{t(tab.key)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li>
          <MoreSheet side="bottom" open={moreOpen} onOpenChange={setMoreOpen}>
            <button type="button" className={tabCls(moreActive)} aria-current={moreActive ? 'page' : undefined}>
              <span className={pill(moreActive)}>
                <Menu className="size-5" strokeWidth={moreActive ? 2.25 : 1.75} aria-hidden />
              </span>
              <span>{t('nav.more')}</span>
            </button>
          </MoreSheet>
        </li>
      </ul>
    </nav>
  )
}

function Footer() {
  const { t } = useI18n()
  const links: { to: string; key: TKey }[] = [
    { to: '/rules', key: 'nav.rules' },
    { to: '/documents', key: 'nav.documents' },
    { to: '/help', key: 'nav.help' },
    { to: '/about', key: 'nav.about' },
    { to: '/privacy', key: 'nav.privacy' },
  ]
  return (
    <footer className="mt-12 border-t pb-[calc(var(--bottom-nav)+var(--safe-bottom))] print:mt-6 print:pb-0">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <div className="no-print flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground lg:max-w-md">
            <Logo className="size-6 shrink-0 text-primary" />
            <span>{t('footer.notLender')}</span>
          </p>
          <nav aria-label="Footer" className="hidden lg:block">
            <ul className="flex flex-wrap justify-end gap-x-5 text-sm">
              {links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="inline-flex min-h-10 items-center text-muted-foreground hover:text-foreground">
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <Disclaimer />
        <p className="no-print text-xs text-muted-foreground">
          {t('footer.built')} {t('footer.privacy')}
        </p>
      </div>
    </footer>
  )
}
