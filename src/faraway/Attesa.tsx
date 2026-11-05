// Barra d'attesa in cima alla schermata: compare quando una modifica aspetta il server (archiviare, eliminare,
// invitare…), così l'app non sembra ferma. Appare solo dopo 150ms, per non lampeggiare sulle risposte veloci.
import { useState } from 'react'
import { useTrips } from '../state/trip'
import { cx } from './cx'

export function BarraAttesa() {
  const { inCorso } = useTrips()
  return (
    <>
      <div className={cx('fa-attesa', inCorso && 'on')} aria-hidden="true">
        <i />
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {inCorso ? 'Salvataggio in corso' : ''}
      </span>
    </>
  )
}

/** Ricorda quale azione è in corso (es. l'id del viaggio che si sta archiviando) per mostrare il caricamento sul suo pulsante. */
export function useInCorso() {
  const [chiave, setChiave] = useState<string | null>(null)
  async function fai<T>(k: string, job: () => Promise<T>): Promise<T> {
    setChiave(k)
    try {
      return await job()
    } finally {
      setChiave(null)
    }
  }
  return [chiave, fai] as const
}
