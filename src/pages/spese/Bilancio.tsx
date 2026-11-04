// «Il mio bilancio» (#51): quanto devo dare o ricevere e la cronologia dei miei rimborsi (solo io e l'altra persona).
import { useState } from 'react'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { Pulsante } from '../../faraway/base'
import { bozzaRettifica, cronologia, partiCronologia, STATO_RIMBORSO } from '../../lib/rimborsi'
import { formatMoney } from '../../lib/money'
import { ricevuta } from '../../lib/ricevuta'
import { riassunto } from '../../lib/spese'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { DebitiSpesa } from './DebitiSpesa'
import { Sv } from '../../faraway/icons'
import { DichiaraSheet, RimborsiCard } from './Rimborsi'

export function Bilancio() {
  const trip = useTrip()
  const t = useTrips()
  const me = useMe(trip)
  const r = riassunto(trip, me?.id)
  const dati = ricevuta(trip, r.spese, r.fx)
  const cur = trip.baseCurrency
  const lista = cronologia(trip.settlements).filter((x) => x.fromId === me?.id || x.toId === me?.id)
  const [correggi, setCorreggi] = useState<ReturnType<typeof bozzaRettifica> | null>(null)
  const saldo = r.mioSaldo
  async function annulla(id: string) {
    const m = await t.cancelSettlement(id)
    showToast(m ?? 'Richiesta annullata')
  }
  return (
    <Schermata
      bar={<BarraIndietro title="Il mio bilancio" back="/spese" />}
      gap={16}
      overlay={correggi ? <DichiaraSheet trip={trip} toId={correggi.toId} dovuto={correggi.amount} corrects={correggi.corrects} onClose={() => setCorreggi(null)} /> : null}
    >
      {saldo !== null && Math.abs(saldo) < 0.005 ? null : (
        <p style={{ margin: 0, font: '600 20px/1.3 var(--font-sans)' }}>
          {saldo === null ? 'Collega il tuo account a un viaggiatore per vedere il bilancio.' : saldo > 0 ? `Devi ricevere ${formatMoney(saldo, cur)}` : `Devi dare ${formatMoney(-saldo, cur)}`}
        </p>
      )}
      <RimborsiCard trip={trip} conMie={false} />
      <DebitiSpesa trip={trip} spese={r.spese} fx={r.fx} me={me?.id} abilitaPagamento={trip.settlements !== undefined} />
      {dati.transfers.filter((x) => x.from === me?.id || x.to === me?.id).length === 0 && saldo !== null ? <p className="fa-m" style={{ margin: 0 }}>Nessun rimborso necessario.</p> : null}
      <h2 style={{ margin: '8px 0 0', font: '600 16px/1.3 var(--font-sans)' }}>Cronologia dei rimborsi</h2>
      {trip.settlements === undefined ? (
        <p className="fa-m" style={{ margin: 0 }}>I rimborsi si attivano con la migrazione 0029 del database.</p>
      ) : lista.length === 0 ? (
        <p className="fa-m" style={{ margin: 0 }}>Ancora nessun rimborso. Quando dichiari di aver pagato qualcuno, lo trovi qui con il suo stato.</p>
      ) : (
        <div className="fa-list">
          {lista.map((x) => {
            const p = partiCronologia(x, trip.travelers, me?.id)
            const azione =
              x.status === 'in_attesa' && x.fromId === me?.id ? (
                <Pulsante size="sm" color="link-color" onPress={() => void annulla(x.id)}>
                  Annulla
                </Pulsante>
              ) : x.status === 'confermato' && !x.corrects ? (
                <Pulsante size="sm" color="link-color" onPress={() => setCorreggi(bozzaRettifica(x))}>
                  Rettifica
                </Pulsante>
              ) : null
            return (
            <div key={x.id} className="fa-cron">
              <span className={`st ${x.status}`} role="img" aria-label={STATO_RIMBORSO[x.status]}>
                <Sv name={x.status === 'confermato' ? 'check' : x.status === 'in_attesa' ? 'clock' : 'close'} size={22} />
              </span>
              <span className="tx">
                <span className="t">{p.chi}</span>
                <span className="s">{p.data}</span>
              </span>
              <span className="rt">
                <span className="amt">{p.importo}</span>
                {azione}
              </span>
            </div>
            )
          })}
        </div>
      )}
    </Schermata>
  )
}
