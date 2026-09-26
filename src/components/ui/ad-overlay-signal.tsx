import { useEffect } from 'react'
import { reportOverlay } from '@/lib/ads/signals'

/** Rendered inside dialogs, dropdowns and popovers: hides the Android banner while open. */
export function AdOverlaySignal() {
  useEffect(() => {
    reportOverlay(true)
    return () => reportOverlay(false)
  }, [])
  return null
}
