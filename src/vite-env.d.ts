/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** AdMob banner ad unit for release builds. Unset → Google's test unit. */
  readonly VITE_ADMOB_BANNER_ID?: string
  /** Test builds only: 'EEA' forces the consent form (debug geography). */
  readonly VITE_ADS_DEBUG_GEOGRAPHY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
