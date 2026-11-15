// Pagina Voli (mock Fa-38, Fa-39, Fa-57, #36): carte raggruppate in Andata, Ritorno e voli interni, aperte una alla volta, FAB «+ Volo».
import { conDipendenze, dipendenze } from '../../lib/registro'
import { useMemo, useState } from 'react'
import { raggruppaVoli } from '../../lib/voli'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { CartaVolo } from '../../faraway/CartaVolo'
import { useConferma } from '../../faraway/Foglio'
import { useUnaAperta } from '../../faraway/Righe'
import { Affianca, BarraIndietro, Schermata } from '../../faraway/shell'
import { Vuoto } from '../../faraway/Stati'
import type { Flight } from '../../types'
import { codiciDi } from '../../lib/codici'
import { CodiceBiglietto } from '../../faraway/CodiceBiglietto'
import { VoloSheet } from './VoloSheet'
import { soloLettura } from '../../lib/ruolo'
import { t as tt } from '../../i18n'

export function VoliPage() {
  const trip = useTrip()
  const t = useTrips()
  const [ask, confirmNode] = useConferma()
  const open = useUnaAperta()
  const [sheet, setSheet] = useState<{ flight?: Flight } | null>(null)
  const [codice, setCodice] = useState<Flight | null>(null)
  const gruppi = useMemo(() => raggruppaVoli(trip.flights, trip), [trip])
  const lettura = soloLettura(trip)

  async function elimina(f: Flight) {
    const ok = await ask({ title: tt('Eliminare il volo?'), message: conDipendenze(tt('{title} sparisce dai voli e dalle spese. Puoi annullare subito dopo.', { title: f.title }), dipendenze(trip, 'volo', f.id)), confirm: tt('Elimina il volo'), cancel: tt('Tieni il volo'), destructive: true })
    if (!ok) return
    const m = await t.setFlightDeleted(f.id, true)
    showToast(m ?? tt('Volo eliminato'), m ? undefined : { label: tt('Annulla'), run: () => void t.setFlightDeleted(f.id, false) })
  }

  return (
    <Schermata
      bar={<BarraIndietro title={tt('Voli')} back="/altro" />}
      fab={gruppi.length === 0 || lettura ? null : { label: tt('Volo'), aria: tt('Aggiungi un volo'), onPress: () => setSheet({}) }}
      overlay={
        <>
          {sheet ? <VoloSheet key={sheet.flight?.id ?? 'new'} trip={trip} flight={sheet.flight} open onClose={() => setSheet(null)} /> : null}
          {codice ? <CodiceBiglietto key={codice.id} trip={trip} kind="flight" refId={codice.id} title={`${codice.title}${codice.legs[0] ? ` · ${codice.legs[0].from} → ${codice.legs[codice.legs.length - 1].to}` : ''}`} detail={codice.bookingRef} travelerIds={codice.forTravelers} open onClose={() => setCodice(null)} /> : null}
          {confirmNode}
        </>
      }
    >
      {gruppi.length === 0 ? (
        lettura ? (
          <Vuoto title={tt('Nessun volo')} text={tt('I voli del viaggio compariranno qui, con gli scali.')} />
        ) : (
          <Vuoto title={tt('Nessun volo')} text={tt('Aggiungi i voli del viaggio: li trovi qui come carte d\'imbarco, con gli scali.')} action={tt('Aggiungi un volo')} onAction={() => setSheet({})} />
        )
      ) : null}
      <Affianca uguali>
        {/* pieghevole aperto: i gruppi di voli in due colonne */}
          {gruppi.map((g) => (
          <section key={g.key} aria-label={g.title} className="fa-gruppo">
            <div className="fa-sech">
              <h2 className="fa-h3">{g.title}</h2>
            </div>
            {g.flights.map((f) => (
              <CartaVolo key={f.id} trip={trip} flight={f} open={open.isOpen(f.id)} onToggle={() => open.toggle(f.id)} lettura={lettura} onEdit={() => setSheet({ flight: f })} onCode={codiciDi(trip, 'flight', f.id).length > 0 ? () => setCodice(f) : undefined} onDelete={() => void elimina(f)} />
            ))}
          </section>
        ))}
      </Affianca>
    </Schermata>
  )
}
