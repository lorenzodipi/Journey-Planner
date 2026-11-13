// Ricerca in tutto il viaggio (#63, SET-008): risultati raggruppati con link. Il campo sta in alto nella pagina Altro
// (icona di ricerca nell'intestazione); qui c'è solo l'elenco dei risultati.
import { useMemo } from 'react'
import { useLocation } from 'wouter'
import { cercaNelViaggio } from '../../lib/ricerca'
import { paginaPermessa } from '../../lib/ruolo'
import type { Trip } from '../../types'
import { Riga } from '../../faraway/Righe'
import { Vuoto } from '../../faraway/Stati'

/** Risultati della ricerca nel viaggio per `q` (da 2 caratteri in su). */
export function RisultatiRicerca({ trip, q }: { trip: Trip; q: string }) {
  const [, navigate] = useLocation()
  // il visualizzatore non apre Luoghi e Prenotazioni: niente risultati che portano lì
  const risultati = useMemo(() => cercaNelViaggio(trip, q).filter((r) => paginaPermessa(r.to, trip)), [trip, q])
  const gruppi = [...new Set(risultati.map((r) => r.gruppo))]
  if (q.trim().length >= 2 && risultati.length === 0) return <Vuoto title="Nessun risultato" text="Prova con un’altra parola o con il nome di una città." />
  return (
    <>
      {gruppi.map((g) => (
        <section key={g} aria-label={g} style={{ display: 'grid', gap: 8 }}>
          <h2 className="fa-h3" style={{ margin: 0 }}>{g}</h2>
          <div className="fa-list">
            {risultati.filter((r) => r.gruppo === g).map((r) => (
              <Riga key={r.id} title={r.titolo} sub={r.sotto} chevron onPress={() => navigate(r.to)} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
