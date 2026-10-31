// Rimborsi con doppia conferma (#51): «Ho pagato», richieste da confermare o rifiutare, richieste in attesa, cronologia.
// I saldi cambiano solo quando il destinatario conferma; i rimborsi non sono spese.
import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { Banner, Campo, Pillola, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { controllaRimborso, daDecidere, inAttesaMie, STATO_RIMBORSO, testoRichiesta } from '../../lib/rimborsi'
import { formatMoney, parseAmount } from '../../lib/money'
import { tripToday } from '../../lib/today'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Rimborso, Trip } from '../../types'

const first = (trip: Trip, id: string) => trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'

/** Quante richieste aspettano la mia conferma (per il badge sulla scheda Spese e la card in Oggi). */
export function useRichiesteDaDecidere(trip: Trip | null | undefined): Rimborso[] {
  const me = useMe(trip)
  return daDecidere(trip?.settlements, me?.id)
}

/** «Ho pagato»: importo (anche parziale, non oltre il dovuto) e data; la richiesta va «In attesa di conferma». */
export function DichiaraSheet({ trip, toId, dovuto, onClose, corrects }: { trip: Trip; toId: string; dovuto: number; onClose: () => void; corrects?: string }) {
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
    const m = await t.declareSettlement({ tripId: trip.id, fromId: me.id, toId, amount: n as number, currency: cur, paidOn: data, ...(corrects ? { corrects } : {}) })
    setBusy(false)
    if (m) return setError(m)
    showToast(`Fatto: aspetto la conferma di ${first(trip, toId)}.`)
    onClose()
  }
  return (
    <Foglio
      open
      title={corrects ? 'Correggi un rimborso' : 'Ho pagato'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="rimborso-form" isLoading={busy}>
          {busy ? 'Invio…' : `Dichiara a ${first(trip, toId)}`}
        </Pulsante>
      }
    >
      <form id="rimborso-form" className="frm" onSubmit={submit} noValidate>
        <p className="fa-m" style={{ margin: 0 }}>
          {corrects ? `${first(trip, toId)} deve confermare la rettifica.` : `Devi ${formatMoney(dovuto, cur)} a ${first(trip, toId)}. I saldi cambiano quando ${first(trip, toId)} conferma.`}
        </p>
        <Campo label="Importo" inputMode="decimal" value={text} onChange={(v) => (setText(v), setError(''))} trailing={<span>{cur}</span>} error={error || undefined} />
        <Campo label="Data" type="date" value={data} onChange={setData} max={tripToday(trip)} />
      </form>
    </Foglio>
  )
}

/** Foglio di conferma: mostra la richiesta; la conferma vale solo se i saldi sono ancora quelli visti qui (COST-038). */
function DecidiSheet({ trip, r, onClose }: { trip: Trip; r: Rimborso; onClose: () => void }) {
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
      <p style={{ margin: 0 }}>{testoRichiesta(r, trip.travelers)}</p>
      <p className="fa-m">Confermando, il debito e il credito si riducono di {formatMoney(r.amount, r.currency)}. Se non l'hai ricevuto, rifiuta: non cambia niente.</p>
      {errore ? (
        <Banner tone="cor" icon="warn">
          {errore}
        </Banner>
      ) : null}
    </Foglio>
  )
}

/** Richieste da decidere e richieste mie in attesa, in cima alla pagina Spese. */
export function RimborsiCard({ trip }: { trip: Trip }) {
  const t = useTrips()
  const me = useMe(trip)
  const [aperta, setAperta] = useState<Rimborso | null>(null)
  const dec = daDecidere(trip.settlements, me?.id)
  const mie = inAttesaMie(trip.settlements, me?.id)
  if (dec.length === 0 && mie.length === 0) return null
  async function annulla(r: Rimborso) {
    const m = await t.cancelSettlement(r.id)
    showToast(m ?? 'Richiesta annullata')
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {dec.map((r) => (
        <Banner key={r.id} tone="az" icon="info" action={<Pulsante size="sm" onPress={() => setAperta(r)}>Rispondi</Pulsante>}>
          {testoRichiesta(r, trip.travelers)}
        </Banner>
      ))}
      {mie.map((r) => (
        <Banner key={r.id} tone="az" icon="clock" action={<Pulsante size="sm" color="secondary" onPress={() => void annulla(r)}>Annulla</Pulsante>}>
          Hai dichiarato {formatMoney(r.amount, r.currency)} a {first(trip, r.toId)} · {STATO_RIMBORSO.in_attesa.toLowerCase()}
        </Banner>
      ))}
      {aperta ? <DecidiSheet trip={trip} r={aperta} onClose={() => setAperta(null)} /> : null}
    </div>
  )
}

/** Card in Oggi: qualcuno dice di averti dato dei soldi. */
export function RimborsiOggi({ trip }: { trip: Trip }) {
  const dec = useRichiesteDaDecidere(trip)
  if (dec.length === 0) return null
  return (
    <Banner tone="az" icon="info" action={<Link href="/spese" className="fa-btn sm">Rispondi</Link>}>
      {testoRichiesta(dec[0], trip.travelers)}
      {dec.length > 1 ? ` (+${dec.length - 1})` : ''}
    </Banner>
  )
}

export function StatoPillola({ stato }: { stato: Rimborso['status'] }) {
  return (
    <Pillola tone={stato === 'confermato' ? 'acq' : stato === 'in_attesa' ? 'soft' : 'mut'} icon={stato === 'confermato' ? 'check' : stato === 'in_attesa' ? 'clock' : undefined}>
      {STATO_RIMBORSO[stato]}
    </Pillola>
  )
}
