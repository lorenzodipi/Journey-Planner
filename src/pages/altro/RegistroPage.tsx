// Registro delle modifiche (#60, COL-003): chi ha cambiato cosa e quando, dal più recente. Non mostra dati privati.
import { useMemo } from 'react'
import { quandoModifica, rigaRegistro } from '../../lib/registro'
import { useMe } from '../../state/me'
import { useTrip } from '../../state/trip'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { Vuoto } from '../../faraway/Stati'

export function RegistroPage() {
  const trip = useTrip()
  const me = useMe(trip)
  const righe = useMemo(() => [...(trip.activity ?? [])].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200), [trip.activity])
  return (
    <Schermata bar={<BarraIndietro title="Registro modifiche" back="/altro" />} gap={12}>
      {!trip.activity ? (
        <p className="fa-m" style={{ margin: 0 }}>Il registro si attiva con la migrazione 0037 del database.</p>
      ) : righe.length === 0 ? (
        <Vuoto title="Ancora nessuna modifica" text="Qui compaiono chi aggiunge, cambia o elimina luoghi, tappe, alloggi, prenotazioni e spese." />
      ) : (
        <div className="fa-list">
          {righe.map((a) => (
            <div key={a.id} className="fa-row" style={{ cursor: 'default' }}>
              <span style={{ minWidth: 0 }}>
                <span className="t" style={{ display: 'block' }}>{rigaRegistro(trip, a, me?.userId)}</span>
                <span className="s" style={{ display: 'block' }}>{quandoModifica(a.at, new Date(), trip.timezone)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Schermata>
  )
}
