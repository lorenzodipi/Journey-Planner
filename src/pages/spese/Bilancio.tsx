// «Il mio bilancio» (#51): quanto devo dare o ricevere e la cronologia dei miei rimborsi (solo io e l'altra persona).
import { useState } from 'react'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { Pulsante } from '../../faraway/base'
import { bozzaRettifica, cronologia, testoCronologia } from '../../lib/rimborsi'
import { formatMoney } from '../../lib/money'
import { ricevuta } from '../../lib/ricevuta'
import { riassunto } from '../../lib/spese'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { DichiaraSheet, RimborsiCard, StatoPillola } from './Rimborsi'

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
      gap={15}
      overlay={correggi ? <DichiaraSheet trip={trip} toId={correggi.toId} dovuto={correggi.amount} corrects={correggi.corrects} onClose={() => setCorreggi(null)} /> : null}
    >
      <p style={{ margin: 0, font: '600 20px/1.3 var(--font-sans)' }}>
        {saldo === null ? 'Collega il tuo account a un viaggiatore per vedere il bilancio.' : Math.abs(saldo) < 0.005 ? 'Sei in pari' : saldo > 0 ? `Devi ricevere ${formatMoney(saldo, cur)}` : `Devi dare ${formatMoney(-saldo, cur)}`}
      </p>
      <RimborsiCard trip={trip} />
      {dati.transfers.filter((x) => x.from === me?.id || x.to === me?.id).length === 0 && saldo !== null ? <p className="fa-m" style={{ margin: 0 }}>Nessun rimborso necessario.</p> : null}
      <h2 style={{ margin: '8px 0 0', font: '600 16px/1.3 var(--font-sans)' }}>Cronologia dei rimborsi</h2>
      {trip.settlements === undefined ? (
        <p className="fa-m" style={{ margin: 0 }}>I rimborsi si attivano con la migrazione 0029 del database.</p>
      ) : lista.length === 0 ? (
        <p className="fa-m" style={{ margin: 0 }}>Ancora nessun rimborso. Quando dichiari di aver pagato qualcuno, lo trovi qui con il suo stato.</p>
      ) : (
        <div className="fa-list">
          {lista.map((x) => (
            <div key={x.id} className="fa-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}>
              <span className="t">{testoCronologia(x, trip.travelers, me?.id)}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatoPillola stato={x.status} />
                {x.status === 'in_attesa' && x.fromId === me?.id ? (
                  <Pulsante size="sm" color="link-color" onPress={() => void annulla(x.id)}>
                    Annulla
                  </Pulsante>
                ) : null}
                {x.status === 'confermato' && !x.corrects ? (
                  <Pulsante size="sm" color="link-color" onPress={() => setCorreggi(bozzaRettifica(x))}>
                    Rettifica
                  </Pulsante>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      )}
    </Schermata>
  )
}
