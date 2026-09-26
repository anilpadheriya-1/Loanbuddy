import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'

/**
 * Small helpers for the Android app build (Capacitor). On the website these
 * fall back to the browser APIs, so the same code runs in both places.
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Share plain text: Android share sheet in the app, Web Share API or clipboard on the web. */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  try {
    if (isNativeApp()) {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, dialogTitle: title })
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share({ title, text })
      return 'shared'
    }
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'cancelled'
  }
}

/** Match the Android status/navigation bar icons to the app theme. */
export function syncSystemBars(theme: 'light' | 'dark'): void {
  if (!isNativeApp()) return
  SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}
