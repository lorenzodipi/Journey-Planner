// «Il mio bilancio» (#51): quanto devo dare o ricevere, spesa per spesa. Le azioni sui rimborsi (Ho pagato, Rispondi,
// Annulla, Rettifica) stanno nel menu a tre puntini di ogni card: non c'è più una cronologia a parte.
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { ricevuta } from '../../lib/ricevuta'
import { riassunto } from '../../lib/spese'
import { useMe } from '../../state/me'
import { useTrip } from '../../state/trip'
import { DebitiSpesa } from './DebitiSpesa'
import { RimborsiCard } from './Rimborsi'
import { t } from '../../i18n'

export function Bilancio() {
  const trip = useTrip()
  const me = useMe(trip)
  const r = riassunto(trip, me?.id)
  const dati = ricevuta(trip, r.spese, r.fx)
  const saldo = r.mioSaldo
  return (
    <Schermata bar={<BarraIndietro title={t('Il mio bilancio')} back="/spese" />} gap={16}>
      <RimborsiCard trip={trip} conMie={false} novitaAperte />
      <DebitiSpesa trip={trip} spese={r.spese} fx={r.fx} me={me?.id} abilitaPagamento={trip.settlements !== undefined} />
      {dati.transfers.filter((x) => x.from === me?.id || x.to === me?.id).length === 0 && saldo !== null ? <p className="fa-m" style={{ margin: 0 }}>{t('Nessun rimborso necessario.')}</p> : null}
    </Schermata>
  )
}
