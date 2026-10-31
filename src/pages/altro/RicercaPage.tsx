// Ricerca in tutto il viaggio (#63, SET-008): un campo, risultati raggruppati con link.
import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { cercaNelViaggio } from '../../lib/ricerca'
import { useTrip } from '../../state/trip'
import { Campo } from '../../faraway/base'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { Riga } from '../../faraway/Righe'
import { Vuoto } from '../../faraway/Stati'

export function RicercaPage() {
  const trip = useTrip()
  const [, navigate] = useLocation()
  const [q, setQ] = useState('')
  const risultati = useMemo(() => cercaNelViaggio(trip, q), [trip, q])
  const gruppi = [...new Set(risultati.map((r) => r.gruppo))]
  return (
    <Schermata bar={<BarraIndietro title="Cerca nel viaggio" back="/altro" />} gap={12}>
      <Campo label="Cerca" hideLabel icon="search" type="search" value={q} onChange={setQ} placeholder="Luoghi, tappe, prenotazioni, alloggi, trasporti" autoFocus enterKeyHint="search" />
      {q.trim().length >= 2 && risultati.length === 0 ? <Vuoto title="Nessun risultato" text="Prova con un’altra parola o con il nome di una città." /> : null}
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
    </Schermata>
  )
}
