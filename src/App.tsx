import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from '@/components/layout/Layout'
import { LanguageProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/components/layout/theme'
import { DraftProvider } from '@/features/check-loan/DraftContext'
import { HomePage } from '@/pages/Home'
import { PageLoading } from '@/components/layout/PageLoading'

const CheckLoanPage = lazy(() => import('@/pages/CheckLoan'))
const AskLenderPage = lazy(() => import('@/pages/AskLender'))
const ResultsPage = lazy(() => import('@/pages/Results'))
const SavingsPage = lazy(() => import('@/pages/Savings'))
const ComparePage = lazy(() => import('@/pages/Compare'))
const LearnPage = lazy(() => import('@/pages/Learn'))
const ArticlePage = lazy(() => import('@/pages/Article'))
const RulesPage = lazy(() => import('@/pages/Rules'))
const DocumentsPage = lazy(() => import('@/pages/Documents'))
const HelpPage = lazy(() => import('@/pages/Help'))
const MyLoansPage = lazy(() => import('@/pages/MyLoans'))
const AboutPage = lazy(() => import('@/pages/About'))
const PrivacyPage = lazy(() => import('@/pages/Privacy'))
const NotFoundPage = lazy(() => import('@/pages/NotFound'))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="check-loan" element={<Lazy el={<CheckLoanPage />} />} />
        <Route path="check-loan/results" element={<Lazy el={<ResultsPage />} />} />
        <Route path="ask-lender" element={<Lazy el={<AskLenderPage />} />} />
        <Route path="savings" element={<Lazy el={<SavingsPage />} />} />
        <Route path="compare" element={<Lazy el={<ComparePage />} />} />
        <Route path="learn" element={<Lazy el={<LearnPage />} />} />
        <Route path="learn/:slug" element={<Lazy el={<ArticlePage />} />} />
        <Route path="rules" element={<Lazy el={<RulesPage />} />} />
        <Route path="documents" element={<Lazy el={<DocumentsPage />} />} />
        <Route path="help" element={<Lazy el={<HelpPage />} />} />
        <Route path="my-loans" element={<Lazy el={<MyLoansPage />} />} />
        <Route path="about" element={<Lazy el={<AboutPage />} />} />
        <Route path="privacy" element={<Lazy el={<PrivacyPage />} />} />
        <Route path="not-found" element={<Lazy el={<NotFoundPage />} />} />
        <Route path="*" element={<Lazy el={<NotFoundPage />} />} />
      </Route>
    </Routes>
  )
}

function Lazy({ el }: { el: React.ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{el}</Suspense>
}

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <DraftProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DraftProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
