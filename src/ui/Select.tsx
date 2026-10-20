import { useMemo, useState } from 'preact/hooks'
import { CheckIcon, ChevronDownIcon, SearchIcon } from './Icons'
import { Sheet } from './Sheet'

export interface SelectOption {
  value: string
  label: string
  /** Seconda riga più piccola (es. la città di un luogo). */
  hint?: string
  /** Pallino colorato davanti all'etichetta. */
  color?: string
}

interface Props {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  /** Campo di ricerca nel pannello. Di base compare da 8 opzioni in su. */
  searchable?: boolean
  /** Si può scrivere un valore che non è nell'elenco (compare "Usa «…»"). */
  creatable?: boolean
  /** Testo della riga che crea il valore scritto (di base «Usa «…»»). */
  createLabel?: (typed: string) => string
  /** Sfondo del campo: `surface` dentro riquadri chiari. */
  tone?: 'bg' | 'surface'
  /** Solo lettura: il valore si vede ma non si cambia (non apre il pannello, senza freccia). */
  readOnly?: boolean
  /** Riga in fondo all'elenco che fa altro (es. «+ Altra valuta…»): chiude il pannello e lancia l'azione. */
  extra?: { label: string; onPick: () => void }
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Selettore a pannello (al posto della <select> del sistema): righe grandi da toccare con il pollice,
 * la voce scelta è spuntata, con ricerca quando l'elenco è lungo.
 */
export function Select({ label, value, options, onChange, placeholder = 'Scegli…', searchable, creatable, createLabel, tone = 'bg', readOnly, extra }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((o) => o.value === value)
  const shownLabel = selected?.label ?? (creatable && value ? value : '')
  const withSearch = searchable ?? (creatable || options.length > 8)

  const q = norm(query.trim())
  const filtered = useMemo(
    () => (q ? options.filter((o) => norm(`${o.label} ${o.hint ?? ''}`).includes(q)) : options),
    [options, q],
  )
  const canCreate = creatable && query.trim() !== '' && !options.some((o) => norm(o.label) === q || norm(o.value) === q)

  function close() {
    setOpen(false)
    setQuery('')
  }
  function pick(v: string) {
    onChange(v)
    close()
  }

  return (
    <div class="block">
      <span class="mb-1 block text-sm font-extrabold">{label}</span>
      {readOnly ? (
        <div
          role="textbox"
          aria-readonly="true"
          aria-label={label}
          class={`flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 border-line px-4 text-left text-muted ${tone === 'surface' ? 'bg-surface' : 'bg-bg'}`}
        >
          <span class="min-w-0 flex-1 truncate">{shownLabel || placeholder}</span>
        </div>
      ) : (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          class={`flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 border-line px-4 text-left ${tone === 'surface' ? 'bg-surface' : 'bg-bg'}`}
        >
          {selected?.color && <span aria-hidden="true" class="h-3 w-3 shrink-0 rounded-full" style={{ background: selected.color }} />}
          <span class={`min-w-0 flex-1 truncate ${shownLabel ? '' : 'text-muted'}`}>{shownLabel || placeholder}</span>
          <ChevronDownIcon size={18} class="shrink-0 text-muted" />
        </button>
      )}

      <Sheet open={open && !readOnly} title={label} onClose={close}>
        {withSearch && (
          <label class="relative mb-3 block">
            <span class="sr-only">Cerca</span>
            <SearchIcon size={18} class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
              placeholder="Cerca…"
              autoComplete="off"
              enterkeyhint="search"
              class="min-h-12 w-full rounded-2xl border-2 border-line bg-bg pl-11 pr-4"
              onKeyDown={(e) => {
                // Invio non deve inviare il modulo che sta sotto
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (canCreate) pick(query.trim())
                  else if (filtered.length === 1) pick(filtered[0].value)
                }
              }}
            />
          </label>
        )}
        <ul role="listbox" aria-label={label} class="-mx-2 max-h-[55dvh] overflow-y-auto overscroll-contain">
          {canCreate && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => pick(query.trim())}
                class="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left font-extrabold text-accent"
              >
                {createLabel ? createLabel(query.trim()) : `Usa «${query.trim()}»`}
              </button>
            </li>
          )}
          {filtered.map((o) => {
            const on = o.value === value
            return (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => pick(o.value)}
                  class={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ${on ? 'bg-accent-soft' : ''}`}
                >
                  {o.color && <span aria-hidden="true" class="h-3 w-3 shrink-0 rounded-full" style={{ background: o.color }} />}
                  <span class="min-w-0 flex-1">
                    <span class={`block truncate ${on ? 'font-extrabold text-accent' : 'font-extrabold'}`}>{o.label}</span>
                    {o.hint && <span class="block truncate text-xs text-muted">{o.hint}</span>}
                  </span>
                  {on && <CheckIcon size={20} class="shrink-0 text-accent" />}
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && !canCreate && <li class="px-3 py-4 text-sm text-muted">Nessun risultato.</li>}
          {extra && (
            <li class="mt-1.5 border-t-2 border-line pt-1.5">
              <button
                type="button"
                onClick={() => {
                  close()
                  extra.onPick()
                }}
                class="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left font-extrabold text-accent"
              >
                {extra.label}
              </button>
            </li>
          )}
        </ul>
      </Sheet>
    </div>
  )
}
