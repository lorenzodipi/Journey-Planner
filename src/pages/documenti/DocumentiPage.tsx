// Documenti (#52): file senza un luogo (eSIM, assicurazione, passaporti, visti…) con la loro visibilità.
// I file di alloggi, voli e trasporti stanno nelle loro pagine; quelli delle prenotazioni nelle tappe: niente doppioni.
import { useState } from 'react'
import { Pillola } from '../../faraway/base'
import { Sv } from '../../faraway/icons'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { useAuth } from '../../lib/auth'
import { chiVede, dimensione, senzaCollegamenti, VIS_LABEL } from '../../lib/documenti'
import { useTrip } from '../../state/trip'
import { DocumentoDettaglio, NuovoDocumentoSheet } from './DocumentoSheet'

export function DocumentiPage() {
  const trip = useTrip()
  const { session } = useAuth()
  const [nuovo, setNuovo] = useState(false)
  const [aperto, setAperto] = useState<string | null>(null)
  const lista = senzaCollegamenti(trip.documents)
  const doc = lista.find((d) => d.id === aperto) ?? (trip.documents ?? []).find((d) => d.id === aperto)
  return (
    <Schermata
      bar={<BarraIndietro title="Documenti" back="/altro" />}
      gap={12}
      fab={trip.documents ? { label: 'Documento', aria: 'Aggiungi un documento', onPress: () => setNuovo(true) } : undefined}
      overlay={
        <>
          {nuovo ? <NuovoDocumentoSheet trip={trip} onClose={() => setNuovo(false)} /> : null}
          {doc ? <DocumentoDettaglio key={doc.id} trip={trip} doc={doc} onClose={() => setAperto(null)} /> : null}
        </>
      }
    >
      {!trip.documents ? (
        <p className="fa-m" style={{ margin: 0 }}>I documenti con visibilità si attivano con la migrazione 0030 del database.</p>
      ) : lista.length === 0 ? (
        <p className="fa-m" style={{ margin: 0 }}>Qui metti ciò che non ha un luogo: eSIM, assicurazione, passaporti, visti. Per ogni file scegli chi lo vede.</p>
      ) : (
        <div className="fa-list">
          {lista.map((d) => (
            <button key={d.id} type="button" className="fa-row" onClick={() => setAperto(d.id)}>
              <Sv name="file" size={28} />
              <span style={{ minWidth: 0 }}>
                <span className="t" style={{ display: 'block' }}>{d.name}</span>
                <span className="s" style={{ display: 'block' }}>
                  {[dimensione(d.size), d.visibility === 'selected' ? chiVede(d, trip.travelers, session?.user.id) : ''].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="end">
                <Pillola tone={d.visibility === 'all' ? 'soft' : 'mut'} icon={d.visibility === 'all' ? undefined : 'lock'}>
                  {VIS_LABEL[d.visibility]}
                </Pillola>
              </span>
            </button>
          ))}
        </div>
      )}
    </Schermata>
  )
}
