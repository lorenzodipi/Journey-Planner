// Scheda Spese (mock Fa-23…Fa-26, #34): «Speso in …» con il budget, saldo e persone (o in pari, o da solo),
// la ricevuta in linea con categorie (previsto modificabile), totali, saldi e «Per pareggiare», FAB «+ Spesa».
import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { loadSnapshot } from '../../lib/cache'
import { daysBetween } from '../../lib/dates'
import { formatMoney, round2 } from '../../lib/money'
import { ricevuta, type RigaCategoria } from '../../lib/ricevuta'
import { alGiorno, riassunto } from '../../lib/spese'
import { tripToday } from '../../lib/today'
import { discOf, useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { Pulsante } from '../../faraway/base'
import { useConferma } from '../../faraway/Foglio'
import { DueValori, Riepilogo, SaldoPersone } from '../../faraway/Home'
import { Ricevuta } from '../../faraway/Ricevuta'
import { BarraGrande, Schermata } from '../../faraway/shell'
import { SpesaSheet } from './SpesaSheet'
import { DichiaraSheet, RimborsiCard } from './Rimborsi'
import { finoAl, inQuanti, intervallo } from './testi'

/** «Aggiornato oggi alle 18:20» (ultima copia dei dati sul telefono). */
export function aggiornatoText(now = new Date()): string | null {
  const at = loadSnapshot()?.savedAt
  if (!at) return null
  const d = new Date(at)
  const hm = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
  const same = d.toDateString() === now.toDateString()
  return same ? `Aggiornato oggi alle ${hm}` : `Aggiornato il ${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(d).replace(/\./g, '')} alle ${hm}`
}

export function SpesePage() {
  const trip = useTrip()
  const t = useTrips()
  const me = useMe(trip)
  const [, navigate] = useLocation()
  const [nuova, setNuova] = useState(false)
  const [paga, setPaga] = useState<{ to: string; amount: number } | null>(null)
  const [ask, confirmNode] = useConferma()
  const today = tripToday(trip)
  const r = riassunto(trip, me?.id)
  const dati = useMemo(() => ricevuta(trip, r.spese, r.fx), [trip, r.spese, r.fx])
  const cur = trip.baseCurrency
  const n = trip.travelers.length
  const people = trip.travelers.map((p) => ({ name: p.name, n: discOf(trip, p.id) }))

  const giorno = alGiorno(r.speso, trip, today)
  const left = daysBetween(today < trip.startDate ? trip.startDate : today, trip.endDate) + 1
  const second = r.solo ? (
    <DueValori
      a={{ l: 'Al giorno', v: formatMoney(giorno.perDay, cur), c: `in ${giorno.days} ${giorno.days === 1 ? 'giorno' : 'giorni'}` }}
      b={
        r.limit
          ? { l: 'Ancora da spendere', v: formatMoney(Math.max(0, round2(r.limit - r.speso)), cur), c: finoAl(trip.endDate) }
          : { l: 'Giorni rimasti', v: String(Math.max(0, left)), c: finoAl(trip.endDate) }
      }
    />
  ) : (
    <SaldoPersone saldo={r.mioSaldo} currency={cur} people={people} inPari={dati.transfers.length === 0} />
  )

  async function onPlanned(c: RigaCategoria, planned: number | null) {
    const m = await t.setExpenseCategoryPlanned(trip.id, c.label, planned)
    if (!m) showToast(planned === null ? `Previsto di ${c.label} calcolato dai costi` : `Previsto di ${c.label}: ${formatMoney(planned, cur)}`)
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
        title: `«${c.label}» è usata da ${c.nSpese} ${c.nSpese === 1 ? 'spesa' : 'spese'}`,
        message: 'Non si può eliminare finché è in uso. Spostale prima in un’altra categoria, oppure archivia questa: resta sulle spese già fatte ma non si propone più.',
        confirm: 'Archivia la categoria',
        cancel: 'Lascia stare',
        destructive: false,
      })
      if (!archivia) return
      const m = await t.setExpenseCategoryArchived(c.id, true)
      showToast(m ?? 'Categoria archiviata', m ? undefined : { label: 'Annulla', run: () => void t.setExpenseCategoryArchived(c.id as string, false) })
      return
    }
    const ok = await ask({
      title: `Eliminare «${c.label}»?`,
      message: 'Non ha spese: sparisce dalla ricevuta.',
      confirm: 'Elimina la categoria',
      cancel: 'Tieni la categoria',
      destructive: true,
    })
    if (!ok) return
    const m = await t.setExpenseCategoryDeleted(c.id, true)
    showToast(m ?? 'Categoria eliminata', m ? undefined : { label: 'Annulla', run: () => void t.setExpenseCategoryDeleted(c.id as string, false) })
  }

  return (
    <Schermata
      bar={<BarraGrande title="Spese" sub={[trip.destination, n > 1 ? `${n} persone` : ''].filter(Boolean).join(' · ')} />}
      gap={15}
      fab={{ label: 'Spesa', aria: 'Aggiungi una spesa', onPress: () => setNuova(true) }}
      overlay={
        <>
          {nuova ? <SpesaSheet trip={trip} open onClose={() => setNuova(false)} /> : null}
          {paga ? <DichiaraSheet trip={trip} toId={paga.to} dovuto={paga.amount} onClose={() => setPaga(null)} /> : null}
          {confirmNode}
        </>
      }
    >
      <Riepilogo dove={trip.destination} speso={r.speso} currency={cur} limit={r.limit} onSetBudget={() => navigate('/spese/budget')} onOpenBudget={() => navigate('/spese/budget')} second={second} />
      <RimborsiCard trip={trip} />
      <Ricevuta
        me={me?.id}
        onHoPagato={trip.settlements ? (x) => setPaga({ to: x.to, amount: x.amount }) : undefined}
        trip={trip}
        dati={dati}
        sub={[trip.destination, intervallo(trip.startDate, trip.endDate), inQuanti(n)].filter(Boolean).join(' · ')}
        aggiornato={aggiornatoText()}
        onPlanned={onPlanned}
        onRename={onRename}
        onDelete={onDelete}
      />
      <Pulsante color="secondary" iconTrailing="chevr" onPress={() => navigate('/spese/dettaglio')}>
        Vedi il dettaglio delle spese
      </Pulsante>
      {n > 1 ? (
        <Pulsante color="tertiary" iconTrailing="chevr" onPress={() => navigate('/spese/bilancio')}>
          Il mio bilancio e i rimborsi
        </Pulsante>
      ) : null}
    </Schermata>
  )
}
