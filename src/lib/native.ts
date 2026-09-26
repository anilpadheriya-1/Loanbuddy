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

/**
 * Android back button (app only): close an open menu, dialog or dropdown
 * first, then go back through the app's screens; on the first screen, send the
 * app to the background like other Android apps.
 */
export function initBackButton(): void {
  if (!isNativeApp()) return
  void import('@capacitor/app').then(({ App }) =>
    App.addListener('backButton', ({ canGoBack }) => {
      const overlay = document.querySelector('[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper]')
      if (overlay) {
        // Radix closes dialogs, menus and dropdowns on Escape.
        ;(document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        return
      }
      if (canGoBack) window.history.back()
      else void App.minimizeApp()
    }),
  )
}
