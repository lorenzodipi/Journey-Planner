import { useEffect, useState } from 'preact/hooks'
import { useAuth } from '../lib/auth'
import { useTrips } from '../state/trip'

const bar = 'px-4 py-2 text-center text-xs font-extrabold'

function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** Stato della rete e delle modifiche in attesa: una sola striscia in alto, sempre comprensibile. */
export function OutboxBanner() {
  const auth = useAuth()
  const { stale, pending, failed, dismissFailed } = useTrips()
  const online = useOnline()
  if (auth.status !== 'signed-in') return null

  const top = { paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }
  return (
    <div role="status">
      {failed.map((f) => (
        <div class={`${bar} flex items-center justify-between gap-3 bg-danger/10 text-danger`} style={top}>
          <span class="min-w-0 flex-1 text-left">
            Non salvata: {f.label}. {f.error}
          </span>
          <button type="button" onClick={() => dismissFailed(f.id)} class="min-h-11 shrink-0 rounded-full px-3 font-extrabold underline">
            Scarta
          </button>
        </div>
      ))}
      {stale || !online ? (
        <p class={`${bar} bg-accent-soft text-pale`} style={top}>
          {pending > 0
            ? `Offline · ${pending} ${pending === 1 ? 'modifica partirà' : 'modifiche partiranno'} quando torna la rete`
            : 'Offline · spese, checklist e tappe si salvano sul telefono; le altre modifiche richiedono la rete'}
        </p>
      ) : pending > 0 ? (
        <p class={`${bar} bg-accent-soft text-pale`} style={top}>
          Invio di {pending} {pending === 1 ? 'modifica' : 'modifiche'}…
        </p>
      ) : null}
    </div>
  )
}
