// Rimborsi (#51): «Ho pagato» vale subito e il destinatario, se non torna, lo contesta dal menu della voce (0047); «Bilancia
// tutte le spese» chiude in un colpo i pagamenti e le compensazioni con una persona. Le richieste dichiarate prima della
// 0047 restano «in attesa» e si decidono come sempre. I rimborsi non sono spese.
import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'wouter'
import { Banner, Campo, Pillola, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { chiRichiesta, controllaRimborso, daDecidere, dataNumerica, inAttesaMie, pagamentiNuovi, riepilogoNovita, rimborsiValidi, STATO_RIMBORSO } from '../../lib/rimborsi'
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
import { t as tt } from '../../i18n'

const first = (trip: Trip, id: string) => trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'

/** Quante richieste aspettano la mia conferma (per il badge sulla scheda Spese e la card in Oggi). */
export function useRichiesteDaDecidere(trip: Trip | null | undefined): Rimborso[] {
  const me = useMe(trip)
  return daDecidere(trip ? rimborsiValidi(trip).settlements : undefined, me?.id)
}

/** Pagamenti di altri che non ho ancora visto (avviso in Oggi, in Spese e pallino sulla scheda). */
export function useNovitaRimborsi(trip: Trip | null | undefined) {
  const me = useMe(trip)
  const [visti, setVisti] = useState<Set<string>>(() => (trip ? leggiVisti(trip.id) : new Set()))
  const tripId = trip?.id
  useEffect(() => {
    if (tripId) setVisti(leggiVisti(tripId))
  }, [tripId])
  const nuovi = useMemo(() => (trip ? pagamentiNuovi(rimborsiValidi(trip).settlements, trip.travelers, me?.id, me?.userId, visti, new Date()) : []), [trip, me?.id, me?.userId, visti])
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
    if (!me) return setError(tt('Non so chi sei in questo viaggio: collega il tuo account ai viaggiatori.'))
    const n = parseAmount(text)
    const err = controllaRimborso(n, dovuto, cur)
    if (err) return setError(err)
    if (!data) return setError(tt('Scegli la data.'))
    setBusy(true)
    const m = await t.declareSettlements(trip.id, [{ fromId: me.id, toId, amount: n as number, ...(expenseId ? { expenseId } : {}) }], cur, data)
    setBusy(false)
    if (m) return setError(m)
    showToast(pagamentiImmediati() === false ? tt('Fatto: aspetto la conferma di {v0}.', { v0: first(trip, toId) }) : tt('Pagamento registrato.'))
    onClose()
  }
  return (
    <Foglio
      open
      title={tt('Ho pagato')}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="rimborso-form" isLoading={busy}>
          {tt('Dichiara a {v0}', { v0: first(trip, toId) })}
        </Pulsante>
      }
    >
      <form id="rimborso-form" className="frm" onSubmit={submit} noValidate>
        <p className="fa-m" style={{ margin: 0 }}>
          {tt('Devi {v0} a {v1}. Lo registro subito: {v2} lo vede e, se non torna, può contestarlo.', { v0: formatMoney(dovuto, cur), v1: first(trip, toId), v2: first(trip, toId) })}
        </p>
        <Campo label={tt('Importo')} inputMode="decimal" value={text} onChange={(v) => (setText(v), setError(''))} trailing={<span>{cur}</span>} error={error || undefined} />
        <Campo label={tt('Data')} type="date" value={data} onChange={setData} max={tripToday(trip)} />
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
    showToast(accetta ? tt('Rimborso confermato: i saldi sono aggiornati.') : tt('Rimborso rifiutato.'))
    onClose()
  }
  return (
    <Foglio
      open
      title={tt('Hai ricevuto il rimborso?')}
      onClose={onClose}
      footer={
        <div style={{ display: 'grid', gap: 8 }}>
          <Pulsante isLoading={busy} isDisabled={versione === undefined} onPress={() => void decidi(true)}>
            {tt('Conferma')}
          </Pulsante>
          <Pulsante color="secondary" isDisabled={busy} onPress={() => void decidi(false)}>
            {tt('Rifiuta')}
          </Pulsante>
        </div>
      }
    >
      <p style={{ margin: 0, textAlign: 'center' }}>{chiRichiesta(r, trip.travelers)}</p>
      <p className="fa-m" style={{ margin: 0, textAlign: 'center' }}>{tt('Confermando, il debito e il credito si riducono di {v0}.', { v0: formatMoney(r.amount, r.currency) })}
        <br />
        {tt('Se non l\'hai ricevuto, rifiuta: non cambia niente.')}
      </p>
      {errore ? (
        <Banner tone="cor" icon="warn">
          {errore}
        </Banner>
      ) : null}
    </Foglio>
  )
}

/**
 * Avvisi sui pagamenti che altri hanno registrato per me: «Controlla» porta alle voci (dove si può contestare), «Ho visto»
 * li toglie. Da due in su c'è una riga sola di riepilogo con «Ho visto tutti»; toccandola si apre l'elenco.
 */
function AvvisiNovita({ trip, aperti = false }: { trip: Trip; /** elenco già aperto (nel Bilancio) */ aperti?: boolean }) {
  const { nuovi, visto } = useNovitaRimborsi(trip)
  const [aperto, setAperto] = useState(aperti)
  const elenco = useId()
  if (nuovi.length === 0) return null
  const righe = nuovi.map((n) => (
    <Banner
      key={n.key}
      tone="az"
      icon="info"
      azioniSotto
      action={
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/spese/bilancio" className="fa-btn sm sott" onClick={() => visto([n.key])}>{tt('Controlla')}</Link>
          <Pulsante size="sm" color="secondary" onPress={() => visto([n.key])}>{tt('Ho visto')}</Pulsante>
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
  ))
  if (nuovi.length === 1) return <>{righe}</>
  const r = riepilogoNovita(nuovi, trip.travelers)
  // un riquadro solo: il riepilogo in alto e, aperto, le righe sotto nello stesso riquadro, divise da una linea
  return (
    <div className="fa-novita">
      <Banner
        tone="az"
        icon="info"
        azioniSotto
        action={
          <Pulsante size="sm" color="secondary" onPress={() => visto(nuovi.map((n) => n.key))} aria-label={tt('Segna come visti tutti i {n} pagamenti nuovi', { n: nuovi.length })}>
            {tt('Ho visto tutti')}
          </Pulsante>
        }
      >
        <button type="button" className="fa-novita-t" aria-expanded={aperto} aria-controls={elenco} onClick={() => setAperto((x) => !x)}>
          <span>
            <b>{r.titolo}</b>
            {r.sub ? <span className="fa-novita-s">{r.sub}</span> : null}
          </span>
          <Sv name="chev" size={20} />
        </button>
      </Banner>
      {aperto ? (
        <ul id={elenco} className="fa-novita-el">
          {nuovi.map((n) => (
            <li key={n.key}>
              <span className="fa-novita-rt">
                {n.testo}
                {n.dettaglio ? (
                  <>
                    <br />
                    {n.dettaglio}
                  </>
                ) : null}
              </span>
              <span className="fa-novita-ra">
                <Link href="/spese/bilancio" className="fa-btn sm sott" onClick={() => visto([n.key])}>{tt('Controlla')}</Link>
                <Pulsante size="sm" color="secondary" onPress={() => visto([n.key])}>{tt('Ho visto')}</Pulsante>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Richieste da decidere (quelle di prima della 0047), mie in attesa e pagamenti nuovi di altri, in cima alla pagina Spese. */
export function RimborsiCard({ trip, conMie = true, novitaAperte = false }: { trip: Trip; /** Le mie richieste in attesa: in «Il mio bilancio» ci sono già. */ conMie?: boolean; /** pagamenti nuovi già aperti (nel Bilancio) */ novitaAperte?: boolean }) {
  const t = useTrips()
  const me = useMe(trip)
  const [aperta, setAperta] = useState<Rimborso | null>(null)
  const [occ, faiOcc] = useInCorso()
  const { nuovi } = useNovitaRimborsi(trip)
  const validi = rimborsiValidi(trip).settlements
  const dec = daDecidere(validi, me?.id)
  const mie = conMie ? inAttesaMie(validi, me?.id) : []
  if (dec.length === 0 && mie.length === 0 && nuovi.length === 0) return null
  async function annulla(r: Rimborso) {
    const m = await faiOcc(r.id, () => t.cancelSettlement(r.id))
    showToast(m ?? tt('Richiesta annullata'))
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <AvvisiNovita trip={trip} aperti={novitaAperte} />
      {dec.map((r) => (
        <Banner key={r.id} tone="az" icon="info" action={<Pulsante size="sm" onPress={() => setAperta(r)}>{tt('Rispondi')}</Pulsante>}>
          {chiRichiesta(r, trip.travelers)}
          <br />
          {dataNumerica(r.paidOn)}
        </Banner>
      ))}
      {mie.map((r) => (
        <Banner key={r.id} tone="az" icon="clock" action={<Pulsante size="sm" color="secondary" isLoading={occ === r.id} onPress={() => void annulla(r)}>{tt('Annulla')}</Pulsante>}>
          {tt('Hai dichiarato {v0} a {v1}', { v0: formatMoney(r.amount, r.currency), v1: first(trip, r.toId) })}
          <br />
          {STATO_RIMBORSO.in_attesa}
        </Banner>
      ))}
      {aperta ? <DecidiSheet trip={trip} r={aperta} onClose={() => setAperta(null)} /> : null}
    </div>
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
    showToast(tt('Spese con {chi} bilanciate.', { chi }))
    onClose()
  }
  return (
    <Foglio
      open
      title={tt('Bilancia con {chi}', { chi })}
      onClose={onClose}
      footer={
        <Pulsante isLoading={busy} onPress={() => void conferma()}>
          {tt('Bilancia tutte le spese')}
        </Pulsante>
      }
    >
      <p style={{ margin: 0, textAlign: 'center' }}>
        {tt('{v0} tra te e {chi}.', { v0: piano.voci === 1 ? tt('Si chiude 1 voce') : tt('Si chiudono {voci} voci', { voci: piano.voci }), chi })}
      </p>
      <p className="fa-m" style={{ margin: 0, textAlign: 'center' }}>
        {piano.compensato > 0 ? tt('{v0} si annullano tra debiti e crediti. ', { v0: formatMoney(piano.compensato, cur) }) : ''}
        {piano.chiPaga === 'io' ? tt('Tu dai {v0} a {chi}.', { v0: formatMoney(piano.daPagare, cur), chi }) : piano.chiPaga === 'altro' ? tt('{chi} ti dà {v1}.', { chi, v1: formatMoney(piano.daPagare, cur) }) : tt('Nessuno deve dare niente.')}
        <br />
        {tt('{chi} lo vede subito e, se non torna, può contestarlo.', { chi })}
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
