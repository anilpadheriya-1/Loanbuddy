import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppRoutes } from '@/App'
import { LanguageProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/components/layout/theme'
import { DraftProvider } from '@/features/check-loan/DraftContext'
import { exampleDraft, num } from '@/features/check-loan/draft'

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <DraftProvider>
          <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
          </MemoryRouter>
        </DraftProvider>
      </LanguageProvider>
    </ThemeProvider>,
  )
}

beforeEach(() => localStorage.clear())

describe('Home', () => {
  it('shows the live illustrative example, clearly labelled', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Know what your loan REALLY costs.')
    expect(screen.getByText('Illustrative example — not a real lender offer.')).toBeInTheDocument()
    expect(screen.getByText('₹4,80,000')).toBeInTheDocument()
    expect(screen.getByText('14.39%')).toBeInTheDocument()
  })
})

describe('Loan Cost Report', () => {
  it('renders the effective cost, summary and neutral wording from a saved draft', async () => {
    localStorage.setItem('lri.v1.draft', JSON.stringify(exampleDraft()))
    renderAt('/check-loan/results')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Illustrative example')
    const hero = screen.getByRole('region', { name: 'Estimated effective annualized cost' })
    expect(within(hero).getByText('14.39%')).toBeInTheDocument()
    expect(within(hero).getByText('12.00%')).toBeInTheDocument()
    expect(screen.getByText(/Your lender quotes 12.00%/)).toBeInTheDocument()
    expect(screen.getByText('This is a calculation from the information you entered. It is not a finding of misconduct.')).toBeInTheDocument()
    expect(screen.getByText(/Not a credit score. Not a CIBIL score/)).toBeInTheDocument()
  })

  it('asks for missing information instead of guessing', async () => {
    renderAt('/check-loan/results')
    expect(await screen.findByText('We need a little more information')).toBeInTheDocument()
  })

  it('shows the reconciliation alert when the EMI does not match the rate', async () => {
    localStorage.setItem('lri.v1.draft', JSON.stringify({ ...exampleDraft(), emi: num(15_500) }))
    renderAt('/check-loan/results')
    expect(await screen.findByText('These numbers do not reconcile')).toBeInTheDocument()
    expect(screen.getByText(/Common reasons \(not evidence of wrongdoing\)/)).toBeInTheDocument()
  })
})

describe('Check My Loan wizard', () => {
  it('blocks Step 1 until amount and tenure are entered, then moves on', async () => {
    const user = userEvent.setup()
    renderAt('/check-loan')
    await user.click(await screen.findByRole('button', { name: /Next/ }))
    expect(screen.getByText('Please check the highlighted fields.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Loan amount sanctioned'), '300000')
    await user.type(screen.getByLabelText('Tenure'), '36')
    await user.click(screen.getByRole('button', { name: /Next/ }))
    expect(await screen.findByText(/Step 2 of 5/)).toBeInTheDocument()
  })

  it('switches the core flow to Hindi', async () => {
    const user = userEvent.setup()
    renderAt('/check-loan')
    await user.click(await screen.findByRole('button', { name: /Language: हिंदी/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'मेरा लोन जाँचें' })).toBeInTheDocument()
  })
})
