import { useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { setupPullToRefresh } from '../lib/pullToRefresh'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trips'

/** Attiva «trascina verso il basso per aggiornare» su tutte le pagine. Non disegna nulla da sé. */
export function PullToRefresh() {
  const t = useTrips()
  const auth = useAuth()
  // il gesto si imposta una volta sola: usa sempre i valori più recenti tramite questo riferimento
  const latest = useRef({ refresh: t.refresh, demo: auth.status === 'demo' })
  latest.current = { refresh: t.refresh, demo: auth.status === 'demo' }

  useEffect(
    () =>
      setupPullToRefresh(async () => {
        const { refresh, demo } = latest.current
        if (demo) return showToast('Anteprima demo: niente da aggiornare', undefined, 2500)
        if (!navigator.onLine) return showToast('Sei offline: non posso aggiornare.', undefined, 2500)
        showToast((await refresh()) ? 'Aggiornato' : 'Non riesco ad aggiornare: riprova tra poco.', undefined, 2500)
      }),
    [],
  )
  return null
}
