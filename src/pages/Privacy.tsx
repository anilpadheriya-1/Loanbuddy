import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { usePageTitle } from '@/components/layout/usePageTitle'
import { repository } from '@/lib/storage'
import { isNativeApp } from '@/lib/native'
import { onAdState, showAdPrivacyOptions } from '@/lib/ads'

/** Banner ads exist only in the Android app build. */
const ADS_APP = import.meta.env.MODE === 'android' && isNativeApp()

export default function PrivacyPage() {
  usePageTitle('Privacy')
  const [cleared, setCleared] = useState(false)
  const [privacyChoicesAvailable, setPrivacyChoicesAvailable] = useState(false)
  useEffect(() => onAdState((s) => setPrivacyChoicesAvailable(s.consent?.privacyOptionsRequired === true)), [])

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-10" lang="en">
      <h1 className="text-2xl font-bold sm:text-3xl">Privacy</h1>
      <div className="space-y-4 text-[15px] leading-relaxed">
        <p className="text-lg font-medium">Your loan numbers stay on your device.</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Calculations run entirely on your device. We have no server that receives your loan details.</li>
          <li>Answers in progress and saved loans are stored only on this device (the browser’s or app’s local storage), so you can come back to them.</li>
          <li>We never put your financial data in page addresses (URLs). Saved reports are opened by a random ID.</li>
          <li>Fonts are bundled with the app, so loading a page doesn’t contact third-party font services.</li>
          <li>Links to official sources (RBI, CBIC, CIBIL) open those sites, which have their own privacy policies.</li>
        </ul>

        <h2 className="pt-2 text-lg font-semibold">Ads (Android app only)</h2>
        <p>
          The website has no ads. The free Android app shows a small banner ad from Google AdMob when your phone is online; with no internet, the app works fully and shows no
          ads.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            To show and measure ads, Google may receive your device’s advertising ID, IP address (approximate location), device information and how you interact with the ads,
            under{' '}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer" className="text-brand underline">
              Google’s policy
            </a>
            .
          </li>
          <li>Your loan inputs, saved loans and reports are never sent to Google or anyone else. The ad request contains no information from the calculator.</li>
          <li>We don’t choose individual ads, and an ad is not a recommendation.</li>
          <li>
            You can reset your advertising ID or opt out of ads personalisation in your phone’s Settings → Privacy → Ads (the exact menu depends on your phone). Where the law
            requires it (for example in the EEA and UK), the app asks for your consent first.
          </li>
        </ul>
        {ADS_APP && privacyChoicesAvailable && (
          <Button variant="outline" onClick={() => void showAdPrivacyOptions()}>
            Ad privacy choices
          </Button>
        )}

        <h2 className="pt-2 text-lg font-semibold">We never ask for</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>PAN, Aadhaar, date of birth or address</li>
          <li>Bank account numbers, card details, UPI IDs, net-banking or other passwords, or OTPs</li>
          <li>Permission to check your credit score — there is no hard or soft credit pull</li>
        </ul>
        <p>There are no loan applications here, and nothing you enter is shared with any lender.</p>
        <h2 className="pt-2 text-lg font-semibold">Delete your data</h2>
        <p>Clear everything this app has stored on this device: your in-progress answers, saved loans and comparisons. Theme and language preferences are kept.</p>
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
