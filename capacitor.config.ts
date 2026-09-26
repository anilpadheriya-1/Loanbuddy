import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Android app wrapper. The app is the same web build (dist/) running offline
 * inside the WebView — no server, no tracking, data stays on the phone.
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
