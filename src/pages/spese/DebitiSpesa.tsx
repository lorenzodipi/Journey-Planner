// «Da dare» e «Da ricevere» spesa per spesa (#51): una card per ogni spesa in cui devo dare o ricevere dei soldi,
// con l'importo tra me e l'altra persona e lo stato. Le azioni (Ho pagato, Rispondi, Annulla, Rettifica) stanno
// nel menu a tre puntini a destra dell'importo.
import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { MenuAzioni, Pillola } from '../../faraway/base'
import { bozzaRettifica } from '../../lib/rimborsi'
import { puoModificareSpesa } from '../../lib/ripartizione'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Rimborso } from '../../types'
import { debitiPerSpesa, type DebitoSpesa } from '../../lib/debitiSpese'
import { formatMoney, round2 } from '../../lib/money'
import { iconaSpesa } from '../../lib/ricevuta'
import { dataNumerica } from '../../lib/rimborsi'
import type { SpesaVista } from '../../lib/spese'
import { Ic } from '../../ui/Sprite'
import type { FxContext } from '../../lib/budget'
import type { Trip } from '../../types'
import { DecidiSheet, DichiaraSheet } from './Rimborsi'
import { SpesaSheet } from './SpesaSheet'
import { sorgente, testoVerso } from './testi'
import { Affianca } from '../../faraway/shell'


function Stato({ d }: { d: DebitoSpesa }) {
  if (d.stato === 'pagato') return <Pillola tone="acq" icon="check">Pagato</Pillola>
  if (d.stato === 'in_attesa') return <Pillola tone="soft" icon="clock">{d.verso === 'devo' ? 'In attesa' : 'Da confermare'}</Pillola>
  return <Pillola tone={d.verso === 'devo' ? 'cor' : 'mut'}>{d.verso === 'devo' ? 'Da pagare' : 'Da ricevere'}</Pillola>
}

export function DebitiSpesa({ trip, spese, fx, me, abilitaPagamento }: { trip: Trip; spese: readonly SpesaVista[]; fx: FxContext; me: string | undefined; abilitaPagamento: boolean }) {
  const cur = trip.baseCurrency
  const t = useTrips()
  const io = useMe(trip)
  const [, navigate] = useLocation()
  const [modifica, setModifica] = useState<DebitoSpesa['expense'] | null>(null)
  const [paga, setPaga] = useState<DebitoSpesa | null>(null)
  const [rispondi, setRispondi] = useState<Rimborso | null>(null)
  const [correggi, setCorreggi] = useState<ReturnType<typeof bozzaRettifica> | null>(null)
  const rimborso = (id: string) => trip.settlements?.find((x) => x.id === id)
  async function annulla(id: string) {
    const m = await t.cancelSettlement(id)
    showToast(m ?? 'Richiesta annullata')
  }
  /** Le azioni possibili su una card, secondo chi deve a chi e lo stato dei rimborsi che la coprono. */
  function azioni(d: DebitoSpesa) {
    const out: { id: string; label: string; onPress: () => void }[] = []
    const piu = (n: number, base: string, amount: number) => (n > 1 ? `${base} di ${formatMoney(amount, cur)}` : base)
    const daDichiarare = round2(d.residuo - d.inAttesa)
    if (d.verso === 'devo') {
      if (abilitaPagamento && daDichiarare > 0.004) out.push({ id: 'paga', label: 'Ho pagato', onPress: () => setPaga({ ...d, residuo: daDichiarare }) })
      for (const c of d.richieste) out.push({ id: `annulla:${c.id}`, label: piu(d.richieste.length, 'Annulla la richiesta', c.amount), onPress: () => void annulla(c.id) })
    } else {
      for (const c of d.richieste) {
        const r = rimborso(c.id)
        if (r) out.push({ id: `rispondi:${c.id}`, label: piu(d.richieste.length, 'Rispondi', c.amount), onPress: () => setRispondi(r) })
      }
      for (const c of d.confermati) {
        const r = rimborso(c.id)
        if (r) out.push({ id: `rettifica:${c.id}`, label: piu(d.confermati.length, 'Rettifica', c.amount), onPress: () => setCorreggi(bozzaRettifica(r)) })
      }
    }
    // la spesa si modifica da qui come dal Dettaglio: quelle nate da un'altra voce si aprono là, le altre solo se sono mie
    const vista = spese.find((x) => x.id === d.expenseId)
    const src = vista ? sorgente(vista, trip) : null
    if (vista?.derived && src) out.push({ id: 'modifica', label: src.label, onPress: () => navigate(src.href) })
    else if (!vista?.derived && puoModificareSpesa(d.expense, io?.userId, io?.id)) out.push({ id: 'modifica', label: 'Modifica', onPress: () => setModifica(d.expense) })
    return out
  }
  const righe = useMemo(() => debitiPerSpesa(spese, trip.travelers, fx, me, trip.settled, trip.settlements), [spese, trip.travelers, fx, me, trip.settled, trip.settlements])
  const nome = (id: string) => trip.travelers.find((t) => t.id === id)?.name.split(/\s+/)[0] ?? '—'
  const sezioni: { verso: DebitoSpesa['verso']; titolo: string }[] = [
    { verso: 'devo', titolo: 'Da dare' },
    { verso: 'devono', titolo: 'Da ricevere' },
  ]
  return (
    <>
      <Affianca>
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
                      <span className="s">{testoVerso(d, nome(d.otherId))}</span>
                      <span className="s">{dataNumerica(d.expense.spentAt)}</span>
                    </span>
                    <span className="rt">
                      <span className="ln">
                        <span className="amt">{formatMoney(d.stato === 'pagato' ? d.importo : d.residuo, cur)}</span>
                        {(() => {
                          const a = azioni(d)
                          // senza azioni resta lo spazio, così gli importi restano allineati
                          return a.length > 0 ? <MenuAzioni label={`Azioni su ${d.expense.label}`} azioni={a} /> : <span className="fa-dots-vuoto" aria-hidden="true" />
                        })()}
                      </span>
                      <Stato d={d} />
                    </span>
                  </div>
                  {d.eccedenza > 0 ? (
                    <span className="fa-m">
                      {verso === 'devo' ? `Hai dato ${formatMoney(d.eccedenza, cur)} in più.` : `${nome(d.otherId)} ti ha dato ${formatMoney(d.eccedenza, cur)} in più: puoi rettificare dal menu.`}
                    </span>
                  ) : null}
                  {d.stato === 'da_pagare' && d.pagato > 0 ? (
                    <span className="fa-m">
                      Già dati {formatMoney(d.pagato, cur)} su {formatMoney(d.importo, cur)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )
      })}
      </Affianca>
      {modifica ? <SpesaSheet key={modifica.id} trip={trip} expense={modifica} open onClose={() => setModifica(null)} /> : null}
      {paga ? <DichiaraSheet trip={trip} toId={paga.otherId} dovuto={paga.residuo} expenseId={paga.expenseId} onClose={() => setPaga(null)} /> : null}
      {rispondi ? <DecidiSheet trip={trip} r={rispondi} onClose={() => setRispondi(null)} /> : null}
      {correggi ? <DichiaraSheet trip={trip} toId={correggi.toId} dovuto={correggi.amount} corrects={correggi.corrects} onClose={() => setCorreggi(null)} /> : null}
    </>
  )
}
