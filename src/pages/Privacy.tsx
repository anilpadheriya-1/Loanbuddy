import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { repository } from '@/lib/storage'

export default function PrivacyPage() {
  usePageTitle('Privacy')
  const [cleared, setCleared] = useState(false)
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10" lang="en">
      <h1 className="text-2xl font-bold sm:text-3xl">Privacy</h1>
      <div className="space-y-4 text-[15px] leading-relaxed">
        <p className="text-lg font-medium">Your loan numbers stay in your browser.</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Calculations run entirely on your device. We have no server that receives your loan details.</li>
          <li>Answers in progress and saved loans are stored in this browser’s local storage, only so you can come back to them.</li>
          <li>We never put your financial data in page addresses (URLs). Saved reports are opened by a random ID.</li>
          <li>Fonts are bundled with the app, so loading a page doesn’t contact third-party font services.</li>
          <li>Links to official sources (RBI, CBIC, CIBIL) open those sites, which have their own privacy policies.</li>
        </ul>
        <h2 className="pt-2 text-lg font-semibold">We never ask for</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>PAN, Aadhaar, date of birth or address</li>
          <li>Bank account numbers, card details, UPI IDs, net-banking or other passwords, or OTPs</li>
          <li>Permission to check your credit score — there is no hard or soft credit pull</li>
        </ul>
        <p>There are no loan applications here, and nothing you enter is shared with any lender.</p>
        <h2 className="pt-2 text-lg font-semibold">Delete your data</h2>
        <p>Clear everything this app has stored in this browser: your in-progress answers, saved loans and comparisons. Theme and language preferences are kept.</p>
        <Button
          variant="danger"
          onClick={() => {
            repository.clearAll()
            setCleared(true)
          }}
        >
          Clear my saved data
        </Button>
        {cleared && (
          <Alert tone="success" role="status">
            Done. Reload the page to start fresh.
          </Alert>
        )}
      </div>
    </div>
  )
}
