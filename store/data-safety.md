# Play Console — Data safety (draft answers)

This is a **draft** for **Play Console → Policy → App content → Data safety**. You submit the form, so check every answer against the current Google pages linked below before you send it.

## 1. What the app itself does

| Question | Answer | Why |
|---|---|---|
| Loan amounts, rates, charges, saved loans, reports | **Not collected** | Play counts data as "collected" only when it leaves the device. The calculator runs on the phone and has no server. Tests in `src/lib/ads/__tests__/privacy.test.ts` enforce that ad code cannot import calculator data. |
| Personal info (name, email, PAN, Aadhaar, address) | **Not collected** | The app never asks for these. |
| Financial info (bank account, card, credit score) | **Not collected** | The app never asks for these. |
| Account creation | **No accounts** | |

## 2. What the Google Mobile Ads SDK collects

The app bundles the **Google Mobile Ads SDK `com.google.android.gms:play-services-ads:25.4.0`** and Google's **User Messaging Platform** consent SDK **`com.google.android.ump:user-messaging-platform:4.0.0`**. Both versions are pinned in `android/variables.gradle`, and every run of the **Android APK** workflow prints them in the job summary section "Bundled Google ads SDKs". If you change them, check these answers again.

Google publishes what these SDKs collect, and it can change between versions:

- Mobile Ads SDK: https://developers.google.com/admob/android/privacy/play-data-disclosure
- UMP (consent) SDK: see the User Messaging Platform section of Google's AdMob privacy documentation (https://developers.google.com/admob/android/privacy)

**Before you submit, open those pages and copy their answers for the bundled version.** At the time of writing, Google lists roughly the following for the Mobile Ads SDK. Treat this list as a starting point only, not as the answer:

| Data type (Play category) | Collected | Shared | Purposes |
|---|---|---|---|
| Location → Approximate location (from IP address) | Yes | Yes | Advertising or marketing, Analytics, Fraud prevention, security and compliance |
| App activity → App interactions | Yes | Yes | Advertising or marketing, Analytics, Fraud prevention, security and compliance |
| App info and performance → Diagnostics / crash logs | Yes | Yes | Analytics, Fraud prevention, security and compliance |
| Device or other IDs (advertising ID, app set ID) | Yes | Yes | Advertising or marketing, Analytics, Fraud prevention, security and compliance |

Other answers:

| Question | Draft answer |
|---|---|
| Is data encrypted in transit? | Yes (the Google SDKs use HTTPS). Confirm on Google's page. |
| Is collection required or optional? | Follow Google's page for each data type. Where consent is required (EEA/UK), the app asks through Google's consent form. |
| Can users request deletion? | Answer per Google's guidance for the SDK. Users can reset or delete their advertising ID in Android settings. Loan data is deleted in the app (Privacy → "Clear my saved data") or by uninstalling. |

## 3. Related Play Console declarations

| Declaration | Answer |
|---|---|
| Ads | **Yes, my app contains ads** |
| Advertising ID | **Yes**, used for advertising and analytics by the Google Mobile Ads SDK |
| Target audience | **18 and over** |
| Financial features | The app does not provide or facilitate loans or any other financial service. It is an educational loan-cost calculator. |
| Privacy policy | The deployed `privacy-policy.html` URL (the same URL as the `PRIVACY_POLICY_URL` repository variable) |
| Government / health / news app | No |

When the form is done, tick **data_safety_completed** when you run the Release workflow.
