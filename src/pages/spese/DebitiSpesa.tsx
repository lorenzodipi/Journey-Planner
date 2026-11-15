// «Da dare» e «Da ricevere» spesa per spesa (#51): una card per ogni spesa in cui devo dare o ricevere dei soldi,
// con l'importo tra me e l'altra persona e lo stato. Le azioni (Ho pagato, Rispondi, Annulla, Rettifica) stanno
// nel menu a tre puntini a destra dell'importo.
import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { MenuAzioni, Pillola } from '../../faraway/base'
import { filtraBilancio, FILTRI_VUOTI, ORDINE_BASE, ordinaBilancio, type FiltriBilancio as TipoFiltri, type Ordine } from '../../lib/filtriBilancio'
import { FiltriBilancio } from './FiltriBilancio'
import { VuotoFiltro } from '../../faraway/Stati'
import { puoModificareSpesa } from '../../lib/ripartizione'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Rimborso } from '../../types'
import { debitiPerSpesa, type DebitoSpesa } from '../../lib/debitiSpese'
import { formatMoney, round2 } from '../../lib/money'
import { iconaSpesa } from '../../lib/ricevuta'
import { dataNumerica, rimborsiValidi } from '../../lib/rimborsi'
import type { SpesaVista } from '../../lib/spese'
import { Ic } from '../../ui/Sprite'
import { useConferma } from '../../faraway/Foglio'
import type { FxContext } from '../../lib/budget'
import type { Trip } from '../../types'
import { DecidiSheet, DichiaraSheet } from './Rimborsi'
import { SpesaSheet } from './SpesaSheet'
import { sorgente, testoVerso } from './testi'
import { Affianca, InTesta } from '../../faraway/shell'
import { t as tt } from '../../i18n'


function Stato({ d }: { d: DebitoSpesa }) {
  if (d.stato === 'contestato') return <Pillola tone="cor">{tt('Contestato')}</Pillola>
  if (d.stato === 'pagato') return <Pillola tone="acq" icon="check">{tt('Pagato')}</Pillola>
  if (d.stato === 'in_attesa') return <Pillola tone="soft" icon="clock">{d.verso === 'devo' ? tt('In attesa') : tt('Da confermare')}</Pillola>
  return <Pillola tone={d.verso === 'devo' ? 'cor' : 'mut'}>{d.verso === 'devo' ? tt('Da pagare') : tt('Da ricevere')}</Pillola>
}

export function DebitiSpesa({ trip, spese, fx, me, abilitaPagamento }: { trip: Trip; spese: readonly SpesaVista[]; fx: FxContext; me: string | undefined; abilitaPagamento: boolean }) {
  const cur = trip.baseCurrency
  const t = useTrips()
  const nome = useCallback((id: string) => trip.travelers.find((x) => x.id === id)?.name.split(/\s+/)[0] ?? '—', [trip.travelers])
  const io = useMe(trip)
  const [, navigate] = useLocation()
  const [modifica, setModifica] = useState<DebitoSpesa['expense'] | null>(null)
  const [paga, setPaga] = useState<DebitoSpesa | null>(null)
  const [rispondi, setRispondi] = useState<Rimborso | null>(null)
  const [filtri, setFiltri] = useState<TipoFiltri>(FILTRI_VUOTI)
  const [ordine, setOrdine] = useState<Ordine>(ORDINE_BASE)
  const [ask, confirmNode] = useConferma()
  const rimborso = (id: string) => trip.settlements?.find((x) => x.id === id)
  async function annulla(id: string) {
    const m = await t.cancelSettlement(id)
    showToast(m ?? tt('Richiesta annullata'))
  }
  /** Reclamo: il pagamento smette di contare e la voce torna aperta (vale per tutta la «Bilancia» se è di gruppo). */
  async function reclamo(r: Rimborso) {
    const ok = await ask({
      title: tt('Fare reclamo?'),
      message: tt('{v0} non contano più nei saldi e le voci tornano da pagare. {v1} lo vede come contestato.', { v0: r.groupId ? tt('I pagamenti e le compensazioni registrati insieme') : tt('Il pagamento di {v0}', { v0: formatMoney(r.amount, r.currency) }), v1: nome(r.fromId === io?.id ? r.toId : r.fromId) }),
      confirm: tt('Fai reclamo'),
      cancel: tt('Lascia com\'è'),
      destructive: true,
    })
    if (!ok) return
    const m = await t.disputeSettlement(r.id)
    showToast(m ?? tt('Reclamo fatto: la voce è tornata aperta'))
  }
  /** Ritiro un pagamento che ho registrato io (anche tutta la «Bilancia»). */
  async function ritira(r: Rimborso) {
    const m = await t.cancelSettlement(r.id)
    showToast(m ?? tt('Pagamento annullato'))
  }
  /** Le azioni possibili su una card, secondo chi deve a chi e lo stato dei rimborsi che la coprono. */
  function azioni(d: DebitoSpesa) {
    const out: { id: string; label: string; onPress: () => void }[] = []
    const piu = (n: number, base: string, amount: number) => (n > 1 ? tt('{base} di {v1}', { base, v1: formatMoney(amount, cur) }) : base)
    const daDichiarare = round2(d.residuo - d.inAttesa)
    if (d.verso === 'devo') {
      if (abilitaPagamento && daDichiarare > 0.004) out.push({ id: 'paga', label: tt('Ho pagato'), onPress: () => setPaga({ ...d, residuo: daDichiarare }) })
      for (const c of d.richieste) out.push({ id: `annulla:${c.id}`, label: piu(d.richieste.length, tt('Annulla la richiesta'), c.amount), onPress: () => void annulla(c.id) })
    } else {
      for (const c of d.richieste) {
        const r = rimborso(c.id)
        if (r) out.push({ id: `rispondi:${c.id}`, label: piu(d.richieste.length, tt('Rispondi'), c.amount), onPress: () => setRispondi(r) })
      }
    }
    // pagamenti già validi che coprono la card: li ritira chi li ha registrati, li contesta l'altra persona
    for (const c of d.confermati) {
      const r = rimborso(c.id)
      if (!r || r.status !== 'confermato') continue
      if (io?.userId && r.createdBy === io.userId) out.push({ id: `ritira:${c.id}`, label: piu(d.confermati.length, r.groupId ? tt('Annulla la bilancia') : tt('Annulla il pagamento'), c.amount), onPress: () => void ritira(r) })
      else if (r.toId === io?.id || (r.groupId && r.fromId === io?.id)) out.push({ id: `reclamo:${c.id}`, label: piu(d.confermati.length, r.compensation ? tt('Reclamo sulla compensazione') : tt('Reclamo'), c.amount), onPress: () => void reclamo(r) })
    }
    // la spesa si modifica da qui come dal Dettaglio: quelle nate da un'altra voce si aprono là, le altre solo se sono mie
    const vista = spese.find((x) => x.id === d.expenseId)
    const src = vista ? sorgente(vista, trip) : null
    if (vista?.derived && src) out.push({ id: 'modifica', label: src.label, onPress: () => navigate(src.href) })
    else if (!vista?.derived && puoModificareSpesa(d.expense, io?.userId, io?.id)) out.push({ id: 'modifica', label: tt('Modifica'), onPress: () => setModifica(d.expense) })
    return out
  }
  const validi = rimborsiValidi(trip)
  const tutte = useMemo(() => debitiPerSpesa(spese, trip.travelers, fx, me, validi.settled, validi.settlements), [spese, trip.travelers, fx, me, validi.settled, validi.settlements])
  const righe = useMemo(() => ordinaBilancio(filtraBilancio(tutte, filtri), ordine, nome), [tutte, filtri, ordine, nome])
  const filtrate = righe.length !== tutte.length
  const sezioni: { verso: DebitoSpesa['verso']; titolo: string }[] = [
    { verso: 'devo', titolo: tt('Da dare') },
    { verso: 'devono', titolo: tt('Da ricevere') },
  ]
  return (
    <>
      {/* i filtri stanno nella testa della pagina, con il titolo */}
      <InTesta>
        <FiltriBilancio righe={tutte} nome={nome} cur={cur} filtri={filtri} onFiltri={setFiltri} ordine={ordine} onOrdine={setOrdine} mostrate={righe.length} />
      </InTesta>
      {filtrate && righe.length === 0 ? (
        <VuotoFiltro title={tt('Nessuna voce trovata')} text={tt('Prova con altri filtri.')} action={tt('Azzera i filtri')} onAction={() => (setFiltri(FILTRI_VUOTI), setOrdine(ORDINE_BASE))} />
      ) : null}
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
            {filtrate ? <p className="fa-m" style={{ margin: 0 }}>{tt('Solo le voci filtrate.')}</p> : null}
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
                          return a.length > 0 ? <MenuAzioni label={tt('Azioni su {label}', { label: d.expense.label })} azioni={a} /> : <span className="fa-dots-vuoto" aria-hidden="true" />
                        })()}
                      </span>
                      <Stato d={d} />
                    </span>
                  </div>
                  {d.eccedenza > 0 ? (
                    <span className="fa-m">
                      {verso === 'devo' ? tt('Hai dato {v0} in più.', { v0: formatMoney(d.eccedenza, cur) }) : tt('{v0} ti ha dato {v1} in più: se non torna, fai un reclamo dal menu.', { v0: nome(d.otherId), v1: formatMoney(d.eccedenza, cur) })}
                    </span>
                  ) : null}
                  {d.stato === 'da_pagare' && d.pagato > 0 ? (
                    <span className="fa-m">
                      {tt('Già dati {v0} su {v1}', { v0: formatMoney(d.pagato, cur), v1: formatMoney(d.importo, cur) })}
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
      {confirmNode}
    </>
  )
}
