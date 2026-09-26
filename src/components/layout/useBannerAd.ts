import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { setAdRoute, startAds } from '@/lib/ads'

/** Starts the Android banner ads once and tells them which screen is showing. */
export function useBannerAd() {
  const { pathname } = useLocation()
  useEffect(() => {
    setAdRoute(pathname)
  }, [pathname])
  useEffect(() => {
    startAds()
  }, [])
}
