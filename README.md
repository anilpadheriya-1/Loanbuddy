# Loan Reality India

**Know what your loan REALLY costs.**

An educational, private tool for Indian borrowers. Enter a home, vehicle, personal, education, gold, business or consumer loan. It rebuilds the actual cash flows (what you received, every EMI, every known charge) and shows:

- **Estimated effective annualized cost** versus the quoted rate, with a step-by-step explanation of the gap.
- **Net amount received** versus the loan amount, and a full cost breakdown in ₹.
- An **EMI reconciliation check**, including flat-rate detection.
- A paise-exact **amortization schedule** (table, yearly and chart views).
- A **Loan Deal Score (0–100)** where every point is explained, plus a **Data Confidence** level.
- **Questions to ask your lender** and **RBI rules that may apply**, linked to official sources.
- **Ask Your Lender**: a checklist of the 14 details to get from the lender, including the KFS, APR, every deduction, and prepayment and foreclosure charges. It includes a ready-made request message in English or Hindi (copy, share or email) and tracks each detail as received, asked or not shared. The **real ROI** updates live as you fill details in, and is compared with the APR printed in the KFS. If the lender won't share, the page explains what RBI requires and how to escalate.
- A **Savings Lab**: extra EMI, lump sums, reduce EMI vs tenure, rate negotiation, balance transfer break-even, optional add-ons, and late/bounce costs.
- **Compare Loans**, **My Loans**, 26 **Learn** guides, **Rules & Sources**, and document and grievance checklists.

It is **not** a lender, marketplace or credit bureau:

- No "Apply Now" and no lender rankings.
- No PAN, Aadhaar or bank details.
- No credit pulls.
- Everything runs on the device and is saved only in `localStorage`.
- The website has no ads. The free Android app shows a Google AdMob banner when online (see [Ads](#ads-android-app)). Loan data never reaches the ad SDK.

The app never labels a lender "fake", "fraud" or similar because of a calculation. A difference between the quoted rate and the effective cost is explained in neutral terms, and results always carry the disclaimer that they are calculations, not findings of misconduct.

## Four different numbers

| Number | What it is |
|---|---|
| Quoted rate | The headline rate the lender states (flat or reducing). |
| Estimated effective annualized cost | Our calculation: periodic IRR of the borrower cash flows × periods per year, reducing balance. This is the convention RBI uses to illustrate APR in a KFS. |
| APR (in the KFS) | The lender's official figure. Ask for it; it may differ in timing or charge treatment. |
| Loan Deal Score | Our 0–100 cost/transparency score for one loan. It is not a credit score, not CIBIL and not a lender rating. |

## Methodology

- **Cash flows.** At t = 0 the borrower gets the net amount actually received, minus separately paid charges. EMIs follow at their actual timing:
  - advance EMIs are paid at t = 0;
  - a moratorium delays the first EMI;
  - an irregular first EMI date is measured as whole calendar months plus days ÷ (365/12).

  Known recurring fees are included. Contingent charges (late payment, bounce, penal, collection) are shown separately and never included.
- **Effective cost.** Monthly IRR × 12. The compounded effective annual rate is also shown. The engine reproduces RBI's KFS illustration exactly: ₹20,000 at 15% for 24 months, ₹400 of fees, net disbursed ₹19,600 → **APR 17.07%**.
- **Unknown values are never treated as ₹0.** Every optional field can be "I don't know". The report lists what is missing and says the estimate may be higher or lower.
- **Attribution.** Items are added one at a time: quoted rate → flat-method effect → EMI difference → advance EMIs/timing → processing → GST → insurance → documentation/legal → dealer/LSP → other/unitemised → recurring. The steps add up exactly to the effective cost.
- **Pre-payment rules.** These are encoded from RBI's *Pre-payment Charges on Loans Directions, 2025* (loans sanctioned or renewed from 1 Jan 2026), plus the earlier floating-rate rule for older loans. The result is always informational ("appears to", "cannot tell yet") and never a legal conclusion.

Sources, dates and status are in [`src/content/sources.ts`](src/content/sources.ts) and on the **Rules & Sources** page. The last source review was September 2026. That is the date of our review, not a promise that the rules haven't changed.

## Tech

- React 19, TypeScript, Vite, Tailwind CSS v4.
- shadcn-style components on Radix UI, React Router, Recharts, zod/mini.
- Fonts are self-hosted (IBM Plex Sans, Noto Sans Devanagari).
- All financial maths lives in [`src/lib/finance`](src/lib/finance). These are pure, deterministic functions with no UI code. Amortization accumulates in integer paise.
- i18n uses a small typed dictionary layer. English and Hindi cover the core flow (navigation, wizard, report, disclaimers), and Hindi is loaded on demand. Gujarati is stubbed. Learn and Rules content is English for now.
- Android banner ads: [`src/lib/ads`](src/lib/ads), a pure state machine plus controller (see [Ads](#ads-android-app)).
- Storage goes through a `LoanRepository` interface ([`src/lib/storage`](src/lib/storage)). The MVP uses localStorage; a future authenticated backend can replace it.

```
src/
  lib/finance/      EMI, amortization, flat rate, implied rate, IRR/XIRR, cash flows,
                    analyzeLoan, attribution, prepayment & savings scenarios, balance
                    transfer, existing-loan analysis, RBI pre-payment rules, confidence,
                    Loan Deal Score, lender questions, comparison (+ tests)
  lib/format.ts     ₹ formatting (Indian grouping, lakh/crore)
  lib/i18n/         en.ts, hi.ts, gu.ts, provider, engine-message renderer
  lib/storage/      LoanRepository + localStorage implementation
  content/          sources, Learn articles, glossary, checklists, lender library (empty)
  features/         Check My Loan draft/wizard, Compare offers
  components/       ui primitives, layout, loan inputs, results, savings
  pages/            one file per route
```

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit + component tests (Vitest)
npm run lint
npm run typecheck
npm run build        # production build to dist/
npm run check        # all of the above
npm run e2e          # Playwright: flows, Hindi, deep links, no horizontal scroll at 360px/1280px
```

Deployment is on Netlify (`netlify.toml`): the build command is `npm run build`, the publish directory is `dist`, and an SPA fallback makes deep links such as `/check-loan/results` work on refresh.

## Android app (APK)

The Android app wraps the same web build with [Capacitor](https://capacitorjs.com).
- Every feature works offline, and loan data stays on the phone.
- Cloud backup and device transfer are disabled in the manifest.
- The only network use is the banner ad, which appears only when the phone is online.

**Getting a test APK (no Android Studio needed).** The GitHub Action [`.github/workflows/android.yml`](.github/workflows/android.yml) runs on every push to `main` or `claude/**`, and can also be started from the **Actions** tab ("Run workflow"). Each run:

1. runs lint, typecheck and all unit tests, and builds the website;
2. checks that the website contains no AdMob code;
3. builds `loan-reality-india-debug.apk`, which shows **Google test ads only**;
4. runs the **emulator checks** ([`scripts/android-check.mjs`](scripts/android-check.mjs), Android 15 emulator) and uploads screenshots and a results table (`android-check-<run>` artifact):

   | Case | What passes |
   |---|---|
   | Fresh install, online | One banner; footer text above it; banner above the navigation bar |
   | Fresh install, offline | Home, example report (14.39%), Ask Your Lender and Learn work; no banner, no gap |
   | Forms | No banner on Check My Loan or Ask Your Lender |
   | Consent (EEA test geography) | Google's consent form appears; after consenting, the banner appears; the form is not shown again |
   | Privacy choices | "Ad privacy choices" opens Google's form; the app follows the new choice |
   | Internet → offline → flapping → online | Banner removed at once; exactly one banner is created when the connection is back |
   | Background/foreground, rotation, back button | Same screen, one banner, re-sized for landscape, follows the screen |
   | Low-memory restart | Draft restored; ads start once |

5. attaches the debug APK to the **`android-latest`** pre-release. Open that page on an Android phone, download the APK and allow "install from this source".

**Building locally** needs Android Studio (or the Android SDK) and JDK 21:

```bash
npm run android:sync     # build the Android web bundle (--mode android) and copy it into android/
npm run android:open     # open in Android Studio, or: cd android && ./gradlew assembleDebug
npm run android:assets   # regenerate launcher icons and splash screens from the logo
```

Differences in the app:
- Share uses Android's share sheet.
- "Print / Save PDF" is not shown, because Android's WebView cannot print.

### Ads (Android app)

The ad code lives in [`src/lib/ads`](src/lib/ads).
- It is loaded only by the Android build (`vite build --mode android`) and only on a device.
- The website build removes it entirely, and CI checks for that.

**Behaviour:**
- A pure state machine (`state.ts`) moves through `idle → loading → consent_required / ready / offline / failed`.
- `controller.ts` runs it against the plugin:
  - one banner, created once, then only hidden and resumed;
  - listeners are removed on dispose;
  - the `online` event is debounced;
  - a failed ad is retried after 60 s, and ads stop for the session after 3 failures.
- The SDK starts at launch, even offline. Ads are requested only when online, and only when Google's consent SDK says `canRequestAds`. The consent form appears where the law requires it (EEA/UK).
- There is no banner on Check My Loan or Ask Your Lender, or while a dialog, dropdown or keyboard is open. When no ad is visible, the app reserves no space for it (`--ad-height: 0px`).
- The ad request contains only the ad unit ID, size, position and margin. Tests enforce this, and also that the ads code cannot import the calculator, drafts or storage.
- `patches/` holds a small fix to `@capacitor-community/admob`, applied on `npm install`. On Android 15+ the plugin replaced Capacitor's window-insets listener, which broke keyboard resizing and safe areas. The app now passes the navigation-bar inset as the banner margin instead.

**Test vs real ads:**
- Debug builds always use Google's test IDs.
- Real IDs come only from the Release workflow's repository variables.
- Gradle refuses to build a release without a real `ADMOB_APP_ID`.

## Publish on Google Play

Only you can do the account steps; the rest is automated. In order:

1. **AdMob.** Create an AdMob account and add the app (Android, "not yet published"). Create one **adaptive banner** ad unit. Note the **App ID** (`ca-app-pub-…~…`) and the **ad unit ID** (`ca-app-pub-…/…`).
2. **Consent message.** In **AdMob → Privacy & messaging**, create the **GDPR (EEA/UK)** consent message for this app.
3. **Ad content.** In **AdMob → Blocking controls**, block the loan and credit categories under Finance, and the "Get Rich Quick" sensitive category. This keeps loan offers out of the ad slot, in line with the app's "not a marketplace" promise.
4. **Upload key.** Create an upload keystore once, and keep it safe: every update must be signed with it.

   ```bash
   keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias loanreality
   ```

5. **Repository settings.** In GitHub → **Settings → Secrets and variables → Actions**, add:

   | Kind | Name | Value |
   |---|---|---|
   | Secret | `ANDROID_KEYSTORE_BASE64` | output of `base64 -w0 release.jks` |
   | Secret | `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | from step 4 |
   | Variable | `ADMOB_APP_ID` | AdMob App ID |
   | Variable | `ADMOB_BANNER_ID` | banner ad unit ID |
   | Variable | `PRIVACY_POLICY_URL` | `https://<your site>/privacy-policy.html` |
   | Variable | `APP_ADS_TXT_URL` | `https://<your site>/app-ads.txt` |

6. **Website files.** Deploy the website so these two files are live:
   - [`public/privacy-policy.html`](public/privacy-policy.html), which is already written;
   - `public/app-ads.txt`, containing the line AdMob shows you: `google.com, pub-<your publisher id>, DIRECT, f08c47fec0942fa0`.

   Enter the same website in the Play listing's contact details.
7. **Play Console.** Create a developer account.
   - New personal accounts must run a **closed test with at least 12 testers for 14 days** before they can publish to production.
   - Create the app with the app ID **`com.loanrealityindia.app`**. It cannot change after the first upload.
8. **App content forms:**
   - privacy policy URL;
   - **Contains ads: Yes**;
   - target audience **18+**;
   - content rating questionnaire;
   - **Financial features:** it does not provide or facilitate loans (an educational calculator);
   - **Data safety:** see [`store/data-safety.md`](store/data-safety.md), and check it against Google's page for the SDK version shown in the workflow summary.
9. **Store listing.** Use the text and graphics in [`store/`](store) ([`listing.md`](store/listing.md), icon, feature graphic, screenshots). Regenerate the graphics with `npm run store:assets`.
10. **Real-phone checks.** Do the checks in [`store/release-checklist.md`](store/release-checklist.md). Never tap your own real ads.
11. **Release workflow.** Run **Actions → Release (Play Store) → Run workflow** and tick both confirmations. The **release gate** ([`scripts/release-gate.mjs`](scripts/release-gate.mjs)) blocks the build unless all of these pass:
    - real AdMob IDs from one account (never Google's test IDs);
    - signing secrets present;
    - privacy policy and `app-ads.txt` live (app-ads.txt must contain your publisher line);
    - Data safety done and consent tested (the two ticks);
    - all tests and end-to-end tests;
    - a website build with no AdMob code;
    - the emulator checks.

    It then builds and verifies the signed `.aab`. Download it from the run's artifacts and upload it in Play Console.
12. **Link in AdMob.** After the app is live, link it to its Play listing in AdMob (App settings → "Add store"), so ads can serve at full rate.

## Quality checks built into the test suite

- The RBI KFS APR illustration, zero-interest loans, fees deducted vs paid separately, flat vs reducing, and EMI mismatch.
- Prepayment and extra-EMI scenarios, balance transfers where a lower rate still loses money, existing-loan closure, unknown charges, score and confidence.
- Every regulatory source has an official URL, date, status and verification date. Historical rules are marked "HISTORICAL — NOT CURRENT RULE".
- UI copy never uses accusatory words about lenders (English and Hindi).
- Rupees only: no `$`, USD or `en-US` number formatting anywhere in `src/`.
- Ads: every consent status, offline/online, route, rotation and failure path of the ad state machine and controller; ad requests carry no loan data; the release gate rejects test or mismatched AdMob IDs.
- No invented lender rates or social proof.

## Future phases

- On-device KFS / sanction-letter reading (OCR + extraction), with the user's permission.
- Opt-in, anonymised KFS sharing to build a crowd-sourced, verified view of real loan costs.
- A verified lender/product library. The data model is ready; entries need an official source, a source date and a verification date.
- Optional accounts to sync saved loans (e.g. Supabase) behind the existing repository interface.
- A balance-transfer marketplace, credit-score simulator, multi-loan portfolio view, and WhatsApp bot.
- Full Hindi and Gujarati for the Learn and Rules content, reviewed by native speakers.

## Disclaimer

Loan Reality India provides calculations and educational information, not lending, legal, tax or investment advice. Calculations depend on the information entered and may differ from a lender's official APR/KFS where cash-flow timing or charge treatment differs. Verify the KFS, sanction letter, loan agreement and account statement before acting.
