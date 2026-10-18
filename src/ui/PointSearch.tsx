import { useEffect, useState } from 'preact/hooks'
import { searchPlaces, type GeoResult } from '../lib/geocode'
import { parseMapsUrl } from '../lib/mapsUrl'

export interface Point {
  lat: number
  lng: number
}

interface Props {
  label: string
  /** Testo del campo "Da"/"A": serve come ricerca se non si scrive altro. */
  fallbackQuery: string
  near: Point
  value: Point | null
  onChange: (value: Point | null) => void
}

/** Cerca un punto (es. una stazione) con OpenStreetMap e ne salva la posizione. Facoltativo. */
export function PointSearch({ label, fallbackQuery, near, value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [linkHint, setLinkHint] = useState<{ ok: boolean; text: string } | null>(null)
  // se la posizione viene rimossa, si svuota anche il link incollato
  useEffect(() => {
    if (!value) {
      setLink('')
      setLinkHint(null)
    }
  }, [value])
  const text = (query.trim() || fallbackQuery.trim()).trim()

  async function search() {
    if (!text) return
    setBusy(true)
    setError(null)
    try {
      const found = await searchPlaces(text, near)
      setResults(found)
      if (found.length === 0) setError('Nessun risultato. Prova con un nome più preciso (es. «Tokyo Station»).')
    } catch (e) {
      setResults(null)
      setError(e instanceof Error ? e.message : 'Ricerca non riuscita. Controlla la connessione.')
    } finally {
      setBusy(false)
    }
  }

  function pick(r: GeoResult) {
    onChange({ lat: Number(r.lat.toFixed(6)), lng: Number(r.lng.toFixed(6)) })
    setResults(null)
    setError(null)
  }

  function onLink(value: string) {
    setLink(value)
    if (!value.trim()) return setLinkHint(null)
    const info = parseMapsUrl(value)
    if (info) {
      onChange({ lat: Number(info.lat.toFixed(6)), lng: Number(info.lng.toFixed(6)) })
      setResults(null)
      setError(null)
      setLinkHint({ ok: true, text: 'Posizione letta dal link.' })
    } else {
      setLinkHint({
        ok: false,
        text: 'Non trovo le coordinate in questo link. I link corti (maps.app.goo.gl) non si leggono: apri il link e incolla quello lungo dalla barra del browser, oppure usa la ricerca qui sopra.',
      })
    }
  }

  return (
    <div class="rounded-2xl border-2 border-line p-3">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-extrabold">{label}</p>
        {value ? (
          <button type="button" onClick={() => onChange(null)} class="min-h-11 rounded-full px-3 text-sm text-muted">
            Rimuovi
          </button>
        ) : (
          <span class="text-xs text-muted">non impostata</span>
        )}
      </div>
      {value && <p class="text-xs text-muted">Posizione impostata ({value.lat.toFixed(4)}, {value.lng.toFixed(4)})</p>}
      <div class="mt-2 flex gap-2">
        <input
          type="text"
          value={query}
          placeholder={fallbackQuery.trim() || 'Es. Tokyo Station'}
          aria-label={`Cerca ${label.toLowerCase()}`}
          onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void search()
            }
          }}
          class="min-h-12 min-w-0 flex-1 rounded-[14px] border-2 border-line bg-bg px-4"
        />
        <button
          type="button"
          disabled={busy || !text}
          onClick={() => void search()}
          class="min-h-12 shrink-0 rounded-full bg-accent px-4 text-sm font-extrabold text-accent-ink disabled:opacity-50"
        >
          {busy ? 'Cerco…' : 'Cerca'}
        </button>
      </div>
      {error && (
        <p class="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {results && results.length > 0 && (
        <ul class="mt-2 divide-y divide-line rounded-2xl border-2 border-line">
          {results.map((r) => (
            <li>
              <button type="button" onClick={() => pick(r)} class="block min-h-12 w-full px-3 py-2 text-left text-sm">
                <span class="block font-extrabold">{r.name}</span>
                <span class="block truncate text-xs text-muted">{r.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <label class="mt-3 block">
        <span class="mb-1 block text-xs font-extrabold text-muted">Oppure incolla un link di Google Maps</span>
        <input
          type="url"
          value={link}
          placeholder="https://www.google.com/maps/place/…"
          aria-label={`Link di Google Maps: ${label.toLowerCase()}`}
          onInput={(e) => onLink((e.currentTarget as HTMLInputElement).value)}
          class="min-h-12 w-full rounded-[14px] border-2 border-line bg-bg px-4"
        />
      </label>
      {linkHint && (
        <p class={`mt-2 text-sm ${linkHint.ok ? 'text-muted' : 'text-danger'}`} role={linkHint.ok ? 'status' : 'alert'}>
          {linkHint.text}
        </p>
      )}
    </div>
  )
}
