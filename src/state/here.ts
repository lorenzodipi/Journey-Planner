// Posizione attuale, solo se il permesso è GIÀ stato dato (nessuna richiesta: la tappa attuale si stima
// dagli orari, FRD HOME-009/BR-59). Serve per «8 min a piedi da qui».
import { useEffect, useState } from 'react'

export function useHere(): { lat: number; lng: number } | null {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    let watch: number | null = null
    let alive = true
    try {
      void navigator.permissions
        ?.query({ name: 'geolocation' as PermissionName })
        .then((p) => {
          if (!alive || p.state !== 'granted' || !navigator.geolocation) return
          watch = navigator.geolocation.watchPosition(
            (g) => setPos({ lat: g.coords.latitude, lng: g.coords.longitude }),
            () => undefined,
            { maximumAge: 60000, timeout: 20000 },
          )
        })
        .catch(() => undefined)
    } catch {
      // nessuna posizione
    }
    return () => {
      alive = false
      if (watch !== null) navigator.geolocation.clearWatch(watch)
    }
  }, [])
  return pos
}
