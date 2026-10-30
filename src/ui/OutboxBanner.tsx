import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useTrips } from '../state/trip'

const bar = 'obar'

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

/**
 * «Invio di N modifiche…»: compare solo se l'invio dura più di un attimo e sta sopra la pagina senza spostarla.
 * Come striscia nel flusso della pagina, a ogni tocco (es. una spunta nella checklist) spingeva giù tutto il
 * contenuto per il tempo dell'invio e poi lo faceva risalire: lo «scatto» che si vedeva.
 */
function SendingPill({ count }: { count: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (count === 0) return setVisible(false)
    const timer = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(timer)
  }, [count > 0])
  if (!visible || count === 0) return null
  return (
    <p
      className="sending"
      style={{ top: 'calc(0.5rem + env(safe-area-inset-top))' }}
    >
      Invio di {count} {count === 1 ? 'modifica' : 'modifiche'}…
    </p>
  )
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
        <div className={`${bar} bad`} style={top}>
          <span className="obar-t">
            Non salvata: {f.label}. {f.error}
          </span>
          <button type="button" onClick={() => dismissFailed(f.id)} className="obar-b">
            Scarta
          </button>
        </div>
      ))}
      {stale || !online ? (
        <p className={bar} style={top}>
          {pending > 0
            ? `Offline · ${pending} ${pending === 1 ? 'modifica partirà' : 'modifiche partiranno'} quando torna la rete`
            : 'Offline · spese, checklist e tappe si salvano sul telefono; le altre modifiche richiedono la rete'}
        </p>
      ) : (
        <SendingPill count={pending} />
      )}
    </div>
  )
}
