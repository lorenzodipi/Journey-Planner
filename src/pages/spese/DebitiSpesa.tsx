// «Da dare» e «Da ricevere» spesa per spesa (#51): una card per ogni spesa in cui devo dare o ricevere dei soldi,
// con l'importo tra me e l'altra persona, lo stato (da pagare, in attesa di conferma, pagato) e «Ho pagato».
import { useMemo, useState } from 'react'
import { Pillola, Pulsante } from '../../faraway/base'
import { debitiPerSpesa, type DebitoSpesa } from '../../lib/debitiSpese'
import { formatMoney, round2 } from '../../lib/money'
import { iconaSpesa } from '../../lib/ricevuta'
import { dataNumerica } from '../../lib/rimborsi'
import type { SpesaVista } from '../../lib/spese'
import { Ic } from '../../ui/Sprite'
import type { FxContext } from '../../lib/budget'
import type { Trip } from '../../types'
import { DichiaraSheet } from './Rimborsi'


function Stato({ d }: { d: DebitoSpesa }) {
  if (d.stato === 'pagato') return <Pillola tone="acq" icon="check">Pagato</Pillola>
  if (d.stato === 'in_attesa') return <Pillola tone="soft" icon="clock">{d.verso === 'devo' ? 'In attesa' : 'Da confermare'}</Pillola>
  return <Pillola tone={d.verso === 'devo' ? 'cor' : 'mut'}>{d.verso === 'devo' ? 'Da pagare' : 'Da ricevere'}</Pillola>
}

export function DebitiSpesa({ trip, spese, fx, me, abilitaPagamento }: { trip: Trip; spese: readonly SpesaVista[]; fx: FxContext; me: string | undefined; abilitaPagamento: boolean }) {
  const cur = trip.baseCurrency
  const [paga, setPaga] = useState<DebitoSpesa | null>(null)
  const righe = useMemo(() => debitiPerSpesa(spese, trip.travelers, fx, me, trip.settled, trip.settlements), [spese, trip.travelers, fx, me, trip.settled, trip.settlements])
  const nome = (id: string) => trip.travelers.find((t) => t.id === id)?.name.split(/\s+/)[0] ?? '—'
  const sezioni: { verso: DebitoSpesa['verso']; titolo: string }[] = [
    { verso: 'devo', titolo: 'Da dare' },
    { verso: 'devono', titolo: 'Da ricevere' },
  ]
  return (
    <>
      {sezioni.map(({ verso, titolo }) => {
        const list = righe.filter((d) => d.verso === verso)
        if (list.length === 0) return null
        const totale = round2(list.reduce((n, d) => n + d.residuo, 0))
        return (
          <section key={verso} aria-label={titolo} style={{ display: 'grid', gap: 8 }}>
            <div className="fa-sech">
              <h2 className="fa-h3">{titolo}</h2>
              {totale > 0 ? <span className="fa-c">{formatMoney(totale, cur)}</span> : null}
            </div>
            <div className="fa-list">
              {list.map((d) => (
                <div key={`${d.expenseId}:${d.otherId}`} className="fa-dbt">
                  <div className="top">
                    <Ic name={iconaSpesa(d.expense)} size={44} />
                    <span style={{ minWidth: 0 }}>
                      <span className="t">{d.expense.label}</span>
                      <span className="s">
                        {verso === 'devo' ? `Da dare a ${nome(d.otherId)}` : `Da ricevere da ${nome(d.otherId)}`} · {dataNumerica(d.expense.spentAt)}
                      </span>
                    </span>
                    <span className="rt">
                      <span className="amt">{formatMoney(d.stato === 'pagato' ? d.importo : d.residuo, cur)}</span>
                      <Stato d={d} />
                    </span>
                  </div>
                  {d.stato === 'da_pagare' && d.pagato > 0 ? (
                    <span className="fa-m">
                      Già dati {formatMoney(d.pagato, cur)} su {formatMoney(d.importo, cur)}
                    </span>
                  ) : null}
                  {verso === 'devo' && d.stato === 'da_pagare' && abilitaPagamento ? (
                    <Pulsante size="sm" color="secondary-soft" onPress={() => setPaga(d)}>
                      Ho pagato
                    </Pulsante>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )
      })}
      {paga ? <DichiaraSheet trip={trip} toId={paga.otherId} dovuto={paga.residuo} onClose={() => setPaga(null)} /> : null}
    </>
  )
}
