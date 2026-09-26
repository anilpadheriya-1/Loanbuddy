# Release checklist: real-phone checks

The emulator checks in the **Android APK** workflow cover:
- online, offline and flaky connections;
- consent (EEA test geography);
- rotation, background, the back button and process restarts;
- banner overlap.

Before each Play Store release, also do these checks **on a real Android phone**. Then tick **consent_tested_on_real_phone** when you run the Release workflow.

> **Never tap your own ads.** Clicking your own real ads breaks AdMob policy and can get the account suspended. Before testing a build with real ad IDs, add your phone as a test device in **AdMob → Settings → Test devices**. You can also do these checks with the `android-latest` debug APK, which only shows Google test ads.

## A. India, online

1. Install the build: the internal-testing track in Play Console, or the release APK artifact.
2. Open the app. A banner appears at the bottom of Home. The page can still be scrolled so the footer text sits fully above the banner.
3. Tap **Check My Loan**. There is no banner on the wizard, and the Next/Back bar is fully visible.
4. Open **Ask Your Lender**. There is no banner, and the live ROI bar is fully visible.
5. Open the example report. The banner is back, and nothing is covered.
6. Open the menu and a dropdown. The banner steps aside while each is open.
7. Tap a text field. The banner goes away while the keyboard is open.

## B. Offline

1. Turn on airplane mode and reopen the app.
2. Everything works: the calculator, the report, Savings Lab, Compare, My Loans, Learn and Ask Your Lender.
3. No banner is shown, and there is no empty space at the bottom.
4. Turn airplane mode off. Within a few seconds a single banner appears (no flicker, no stacking).

## C. Consent (EEA)

1. Connect the phone to a VPN in an EEA country (for example Germany).
2. Clear the app's storage: **Settings → Apps → Loan Reality India → Storage → Clear storage**.
3. Open the app. Google's consent form appears before any ad. Choose **Consent**. The banner appears.
4. Close and reopen the app. The form does not appear again.
5. Go to **Privacy → Ad privacy choices**. The form opens. Choose **Do not consent**. The app keeps working. Ads either stop or stay limited, as Google's consent allows.
6. Turn off the VPN.

## D. Lifecycle

1. Rotate the phone. The banner resizes to the new width and covers nothing.
2. Press Home, then return. You are on the same screen with one banner.
3. Use the Android back button across screens. The banner shows or hides to match each screen.

## E. Store listing matches the app

- The screenshots in `store/screenshots` match the current app.
- The privacy policy URL opens and describes ads.
- `app-ads.txt` is live at the website root.
