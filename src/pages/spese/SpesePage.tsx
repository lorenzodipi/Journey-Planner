// Scheda Spese (mock Fa-23…Fa-26, #34): «Speso in …» con il budget, saldo e persone (o in pari, o da solo),
// la ricevuta in linea con categorie (previsto modificabile), totali, saldi e «Per pareggiare», FAB «+ Spesa».
import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { daysBetween } from '../../lib/dates'
import { totaliDelViaggio } from '../../lib/debitiSpese'
import { formatMoney, round2 } from '../../lib/money'
import { ricevuta, type RigaCategoria } from '../../lib/ricevuta'
import { alGiorno, riassunto } from '../../lib/spese'
import { tripToday } from '../../lib/today'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { Pulsante } from '../../faraway/base'
import { useConferma } from '../../faraway/Foglio'
import { DareRicevere, DueValori, Riepilogo } from '../../faraway/Home'
import { Ricevuta } from '../../faraway/Ricevuta'
import { Affianca, BarraGrande, Colonna, Schermata } from '../../faraway/shell'
import { SpesaSheet } from './SpesaSheet'
import { RimborsiCard } from './Rimborsi'
import { finoAl, inQuanti, intervallo } from './testi'

export function SpesePage() {
  const trip = useTrip()
  const t = useTrips()
  const me = useMe(trip)
  const [, navigate] = useLocation()
  const [nuova, setNuova] = useState(false)
  const [ask, confirmNode] = useConferma()
  const today = tripToday(trip)
  const r = riassunto(trip, me?.id)
  const dati = useMemo(() => ricevuta(trip, r.spese, r.fx), [trip, r.spese, r.fx])
  const cur = trip.baseCurrency
  const n = trip.travelers.length
  const bilancio = useMemo(() => totaliDelViaggio(trip, r.spese, r.fx, me?.id), [trip, r.spese, r.fx, me?.id])

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
    <DareRicevere bilancio={bilancio} currency={cur} />
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
    // niente spese ma costi previsti (voci di budget): passano in «Altro», poi la categoria si elimina
    const previsti = trip.budget.filter((b) => b.categoryId === c.id)
    if (previsti.length > 0) {
      const nomi = previsti.map((b) => `«${b.label}»`).join(', ')
      const sposta = await ask({
        title: `Eliminare «${c.label}»?`,
        message: `Non ha spese, ma ha ${previsti.length === 1 ? 'un costo previsto' : `${previsti.length} costi previsti`}: ${nomi}. ${previsti.length === 1 ? 'Passa' : 'Passano'} nella categoria «Altro», così il previsto totale non cambia.`,
        confirm: 'Sposta ed elimina',
        cancel: 'Tieni la categoria',
        destructive: true,
      })
      if (!sposta) return
      const m = await t.deleteExpenseCategoryMovingBudget(trip.id, c.id)
      showToast(m ?? `Categoria eliminata, ${previsti.length === 1 ? 'il costo previsto è' : 'i costi previsti sono'} in «Altro»`)
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
      gap={16}
      fisso
      fab={{ label: 'Spesa', aria: 'Aggiungi una spesa', onPress: () => setNuova(true) }}
      overlay={
        <>
          {nuova ? <SpesaSheet trip={trip} open onClose={() => setNuova(false)} /> : null}
          {confirmNode}
        </>
      }
    >
      {/* pieghevole aperto: riepilogo, saldi e collegamenti a sinistra, la ricevuta a destra */}
      <Affianca>
        <Colonna lato="sinistra">
          <Riepilogo dove={trip.destination} speso={r.speso} currency={cur} limit={r.limit} onSetBudget={() => navigate('/spese/budget')} onOpenBudget={() => navigate('/spese/budget')} second={second} />
          <RimborsiCard trip={trip} />
        </Colonna>
        <Colonna lato="destra" alta>
          <Ricevuta
            trip={trip}
            dati={dati}
            sub={[trip.destination, intervallo(trip.startDate, trip.endDate), inQuanti(n)].filter(Boolean).join(' · ')}
            onPlanned={onPlanned}
            onRename={onRename}
            onDelete={onDelete}
          />
        </Colonna>
        <Colonna lato="sinistra">
          <Pulsante color="secondary" iconTrailing="chevr" onPress={() => navigate('/spese/dettaglio')}>
            Vedi il dettaglio delle spese
          </Pulsante>
          {n > 1 ? (
            <Pulsante color="tertiary" iconTrailing="chevr" onPress={() => navigate('/spese/bilancio')}>
              Il mio bilancio e i rimborsi
            </Pulsante>
          ) : null}
        </Colonna>
      </Affianca>
    </Schermata>
  )
}
