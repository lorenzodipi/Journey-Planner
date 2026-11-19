// Scheda Spese (mock Fa-23…Fa-26, #34): «Speso in …» con il budget, saldo e persone (o in pari, o da solo),
// la ricevuta in linea con categorie (previsto modificabile), totali, saldi e «Per pareggiare», FAB «+ Spesa».
import { useMemo, useState } from 'react'
import { rimborsiValidi } from '../../lib/rimborsi'
import { useLocation } from 'wouter'
import { daysBetween } from '../../lib/dates'
import { debitiPerSpesa, pianoBilancia, totaliDelViaggio, type PianoBilancia } from '../../lib/debitiSpese'
import { formatMoney, round2 } from '../../lib/money'
import { ricevuta, type Ricevuta as Dati, type RigaCategoria } from '../../lib/ricevuta'
import { budgetDi, budgetTotale } from '../../lib/budgetPersona'
import { useVistaRicevuta } from '../../lib/vistaRicevuta'
import { alGiorno, riassunto } from '../../lib/spese'
import { tripToday } from '../../lib/today'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { Pulsante } from '../../faraway/base'
import { useConferma } from '../../faraway/Foglio'
import { DareRicevere, DueValori, Riepilogo } from '../../faraway/Home'
import { DueRicevute, Ricevuta } from '../../faraway/Ricevuta'
import { Affianca, BarraGrande, Colonna, Schermata } from '../../faraway/shell'
import { SpesaSheet } from './SpesaSheet'
import { BilanciaSheet, RimborsiCard } from './Rimborsi'
import { finoAl, inQuanti, intervallo } from './testi'
import { t as tt } from '../../i18n'

export function SpesePage() {
  const trip = useTrip()
  const t = useTrips()
  const me = useMe(trip)
  const [, navigate] = useLocation()
  const [nuova, setNuova] = useState(false)
  const [ask, confirmNode] = useConferma()
  const today = tripToday(trip)
  const r = riassunto(trip, me?.id)
  const n = trip.travelers.length
  const dati = useMemo(() => ricevuta(trip, r.spese, r.fx), [trip, r.spese, r.fx])
  // in gruppo, la ricevuta con solo la mia parte: la card del budget segue quella che si guarda
  const due = n > 1 && !!me?.id
  const datiMia = useMemo(() => (due && me?.id ? ricevuta(trip, r.spese, r.fx, me.id) : null), [due, trip, r.spese, r.fx, me?.id])
  const [vistaScelta, setVista] = useVistaRicevuta(trip.id)
  const vista = datiMia ? vistaScelta : 'tutti'
  const totale = budgetTotale(trip)
  const card =
    vista === 'mia' && datiMia
      ? { speso: datiMia.pagato, limit: budgetDi(trip, me?.id), nota: undefined }
      : { speso: r.speso, limit: totale.importo, nota: totale.persone !== undefined && totale.viaggiatori !== undefined && totale.persone < totale.viaggiatori ? tt('{v0} su {v1}', { v0: totale.persone === 1 ? tt('1 persona') : tt('{n} persone', { n: totale.persone }), v1: totale.viaggiatori }) : undefined }
  const cur = trip.baseCurrency
  const bilancio = useMemo(() => totaliDelViaggio(trip, r.spese, r.fx, me?.id), [trip, r.spese, r.fx, me?.id])
  /** «Bilancia tutte le spese»: per ogni persona con cui c'è qualcosa da chiudere, cosa succederebbe (serve la migrazione 0029: senza, niente rimborsi) */
  const piani = useMemo(() => {
    const m = new Map<string, PianoBilancia>()
    if (!me?.id || trip.settlements === undefined) return m
    const v = rimborsiValidi(trip)
    const righe = debitiPerSpesa(r.spese, trip.travelers, r.fx, me.id, v.settled, v.settlements)
    for (const id of new Set(righe.map((d) => d.otherId))) {
      const p = pianoBilancia(righe, me.id, id)
      if (p) m.set(id, p)
    }
    return m
  }, [trip, r.spese, r.fx, me?.id])
  const [bilancia, setBilancia] = useState<string | null>(null)

  const giorno = alGiorno(r.speso, trip, today)
  const left = daysBetween(today < trip.startDate ? trip.startDate : today, trip.endDate) + 1
  const second = r.solo ? (
    <DueValori
      a={{ l: tt('Al giorno'), v: formatMoney(giorno.perDay, cur), c: tt('in {days} {v1}', { days: giorno.days, v1: giorno.days === 1 ? tt('giorno') : tt('giorni') }) }}
      b={
        r.limit
          ? { l: tt('Ancora da spendere'), v: formatMoney(Math.max(0, round2(r.limit - r.speso)), cur), c: finoAl(trip.endDate) }
          : { l: tt('Giorni rimasti'), v: String(Math.max(0, left)), c: finoAl(trip.endDate) }
      }
    />
  ) : (
    <DareRicevere bilancio={bilancio} currency={cur} />
  )

  async function onPlanned(c: RigaCategoria, planned: number | null) {
    const m = await t.setExpenseCategoryPlanned(trip.id, c.label, planned)
    if (!m) showToast(planned === null ? tt('Previsto di {label} calcolato dai costi', { label: c.label }) : tt('Previsto di {label}: {v1}', { label: c.label, v1: formatMoney(planned, cur) }))
    return m
  }
  async function onRename(c: RigaCategoria, label: string) {
    return c.id ? t.renameExpenseCategory(trip.id, c.id, label) : null
  }
  async function onDelete(c: RigaCategoria) {
    if (!c.id) return
    if (c.nSpese > 0) {
      // una categoria in uso non si elimina: si archivia (resta sulle spese già fatte, non si propone più)
      const archivia = await ask({
        title: tt('«{label}» è usata da {nSpese} {v2}', { label: c.label, nSpese: c.nSpese, v2: c.nSpese === 1 ? tt('spesa') : tt('spese') }),
        message: tt('Non si può eliminare finché è in uso. Spostale prima in un’altra categoria, oppure archivia questa: resta sulle spese già fatte ma non si propone più.'),
        confirm: tt('Archivia la categoria'),
        cancel: tt('Lascia stare'),
        destructive: false,
      })
      if (!archivia) return
      const m = await t.setExpenseCategoryArchived(c.id, true)
      showToast(m ?? tt('Categoria archiviata'), m ? undefined : { label: tt('Annulla'), run: () => void t.setExpenseCategoryArchived(c.id as string, false) })
      return
    }
    // niente spese ma costi previsti (voci di budget): passano in «Altro», poi la categoria si elimina
    const previsti = trip.budget.filter((b) => b.categoryId === c.id)
    if (previsti.length > 0) {
      const nomi = previsti.map((b) => `«${b.label}»`).join(', ')
      const sposta = await ask({
        title: tt('Eliminare «{label}»?', { label: c.label }),
        message: tt('Non ha spese, ma ha {v0}: {nomi}. {v2} nella categoria «Altro», così il previsto totale non cambia.', { v0: previsti.length === 1 ? tt('un costo previsto') : tt('{length} costi previsti', { length: previsti.length }), nomi, v2: previsti.length === 1 ? tt('Passa') : tt('Passano') }),
        confirm: tt('Sposta ed elimina'),
        cancel: tt('Tieni la categoria'),
        destructive: true,
      })
      if (!sposta) return
      const m = await t.deleteExpenseCategoryMovingBudget(trip.id, c.id)
      showToast(m ?? tt('Categoria eliminata, {v0} in «Altro»', { v0: previsti.length === 1 ? tt('il costo previsto è') : tt('i costi previsti sono') }))
      return
    }
    const ok = await ask({
      title: tt('Eliminare «{label}»?', { label: c.label }),
      message: tt('Non ha spese: sparisce dalla ricevuta.'),
      confirm: tt('Elimina la categoria'),
      cancel: tt('Tieni la categoria'),
      destructive: true,
    })
    if (!ok) return
    const m = await t.setExpenseCategoryDeleted(c.id, true)
    showToast(m ?? tt('Categoria eliminata'), m ? undefined : { label: tt('Annulla'), run: () => void t.setExpenseCategoryDeleted(c.id as string, false) })
  }

  const ricevutaDi = (d: Dati, mia: boolean) => (
    <Ricevuta
      trip={trip}
      dati={d}
      sub={[trip.destination, intervallo(trip.startDate, trip.endDate), mia ? (me?.name.split(/\s+/)[0] ?? '') : inQuanti(n)].filter(Boolean).join(' · ')}
      onPlanned={onPlanned}
      onRename={onRename}
      onDelete={onDelete}
      bilancia={me?.id ? { me: me.id, con: new Set(piani.keys()), onPress: setBilancia } : undefined}
      io={me?.id}
      mia={mia}
    />
  )

  return (
    <Schermata
      bar={<BarraGrande title={tt('Spese')} sub={[trip.destination, n > 1 ? tt('{n} persone', { n }) : ''].filter(Boolean).join(' · ')} />}
      gap={16}
      fisso
      fab={{ label: tt('Spesa'), aria: tt('Aggiungi una spesa'), onPress: () => setNuova(true) }}
      overlay={
        <>
          {nuova ? <SpesaSheet trip={trip} open onClose={() => setNuova(false)} /> : null}
          {bilancia && piani.get(bilancia) ? <BilanciaSheet trip={trip} piano={piani.get(bilancia) as PianoBilancia} onClose={() => setBilancia(null)} /> : null}
          {confirmNode}
        </>
      }
    >
      {/* pieghevole aperto: riepilogo, saldi e collegamenti a sinistra, la ricevuta a destra */}
      <Affianca>
        <Colonna lato="sinistra">
          <Riepilogo dove={trip.destination} speso={card.speso} currency={cur} limit={card.limit} nota={card.nota} onSetBudget={() => navigate('/spese/budget')} onOpenBudget={() => navigate('/spese/budget')} second={second} />
          <RimborsiCard trip={trip} />
        </Colonna>
        <Colonna lato="destra" alta>
          {datiMia ? (
            <DueRicevute
              vista={vista}
              onVista={setVista}
              tutti={ricevutaDi(dati, false)}
              mia={ricevutaDi(datiMia, true)}
            />
          ) : (
            ricevutaDi(dati, false)
          )}
        </Colonna>
        <Colonna lato="sinistra">
          <Pulsante color="secondary" iconTrailing="chevr" onPress={() => navigate('/spese/dettaglio')}>
            {tt('Vedi il dettaglio delle spese')}
          </Pulsante>
          {n > 1 ? (
            <Pulsante color="tertiary" iconTrailing="chevr" onPress={() => navigate('/spese/bilancio')}>
              {tt('Il mio bilancio e i rimborsi')}
            </Pulsante>
          ) : null}
        </Colonna>
      </Affianca>
    </Schermata>
  )
}
