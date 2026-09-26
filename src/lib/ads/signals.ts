/**
 * Tells the Android ad controller that a dialog, menu or dropdown is open, so
 * the native banner (which draws above the web page) never covers it.
 * Plugin-free, and a no-op outside the Android build.
 */
export const OVERLAY_EVENT = 'lri:ads-overlay'

export function reportOverlay(open: boolean): void {
  if (import.meta.env.MODE !== 'android' && import.meta.env.MODE !== 'test') return
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<boolean>(OVERLAY_EVENT, { detail: open }))
}
