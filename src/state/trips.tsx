import { createContext } from 'preact'
import type { ComponentChildren } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { demoTrip } from '../demo/demoTrip'
import { useAuth } from '../lib/auth'
import { clearSnapshot, loadActiveId, loadSnapshot, saveActiveId, saveSnapshot } from '../lib/cache'
import { between } from '../lib/position'
import * as api from '../lib/tripApi'
import type { TravelerInput, TripInput } from '../lib/tripApi'
import type { Trip } from '../types'

export type TripsStatus = 'loading' | 'ready' | 'error'

/** Ogni azione restituisce `null` se è andata bene, altrimenti il messaggio d'errore da mostrare. */
type Result = Promise<string | null>

interface TripsValue {
  status: TripsStatus
  trips: Trip[]
  active: Trip | null
  /** true se i dati mostrati vengono dalla copia locale (offline o rete assente) */
  stale: boolean
  error: string | null
  setActive: (id: string) => void
  refresh: () => Promise<void>
  createTrip: (input: TripInput, travelers: TravelerInput[]) => Result
  updateTrip: (id: string, input: TripInput) => Result
  deleteTrip: (id: string) => Result
  updateDay: (id: string, patch: { city: string; title: string; notes: string }) => Result
  addTraveler: (tripId: string, input: TravelerInput) => Result
  updateTraveler: (id: string, input: TravelerInput) => Result
  removeTraveler: (id: string) => Result
  addMember: (tripId: string, email: string, role: 'editor' | 'viewer') => Result
}

const DEMO_MESSAGE = 'Anteprima demo: collega Supabase per salvare le modifiche.'
const demoResult: Result = Promise.resolve(DEMO_MESSAGE)

const TripsContext = createContext<TripsValue | null>(null)

export function TripProvider({ children }: { children: ComponentChildren }) {
  const auth = useAuth()
  const demo = auth.status === 'demo'
  const signedIn = auth.status === 'signed-in'

  const [trips, setTrips] = useState<Trip[]>(demo ? [demoTrip] : [])
  const [status, setStatus] = useState<TripsStatus>(demo ? 'ready' : 'loading')
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(demo ? demoTrip.id : loadActiveId())
  const hasData = useRef(false)

  const refresh = useCallback(async () => {
    if (demo) return
    try {
      const fresh = await api.fetchTrips()
      hasData.current = true
      setTrips(fresh)
      setStale(false)
      setError(null)
      setStatus('ready')
      saveSnapshot(fresh)
    } catch (e) {
      // Offline o errore: se ho una copia locale la mostro, altrimenti segnalo l'errore.
      if (hasData.current) {
        setStale(true)
      } else {
        setError(api.describeError(e))
        setStatus('error')
      }
    }
  }, [demo])

  useEffect(() => {
    if (demo) return
    if (!signedIn) {
      if (auth.status === 'signed-out') {
        // niente dati di un utente rimasti sul dispositivo dopo l'uscita
        clearSnapshot()
        hasData.current = false
        setTrips([])
        setActiveId(null)
        setStatus('loading')
      }
      return
    }
    const snapshot = loadSnapshot()
    if (snapshot) {
      hasData.current = true
      setTrips(snapshot.trips)
      setStale(true)
      setStatus('ready')
    }
    void refresh()
  }, [demo, signedIn, auth.status, refresh])

  // Tornando online ricarico i dati
  useEffect(() => {
    if (demo || !signedIn) return
    const onOnline = () => void refresh()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [demo, signedIn, refresh])

  const active = useMemo(() => trips.find((t) => t.id === activeId) ?? trips[0] ?? null, [trips, activeId])

  const setActive = useCallback((id: string) => {
    setActiveId(id)
    saveActiveId(id)
  }, [])

  /** Esegue una scrittura, poi ricarica i dati. */
  const run = useCallback(
    async (job: () => Promise<unknown>): Result => {
      if (demo) return DEMO_MESSAGE
      try {
        // tetto di attesa anche prima della richiesta di rete (es. blocco della sessione)
        let timer: ReturnType<typeof setTimeout> | undefined
        const giveUp = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), 25_000)
        })
        try {
          await Promise.race([job(), giveUp])
        } finally {
          clearTimeout(timer)
        }
      } catch (e) {
        console.error('[journey] operazione fallita', e)
        return api.describeError(e)
      }
      await refresh()
      return null
    },
    [demo, refresh],
  )

  const value: TripsValue = {
    status,
    trips,
    active,
    stale,
    error,
    setActive,
    refresh,
    createTrip: (input, travelers) =>
      run(async () => {
        const id = await api.createTrip(input, travelers)
        setActive(id)
      }),
    updateTrip: (id, input) => run(() => api.updateTrip(id, input)),
    deleteTrip: (id) => run(() => api.deleteTrip(id)),
    updateDay: (id, patch) => run(() => api.updateDay(id, patch)),
    addTraveler: (tripId, input) => {
      const current = trips.find((t) => t.id === tripId)
      const last = Math.max(0, ...(current?.travelers ?? []).map((t) => t.position ?? 0))
      return run(() => api.addTraveler(tripId, input, between(last, null))) // dopo l'ultimo
    },
    updateTraveler: (id, input) => run(() => api.updateTraveler(id, input)),
    removeTraveler: (id) => run(() => api.removeTraveler(id)),
    addMember: (tripId, email, role) => run(() => api.addMember(tripId, email, role)),
  }
  if (demo) {
    value.createTrip = () => demoResult
    value.updateTrip = () => demoResult
  }

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
}

export function useTrips(): TripsValue {
  const ctx = useContext(TripsContext)
  if (!ctx) throw new Error('useTrips va usato dentro TripProvider')
  return ctx
}

/** Viaggio attivo. L'App garantisce che esista prima di mostrare le pagine. */
export function useTrip(): Trip {
  const { active } = useTrips()
  return active as Trip
}
