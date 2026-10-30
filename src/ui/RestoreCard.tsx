import type React from 'react'
import { useRef, useState } from 'react'
import { formatShort } from '../lib/dates'
import { parseExport, summarizeTrip, type ParseOutcome, type RestorableTrip } from '../lib/restore'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trips'
import { FormError, PrimaryButton, TextField } from './Field'
import { Card } from './PageHeader'

const MAX_BYTES = 20 * 1024 * 1024

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function summaryLine(trip: RestorableTrip['trip']): string {
  const s = summarizeTrip(trip)
  return [
    plural(s.days, 'giorno', 'giorni'),
    s.items && plural(s.items, 'tappa', 'tappe'),
    s.places && plural(s.places, 'luogo', 'luoghi'),
    s.stays && plural(s.stays, 'alloggio', 'alloggi'),
    s.transports && plural(s.transports, 'trasporto', 'trasporti'),
    s.flights && plural(s.flights, 'volo', 'voli'),
    s.budget && plural(s.budget, 'voce di budget', 'voci di budget'),
    s.expenses && plural(s.expenses, 'spesa', 'spese'),
    s.checklist && plural(s.checklist, 'voce in checklist', 'voci in checklist'),
    s.bookings && plural(s.bookings, 'prenotazione', 'prenotazioni'),
  ]
    .filter(Boolean)
    .join(' · ')
}

function Candidate({ item, defaultTitle, onDone }: { item: RestorableTrip; defaultTitle: string; onDone: () => void }) {
  const t = useTrips()
  const [title, setTitle] = useState(defaultTitle)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { trip, warnings } = item

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const message = await t.restoreTrip(trip, title.trim() || trip.title)
    setBusy(false)
    if (message) {
      setError(message)
      return
    }
    showToast(`Viaggio «${title.trim() || trip.title}» ripristinato`)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-[20px] border border-hairline bg-bg p-4">
      <div>
        <p className="font-extrabold">{trip.title}</p>
        <p className="text-sm text-muted">
          {formatShort(trip.startDate)} – {formatShort(trip.endDate)}
          {trip.destination && ` · ${trip.destination}`}
        </p>
        <p className="mt-1 text-sm text-muted">{summaryLine(trip)}</p>
      </div>
      {warnings.length > 0 && (
        <details className="rounded-2xl border-2 border-warn px-4 py-3 text-sm">
          <summary className="min-h-6 cursor-pointer font-extrabold text-warn">
            {warnings.length === 1 ? '1 avviso' : `${warnings.length} avvisi`}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((w) => (
              <li>{w}</li>
            ))}
          </ul>
        </details>
      )}
      <TextField label="Nome del nuovo viaggio" value={title} onChange={setTitle} maxLength={80} required />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Ripristino in corso…' : 'Crea il viaggio'}</PrimaryButton>
    </form>
  )
}

/** Ripristino da un file esportato: sceglie il file, mostra cosa contiene, crea un viaggio nuovo. */
export function RestoreCard() {
  const t = useTrips()
  const input = useRef<HTMLInputElement>(null)
  const [outcome, setOutcome] = useState<ParseOutcome | null>(null)
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.currentTarget as HTMLInputElement
    const file = el.files?.[0]
    el.value = '' // permette di scegliere di nuovo lo stesso file
    if (!file) return
    setFileName(file.name)
    if (file.size > MAX_BYTES) {
      setOutcome({ ok: false, error: 'Il file è troppo grande (oltre 20 MB): non sembra un\'esportazione di Faraway.' })
      return
    }
    setReading(true)
    try {
      setOutcome(parseExport(await file.text()))
    } catch {
      setOutcome({ ok: false, error: 'Non riesco a leggere il file.' })
    } finally {
      setReading(false)
    }
  }

  const taken = new Set(t.trips.map((x) => x.title.trim().toLowerCase()))
  const suggest = (title: string) => (taken.has(title.trim().toLowerCase()) ? `${title} (ripristino)` : title)

  return (
    <Card>
      <h2 className="h-sm">Ripristina da file</h2>
      <p className="b-sm muted" style={{ marginTop: '4px' }}>
        Riporta i viaggi da un file esportato: i viaggi vengono ricreati, quelli che hai già non vengono toccati.
      </p>
      <p className="cap muted" style={{ marginTop: '4px' }}>
        Nel file non ci sono gli allegati (PDF) né gli account: i viaggiatori tornano senza account e si collegano da Altro → Viaggiatori.
      </p>
      <input ref={input} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} onChange={(e) => void onFile(e)} aria-label="File di esportazione" />
      <button type="button" className="btn soft block" style={{ marginTop: '12px' }} onClick={() => input.current?.click()}>
        {reading ? 'Leggo il file…' : outcome ? 'Scegli un altro file' : 'Scegli il file'}
      </button>

      {outcome && !outcome.ok && (
        <div className="mt-3">
          <FormError message={outcome.error} />
        </div>
      )}

      {outcome?.ok && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted">
            {fileName && <span className="font-extrabold text-ink">{fileName}</span>}
            {fileName && ' · '}
            {outcome.trips.length === 1 ? '1 viaggio nel file' : `${outcome.trips.length} viaggi nel file`}
          </p>
          {outcome.trips.map((item) => (
            <Candidate key={item.trip.id} item={item} defaultTitle={suggest(item.trip.title)} onDone={() => setOutcome(null)} />
          ))}
          {outcome.skipped.map((s) => (
            <p className="rounded-2xl border-2 border-warn px-4 py-3 text-sm">
              <span className="font-extrabold">{s.title}</span> non si può ripristinare: {s.reason}.
            </p>
          ))}
        </div>
      )}
    </Card>
  )
}
