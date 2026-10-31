import { useEffect, useState } from 'react'
import { loadSnapshot } from '../lib/cache'
import { ora } from '../lib/formati'

/** Connessione del dispositivo (per i banner «Sei offline»). */
export function useOnline(): boolean {
  const [on, setOn] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const up = () => setOn(true)
    const down = () => setOn(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return on
}

/** Ora dell'ultima copia dei dati salvata sul telefono («Aggiornato alle 12:40»). */
export function savedAtText(): string | null {
  const s = loadSnapshot()
  if (!s?.savedAt) return null
  return ora(new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(s.savedAt)))
}
