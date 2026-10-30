// Pagina Trasporti (mock Fa-40, Fa-41, #37): biglietti orizzontali raggruppati per data, aperti in linea uno alla volta, FAB «+ Trasporto».
import { useMemo, useState } from 'react'
import { nomeTrasporto, perData } from '../../lib/trasporti'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import type { Transport } from '../../types'
import { CartaTrasporto } from '../../faraway/CartaTrasporto'
import { useConferma } from '../../faraway/Foglio'
import { useUnaAperta } from '../../faraway/Righe'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { Vuoto } from '../../faraway/Stati'
import { CodiceBiglietto } from '../../faraway/CodiceBiglietto'
import { TrasportoSheet } from './TrasportoSheet'

export function TrasportiPage() {
  const trip = useTrip()
  const t = useTrips()
  const [ask, confirmNode] = useConferma()
  const open = useUnaAperta()
  const [sheet, setSheet] = useState<{ transport?: Transport; focus?: 'prezzo' } | null>(null)
  const [codice, setCodice] = useState<Transport | null>(null)
  const gruppi = useMemo(() => perData(trip), [trip])

  async function elimina(x: Transport) {
    const ok = await ask({ title: 'Eliminare il trasporto?', message: `${x.from} → ${x.to} sparisce dai trasporti e dalle spese. Puoi annullare subito dopo.`, confirm: 'Elimina il trasporto', cancel: 'Tieni il trasporto', destructive: true })
    if (!ok) return
    const m = await t.setTransportDeleted(x.id, true)
    showToast(m ?? 'Trasporto eliminato', m ? undefined : { label: 'Annulla', run: () => void t.setTransportDeleted(x.id, false) })
  }

  return (
    <Schermata
      bar={<BarraIndietro title="Trasporti" back="/altro" />}
      fab={gruppi.length === 0 ? null : { label: 'Trasporto', aria: 'Aggiungi un trasporto', onPress: () => setSheet({}) }}
      overlay={
        <>
          {sheet ? <TrasportoSheet key={sheet.transport?.id ?? 'new'} trip={trip} transport={sheet.transport} focus={sheet.focus} open onClose={() => setSheet(null)} /> : null}
          {codice ? <CodiceBiglietto key={codice.id} trip={trip} kind="transport" refId={codice.id} title={`${nomeTrasporto(codice)}${codice.title ? ` · ${codice.from} → ${codice.to}` : ''}`} detail={codice.refCode} travelerIds={codice.forTravelers} open onClose={() => setCodice(null)} /> : null}
          {confirmNode}
        </>
      }
    >
      {gruppi.length === 0 ? (
        <Vuoto title="Nessun trasporto" text="Treni, autobus, metro e taxi: orari, prezzo e se è già pagato." action="Aggiungi un trasporto" onAction={() => setSheet({})} />
      ) : null}
      {gruppi.map((g) => (
        <section key={g.key} aria-label={g.title} style={{ display: 'grid', gap: 12 }}>
          <div className="fa-sech">
            <h2 className="fa-h3">{g.title}</h2>
          </div>
          {g.items.map((x) => (
            <CartaTrasporto key={x.id} trip={trip} transport={x} open={open.isOpen(x.id)} onToggle={() => open.toggle(x.id)} onEdit={(focus) => setSheet({ transport: x, focus })} onDelete={() => void elimina(x)} onCode={() => setCodice(x)} />
          ))}
        </section>
      ))}
    </Schermata>
  )
}
