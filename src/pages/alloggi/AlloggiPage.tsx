// Pagina Alloggi (mock Fa-37, #39): biglietti lavanda raggruppati per città con le notti, aperti in linea uno alla volta, FAB «+ Alloggio».
import { conDipendenze, dipendenze } from '../../lib/registro'
import { useMemo, useState } from 'react'
import { notti, perCitta } from '../../lib/alloggi'
import { overlappingStays, stayFuoriViaggio } from '../../lib/stays'
import { AvvisoNotti } from '../../faraway/AvvisoNotti'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import type { Stay } from '../../types'
import { Banner } from '../../faraway/base'
import { CartaAlloggio } from '../../faraway/CartaAlloggio'
import { useConferma } from '../../faraway/Foglio'
import { useUnaAperta } from '../../faraway/Righe'
import { Affianca, BarraIndietro, Schermata } from '../../faraway/shell'
import { Vuoto } from '../../faraway/Stati'
import { AlloggioSheet } from './AlloggioSheet'
import { soloLettura } from '../../lib/ruolo'
import { elenco, t as tt } from '../../i18n'

export function AlloggiPage() {
  const trip = useTrip()
  const t = useTrips()
  const [ask, confirmNode] = useConferma()
  const open = useUnaAperta()
  const [sheet, setSheet] = useState<{ stay?: Stay } | null>(null)
  const gruppi = useMemo(() => perCitta(trip.stays), [trip.stays])
  const fuori = stayFuoriViaggio(trip)
  const overlaps = overlappingStays(trip.stays)
  const lettura = soloLettura(trip)

  async function elimina(s: Stay) {
    const ok = await ask({ title: tt('Eliminare l’alloggio?'), message: conDipendenze(tt('{name} sparisce dagli alloggi e dalle spese. Puoi annullare subito dopo.', { name: s.name }), dipendenze(trip, 'alloggio', s.id)), confirm: tt('Elimina l’alloggio'), cancel: tt('Tieni l’alloggio'), destructive: true })
    if (!ok) return
    const m = await t.setStayDeleted(s.id, true)
    showToast(m ?? tt('Alloggio eliminato'), m ? undefined : { label: tt('Annulla'), run: () => void t.setStayDeleted(s.id, false) })
  }

  return (
    <Schermata
      bar={<BarraIndietro title={tt('Alloggi')} back="/altro" />}
      fab={gruppi.length === 0 || lettura ? null : { label: tt('Alloggio'), aria: tt('Aggiungi un alloggio'), onPress: () => setSheet({}) }}
      overlay={
        <>
          {sheet ? <AlloggioSheet key={sheet.stay?.id ?? 'new'} trip={trip} stay={sheet.stay} open onClose={() => setSheet(null)} /> : null}
          {confirmNode}
        </>
      }
    >
      {gruppi.length > 0 && !lettura ? <AvvisoNotti trip={trip} /> : null}
      {fuori.length > 0 && !lettura ? (
        <Banner tone="ac" icon="warn" title={tt('Date fuori dal viaggio')}>
          {fuori.map((x) => x.name).join(', ')}.
        </Banner>
      ) : null}
      {overlaps.length > 0 && !lettura ? (
        <Banner tone="cor" icon="warn" title={tt('Alloggi che si sovrappongono')}>
          {overlaps.map(([a, b]) => elenco([trip.stays[a].name, trip.stays[b].name])).join('; ')}.
        </Banner>
      ) : null}
      {gruppi.length === 0 ? (
        lettura ? (
          <Vuoto title={tt('Nessun alloggio')} text={tt('Gli alloggi del viaggio compariranno qui.')} />
        ) : (
          <Vuoto title={tt('Nessun alloggio')} text={tt('Hotel e case con date, orari di check-in, camera e codice di prenotazione.')} action={tt('Aggiungi un alloggio')} onAction={() => setSheet({})} />
        )
      ) : null}
      <Affianca uguali>
        {/* pieghevole aperto: le città in due colonne */}
          {gruppi.map((g) => (
          <section key={g.city} aria-label={g.city} className="fa-gruppo">
            <div className="fa-sech">
              <h2 className="fa-h3">
                {g.city} · {notti(g.nights)}
              </h2>
            </div>
            {g.stays.map((s) => (
              <CartaAlloggio key={s.id} trip={trip} stay={s} open={open.isOpen(s.id)} onToggle={() => open.toggle(s.id)} lettura={lettura} onEdit={() => setSheet({ stay: s })} onDelete={() => void elimina(s)} />
            ))}
          </section>
        ))}
      </Affianca>
    </Schermata>
  )
}
