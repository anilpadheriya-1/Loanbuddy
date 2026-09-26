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
- Everything runs in the browser and is saved only in `localStorage`.

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

The Android app wraps the same web build with [Capacitor](https://capacitorjs.com). It runs fully offline, and loan data stays on the phone: cloud backup and device transfer are disabled in the manifest.

**Getting an APK (no Android Studio needed).** The GitHub Action [`.github/workflows/android.yml`](.github/workflows/android.yml) builds it on every push to `main` or `claude/**`, and can also be started from the **Actions** tab ("Run workflow"). Each successful run:

- attaches `loan-reality-india-debug.apk` to the **`android-latest`** pre-release on the Releases page. Open it on an Android phone, download, and allow "install from this source";
- uploads the same file as a workflow artifact.

**Play Store builds (optional).** Create an upload keystore once:

```bash
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias loanreality
```

Then add these repository secrets: `ANDROID_KEYSTORE_BASE64` (the output of `base64 -w0 release.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. The workflow will also produce a signed `loan-reality-india-release.apk` and an `.aab` for the Play Store. Keep the keystore safe: every future update must be signed with it.

The app id is `com.loanrealityindia.app` (in `capacitor.config.ts` and `android/app/build.gradle`). Change it before the first Play Store upload if you want a different one; it cannot change afterwards.

**Building locally** needs Android Studio (or the Android SDK) and JDK 21:

```bash
npm run android:sync     # build the web app and copy it into android/
npm run android:open     # open in Android Studio, or: cd android && ./gradlew assembleDebug
npm run android:assets   # regenerate launcher icons and splash screens from the logo
```

Differences in the app: Share uses Android's share sheet, and "Print / Save PDF" is not shown because Android's WebView cannot print.

## Quality checks built into the test suite

- The RBI KFS APR illustration, zero-interest loans, fees deducted vs paid separately, flat vs reducing, and EMI mismatch.
- Prepayment and extra-EMI scenarios, balance transfers where a lower rate still loses money, existing-loan closure, unknown charges, score and confidence.
- Every regulatory source has an official URL, date, status and verification date. Historical rules are marked "HISTORICAL — NOT CURRENT RULE".
- UI copy never uses accusatory words about lenders (English and Hindi).
- Rupees only: no `$`, USD or `en-US` number formatting anywhere in `src/`.
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
