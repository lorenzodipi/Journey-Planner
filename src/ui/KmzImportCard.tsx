import { useMemo, useRef, useState } from 'preact/hooks'
import { readKmzFile, type KmzContent } from '../lib/kmz'
import { planImport } from '../lib/kmzPlan'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trips'
import { FormError, PrimaryButton, SecondaryButton } from './Field'
import { Card } from './PageHeader'

const MAX_BYTES = 30 * 1024 * 1024

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Importa i luoghi di una mappa Google My Maps (.kmz) nel viaggio aperto, con il link al punto su Google Maps. */
export function KmzImportCard() {
  const t = useTrips()
  const trip = t.active
  const input = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState<KmzContent | null>(null)
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replaceLinks, setReplaceLinks] = useState(false)

  const plan = useMemo(
    () => (content && trip ? planImport(content.points, trip.places, trip.categories.map((c) => c.label), { replaceLinks }) : null),
    [content, trip, replaceLinks],
  )
  if (!trip) return null

  function reset() {
    setContent(null)
    setFileName('')
    setError(null)
    setReplaceLinks(false)
  }

  async function onFile(e: Event) {
    const el = e.currentTarget as HTMLInputElement
    const file = el.files?.[0]
    el.value = '' // permette di scegliere di nuovo lo stesso file
    if (!file) return
    setError(null)
    setContent(null)
    setFileName(file.name)
    if (file.size > MAX_BYTES) {
      setError('Il file è troppo grande (oltre 30 MB): non sembra una mappa esportata da Google.')
      return
    }
    setReading(true)
    try {
      setContent(await readKmzFile(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Non riesco a leggere il file.')
    } finally {
      setReading(false)
    }
  }

  async function run() {
    if (!plan || !trip || busy) return
    setBusy(true)
    setError(null)
    const { error: message, undo } = await t.importPlaces(trip.id, plan)
    setBusy(false)
    if (message) {
      setError(message)
      return
    }
    const parts = [plan.updates.length > 0 && `${plural(plan.updates.length, 'luogo aggiornato', 'luoghi aggiornati')}`, plan.fresh.length > 0 && `${plural(plan.fresh.length, 'aggiunto', 'aggiunti')}`].filter(Boolean)
    showToast(parts.join(' · ') || 'Nulla da importare', { label: 'Annulla', run: () => void undo().then((m) => showToast(m ?? 'Import annullato')) })
    reset()
  }

  const nothing = plan && plan.updates.length === 0 && plan.fresh.length === 0

  return (
    <Card>
      <h2 class="font-display text-lg font-extrabold">Importa da Google Maps</h2>
      <p class="mt-1 text-[13px] leading-snug text-muted">
        Scegli il file .kmz della tua mappa (Google My Maps → ⋮ → Esporta in KML/KMZ). I luoghi che hai già ricevono il link a Google Maps,
        quelli che mancano vengono aggiunti a «{trip.title}».
      </p>
      <input
        ref={input}
        type="file"
        accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml"
        class="sr-only"
        tabIndex={-1}
        onChange={(e) => void onFile(e)}
        aria-label="File della mappa Google"
      />
      <div class="mt-3">
        <SecondaryButton onClick={() => input.current?.click()}>{reading ? 'Leggo il file…' : plan ? 'Scegli un altro file' : 'Scegli il file .kmz'}</SecondaryButton>
      </div>

      {error && (
        <div class="mt-3">
          <FormError message={error} />
        </div>
      )}

      {plan && content && (
        <div class="mt-3 space-y-3 rounded-2xl border-2 border-line bg-bg p-4">
          <p class="text-sm text-muted">
            <span class="font-extrabold text-ink">{fileName}</span> · {plural(content.points.length, 'luogo', 'luoghi')}
            {content.skipped > 0 && ` (${plural(content.skipped, 'linea o area ignorata', 'linee o aree ignorate')})`}
          </p>
          <ul class="space-y-1.5 text-sm">
            <li>
              <span class="font-extrabold">{plan.matched}</span> già nell'app
              {plan.updates.length > 0 ? ` · ${plural(plan.updates.length, 'riceve il link', 'ricevono il link')}` : plan.matched > 0 ? ' · già a posto' : ''}
            </li>
            <li>
              <span class="font-extrabold">{plan.fresh.length}</span> da aggiungere
              {plan.newCategories.length > 0 && <span class="text-muted"> · nuove categorie: {plan.newCategories.join(', ')}</span>}
            </li>
          </ul>
          {plan.fresh.length > 0 && (
            <details class="text-sm">
              <summary class="min-h-6 cursor-pointer font-extrabold text-pale">Vedi i luoghi da aggiungere</summary>
              <ul class="mt-2 max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5">
                {plan.fresh.slice(0, 60).map((p) => (
                  <li>
                    {p.name}
                    {p.city && <span class="text-muted"> · {p.city}</span>}
                  </li>
                ))}
                {plan.fresh.length > 60 && <li class="list-none text-muted">…e altri {plan.fresh.length - 60}</li>}
              </ul>
            </details>
          )}
          {plan.withoutCoords > 0 && (
            <p class="text-xs leading-snug text-muted">
              Il file non contiene le coordinate: il link è una ricerca su Google per nome e indirizzo, che apre la scheda del luogo. I pin non vengono spostati
              {plan.fresh.length > 0 && ' e i luoghi nuovi restano senza pin'}.
            </p>
          )}
          {plan.far.length > 0 && (
            <p class="rounded-xl border-2 border-warn px-3 py-2 text-xs leading-snug">
              Controlla questi: nell'app sono a più di 2 km da dove li mette Google — {plan.far.map((f) => `${f.name} (${f.km} km)`).join(', ')}.
            </p>
          )}
          {plan.matched > 0 && (
            <label class="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" checked={replaceLinks} onChange={(e) => setReplaceLinks(e.currentTarget.checked)} class="size-5 accent-[var(--accent)]" />
              Sostituisci anche i link che i luoghi hanno già
            </label>
          )}
          {nothing ? (
            <p class="text-sm text-muted">Non c'è nulla da cambiare: i luoghi sono già tutti aggiornati.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void run()
              }}
              class="space-y-2"
            >
              <PrimaryButton busy={busy}>
                {busy ? 'Importo…' : `Importa${plan.fresh.length + plan.updates.length > 0 ? ` (${plan.fresh.length + plan.updates.length})` : ''}`}
              </PrimaryButton>
              <SecondaryButton onClick={reset}>Annulla</SecondaryButton>
            </form>
          )}
          {nothing && <SecondaryButton onClick={reset}>Chiudi</SecondaryButton>}
        </div>
      )}
    </Card>
  )
}
