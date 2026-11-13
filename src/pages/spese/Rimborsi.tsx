// Rimborsi (#51): «Ho pagato» vale subito e il destinatario, se non torna, lo contesta dal menu della voce (0047); «Bilancia
// tutte le spese» chiude in un colpo i pagamenti e le compensazioni con una persona. Le richieste dichiarate prima della
// 0047 restano «in attesa» e si decidono come sempre. I rimborsi non sono spese.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'wouter'
import { Banner, Campo, Pillola, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { chiRichiesta, controllaRimborso, daDecidere, dataNumerica, inAttesaMie, pagamentiNuovi, STATO_RIMBORSO } from '../../lib/rimborsi'
import { pagamentiImmediati } from '../../lib/moneyApi'
import type { PianoBilancia } from '../../lib/debitiSpese'
import { leggiVisti, segnaVisti } from '../../lib/rimborsiVisti'
import { formatMoney, parseAmount } from '../../lib/money'
import { tripToday } from '../../lib/today'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Rimborso, Trip } from '../../types'
import { useInCorso } from '../../faraway/Attesa'

const first = (trip: Trip, id: string) => trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'

/** Quante richieste aspettano la mia conferma (per il badge sulla scheda Spese e la card in Oggi). */
export function useRichiesteDaDecidere(trip: Trip | null | undefined): Rimborso[] {
  const me = useMe(trip)
  return daDecidere(trip?.settlements, me?.id)
}

/** Pagamenti di altri che non ho ancora visto (avviso in Oggi, in Spese e pallino sulla scheda). */
export function useNovitaRimborsi(trip: Trip | null | undefined) {
  const me = useMe(trip)
  const [visti, setVisti] = useState<Set<string>>(() => (trip ? leggiVisti(trip.id) : new Set()))
  const tripId = trip?.id
  useEffect(() => {
    if (tripId) setVisti(leggiVisti(tripId))
  }, [tripId])
  const nuovi = useMemo(() => (trip ? pagamentiNuovi(trip.settlements, trip.travelers, me?.id, me?.userId, visti, new Date()) : []), [trip, me?.id, me?.userId, visti])
  return { nuovi, visto: (keys: readonly string[]) => tripId && setVisti(segnaVisti(tripId, keys)) }
}

/** «Ho pagato»: importo (anche parziale, non oltre il dovuto) e data; la richiesta va «In attesa di conferma». */
export function DichiaraSheet({ trip, toId, dovuto, onClose, expenseId }: { trip: Trip; toId: string; dovuto: number; onClose: () => void; /** spesa da cui si dichiara: il pagamento copre quella (0042) */ expenseId?: string }) {
  const t = useTrips()
  const me = useMe(trip)
  const cur = trip.baseCurrency
  const [text, setText] = useState(String(dovuto).replace('.', ','))
  const [data, setData] = useState(tripToday(trip))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!me) return setError('Non so chi sei in questo viaggio: collega il tuo account ai viaggiatori.')
    const n = parseAmount(text)
    const err = controllaRimborso(n, dovuto, cur)
    if (err) return setError(err)
    if (!data) return setError('Scegli la data.')
    setBusy(true)
    const m = await t.declareSettlements(trip.id, [{ fromId: me.id, toId, amount: n as number, ...(expenseId ? { expenseId } : {}) }], cur, data)
    setBusy(false)
    if (m) return setError(m)
    showToast(pagamentiImmediati() === false ? `Fatto: aspetto la conferma di ${first(trip, toId)}.` : 'Pagamento registrato.')
    onClose()
  }
  return (
    <Foglio
      open
      title="Ho pagato"
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="rimborso-form" isLoading={busy}>
          {`Dichiara a ${first(trip, toId)}`}
        </Pulsante>
      }
    >
      <form id="rimborso-form" className="frm" onSubmit={submit} noValidate>
        <p className="fa-m" style={{ margin: 0 }}>
          {`Devi ${formatMoney(dovuto, cur)} a ${first(trip, toId)}. Lo registro subito: ${first(trip, toId)} lo vede e, se non torna, può contestarlo.`}
        </p>
        <Campo label="Importo" inputMode="decimal" value={text} onChange={(v) => (setText(v), setError(''))} trailing={<span>{cur}</span>} error={error || undefined} />
        <Campo label="Data" type="date" value={data} onChange={setData} max={tripToday(trip)} />
      </form>
    </Foglio>
  )
}

/** Foglio di conferma: mostra la richiesta; la conferma vale solo se i saldi sono ancora quelli visti qui (COST-038). */
export function DecidiSheet({ trip, r, onClose }: { trip: Trip; r: Rimborso; onClose: () => void }) {
  const t = useTrips()
  const [versione, setVersione] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState('')
  useEffect(() => {
    let off = false
    void t.balanceVersion(trip.id).then((v) => !off && setVersione(v))
    return () => {
      off = true
    }
  }, [t, trip.id])
  async function decidi(accetta: boolean) {
    setBusy(true)
    const m = await t.decideSettlement(r.id, accetta, accetta ? (versione ?? null) : null)
    setBusy(false)
    if (m) {
      setErrore(m)
      void t.balanceVersion(trip.id).then(setVersione)
      return
    }
    showToast(accetta ? 'Rimborso confermato: i saldi sono aggiornati.' : 'Rimborso rifiutato.')
    onClose()
  }
  return (
    <Foglio
      open
      title="Hai ricevuto il rimborso?"
      onClose={onClose}
      footer={
        <div style={{ display: 'grid', gap: 8 }}>
          <Pulsante isLoading={busy} isDisabled={versione === undefined} onPress={() => void decidi(true)}>
            Conferma
          </Pulsante>
          <Pulsante color="secondary" isDisabled={busy} onPress={() => void decidi(false)}>
            Rifiuta
          </Pulsante>
        </div>
      }
    >
      <p style={{ margin: 0, textAlign: 'center' }}>{chiRichiesta(r, trip.travelers)}</p>
      <p className="fa-m" style={{ margin: 0, textAlign: 'center' }}>Confermando, il debito e il credito si riducono di {formatMoney(r.amount, r.currency)}.
        <br />
        Se non l'hai ricevuto, rifiuta: non cambia niente.
      </p>
      {errore ? (
        <Banner tone="cor" icon="warn">
          {errore}
        </Banner>
      ) : null}
    </Foglio>
  )
}

/** Avvisi sui pagamenti che altri hanno registrato per me: «Controlla» porta alle voci (dove si può contestare), «Ho visto» li toglie. */
function AvvisiNovita({ trip, solo }: { trip: Trip; /** quanti mostrarne al massimo */ solo?: number }) {
  const { nuovi, visto } = useNovitaRimborsi(trip)
  if (nuovi.length === 0) return null
  return (
    <>
      {nuovi.slice(0, solo ?? nuovi.length).map((n) => (
        <Banner
          key={n.key}
          tone="az"
          icon="info"
          azioniSotto
          action={
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link href="/spese/bilancio" className="fa-btn sm" onClick={() => visto([n.key])}>Controlla</Link>
              <Pulsante size="sm" color="secondary" onPress={() => visto([n.key])}>Ho visto</Pulsante>
            </span>
          }
        >
          {n.testo}
          {n.dettaglio ? (
            <>
              <br />
              {n.dettaglio}
            </>
          ) : null}
        </Banner>
      ))}
    </>
  )
}

/** Richieste da decidere (quelle di prima della 0047), mie in attesa e pagamenti nuovi di altri, in cima alla pagina Spese. */
export function RimborsiCard({ trip, conMie = true }: { trip: Trip; /** Le mie richieste in attesa: in «Il mio bilancio» ci sono già. */ conMie?: boolean }) {
  const t = useTrips()
  const me = useMe(trip)
  const [aperta, setAperta] = useState<Rimborso | null>(null)
  const [occ, faiOcc] = useInCorso()
  const { nuovi } = useNovitaRimborsi(trip)
  const dec = daDecidere(trip.settlements, me?.id)
  const mie = conMie ? inAttesaMie(trip.settlements, me?.id) : []
  if (dec.length === 0 && mie.length === 0 && nuovi.length === 0) return null
  async function annulla(r: Rimborso) {
    const m = await faiOcc(r.id, () => t.cancelSettlement(r.id))
    showToast(m ?? 'Richiesta annullata')
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <AvvisiNovita trip={trip} />
      {dec.map((r) => (
        <Banner key={r.id} tone="az" icon="info" action={<Pulsante size="sm" onPress={() => setAperta(r)}>Rispondi</Pulsante>}>
          {chiRichiesta(r, trip.travelers)}
          <br />
          {dataNumerica(r.paidOn)}
        </Banner>
      ))}
      {mie.map((r) => (
        <Banner key={r.id} tone="az" icon="clock" action={<Pulsante size="sm" color="secondary" isLoading={occ === r.id} onPress={() => void annulla(r)}>Annulla</Pulsante>}>
          Hai dichiarato {formatMoney(r.amount, r.currency)} a {first(trip, r.toId)}
          <br />
          {STATO_RIMBORSO.in_attesa}
        </Banner>
      ))}
      {aperta ? <DecidiSheet trip={trip} r={aperta} onClose={() => setAperta(null)} /> : null}
    </div>
  )
}

/** Card in Oggi: una richiesta in attesa da decidere, oppure un pagamento nuovo di un altro. */
export function RimborsiOggi({ trip }: { trip: Trip }) {
  const dec = useRichiesteDaDecidere(trip)
  const { nuovi } = useNovitaRimborsi(trip)
  if (dec.length === 0 && nuovi.length === 0) return null
  return (
    <>
      {dec.length > 0 ? (
        <Banner tone="az" icon="info" action={<Link href="/spese" className="fa-btn sm">Rispondi</Link>}>
          {chiRichiesta(dec[0], trip.travelers)}
          {dec.length > 1 ? ` (+${dec.length - 1})` : ''}
          <br />
          {dataNumerica(dec[0].paidOn)}
        </Banner>
      ) : null}
      <AvvisiNovita trip={trip} solo={1} />
    </>
  )
}

/** «Bilancia tutte le spese» con una persona: dice cosa succede e registra tutto in un colpo. */
export function BilanciaSheet({ trip, piano, onClose }: { trip: Trip; piano: PianoBilancia; onClose: () => void }) {
  const t = useTrips()
  const cur = trip.baseCurrency
  const chi = first(trip, piano.otherId)
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState('')
  async function conferma() {
    setBusy(true)
    const m = await t.declareSettlements(trip.id, piano.righe, cur, tripToday(trip))
    setBusy(false)
    if (m) return setErrore(m)
    showToast(`Spese con ${chi} bilanciate.`)
    onClose()
  }
  return (
    <Foglio
      open
      title={`Bilancia con ${chi}`}
      onClose={onClose}
      footer={
        <Pulsante isLoading={busy} onPress={() => void conferma()}>
          Bilancia tutte le spese
        </Pulsante>
      }
    >
      <p style={{ margin: 0, textAlign: 'center' }}>
        {piano.voci === 1 ? 'Si chiude 1 voce' : `Si chiudono ${piano.voci} voci`} tra te e {chi}.
      </p>
      <p className="fa-m" style={{ margin: 0, textAlign: 'center' }}>
        {piano.compensato > 0 ? `${formatMoney(piano.compensato, cur)} si annullano tra debiti e crediti. ` : ''}
        {piano.chiPaga === 'io' ? `Tu dai ${formatMoney(piano.daPagare, cur)} a ${chi}.` : piano.chiPaga === 'altro' ? `${chi} ti dà ${formatMoney(piano.daPagare, cur)}.` : 'Nessuno deve dare niente.'}
        <br />
        {`${chi} lo vede subito e, se non torna, può contestarlo.`}
      </p>
      {errore ? (
        <Banner tone="cor" icon="warn">
          {errore}
        </Banner>
      ) : null}
    </Foglio>
  )
}

export function StatoPillola({ stato }: { stato: Rimborso['status'] }) {
  return (
    <Pillola tone={stato === 'confermato' ? 'acq' : stato === 'in_attesa' ? 'soft' : stato === 'contestato' ? 'cor' : 'mut'} icon={stato === 'confermato' ? 'check' : stato === 'in_attesa' ? 'clock' : undefined}>
      {STATO_RIMBORSO[stato]}
    </Pillola>
  )
}
