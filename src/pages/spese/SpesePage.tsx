// Scheda Spese (mock Fa-23…Fa-26, #34): «Speso in …» con il budget, saldo e persone (o in pari, o da solo),
// la ricevuta in linea con categorie (toccandole si tolgono dai totali), totali, saldi e «Per pareggiare», FAB «+ Spesa».
import { useMemo, useState } from 'react'
import { rimborsiValidi } from '../../lib/rimborsi'
import { useLocation } from 'wouter'
import { daysBetween } from '../../lib/dates'
import { debitiPerSpesa, pianoBilancia, totaliDelViaggio, type PianoBilancia } from '../../lib/debitiSpese'
import { formatMoney, round2 } from '../../lib/money'
import { ricevuta, type Ricevuta as Dati } from '../../lib/ricevuta'
import { budgetDi, budgetTotale } from '../../lib/budgetPersona'
import { useVistaRicevuta } from '../../lib/vistaRicevuta'
import { alGiorno, riassunto } from '../../lib/spese'
import { tripToday } from '../../lib/today'
import { useMe } from '../../state/me'
import { useTrip } from '../../state/trip'
import { Pulsante } from '../../faraway/base'
import { DareRicevere, DueValori, Riepilogo } from '../../faraway/Home'
import { DueRicevute, Ricevuta } from '../../faraway/Ricevuta'
import { Affianca, BarraGrande, Colonna, Schermata } from '../../faraway/shell'
import { SpesaSheet } from './SpesaSheet'
import { BilanciaSheet, RimborsiCard } from './Rimborsi'
import { finoAl, inQuanti, intervallo } from './testi'
import { t as tt } from '../../i18n'

export function SpesePage() {
  const trip = useTrip()
  const me = useMe(trip)
  const [, navigate] = useLocation()
  const [nuova, setNuova] = useState(false)
  const today = tripToday(trip)
  const r = riassunto(trip, me?.id)
  const n = trip.travelers.length
  const dati = useMemo(() => ricevuta(trip, r.spese, r.fx, undefined, me?.id), [trip, r.spese, r.fx, me?.id])
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

  // categorie tolte dai totali della ricevuta (toccandole): vale per tutte e due le ricevute, finché si resta nella pagina
  const [escluse, setEscluse] = useState<ReadonlySet<string>>(() => new Set())
  const escludi = (key: string) =>
    setEscluse((prima) => {
      const ora = new Set(prima)
      if (ora.has(key)) ora.delete(key)
      else ora.add(key)
      return ora
    })
  const quoteMie = useMemo(() => (datiMia ? new Map(datiMia.categorie.map((c) => [c.key, c.spent])) : undefined), [datiMia])
  const ricevutaDi = (d: Dati, mia: boolean) => (
    <Ricevuta
      trip={trip}
      dati={d}
      sub={[trip.destination, intervallo(trip.startDate, trip.endDate), mia ? (me?.name.split(/\s+/)[0] ?? '') : inQuanti(n)].filter(Boolean).join(' · ')}
      escluse={escluse}
      onEscludi={escludi}
      onTutte={() => setEscluse(new Set())}
      quoteMie={quoteMie}
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
