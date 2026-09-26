import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Android app wrapper. The app is the same web build (dist/, built with
 * `--mode android`) running from inside the APK: no remote web content, and
 * calculations and loan data stay on the phone. The only network use is the
 * Google AdMob banner (src/lib/ads), which never receives loan data.
 * Change appId BEFORE the first Play Store upload; it cannot change afterwards.
 */
const config: CapacitorConfig = {
  appId: 'com.loanrealityindia.app',
  appName: 'Loan Reality India',
  webDir: 'dist',
  android: {
    backgroundColor: '#f6f8fb',
  },
}

export default config
