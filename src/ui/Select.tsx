import { useMemo, useState } from 'preact/hooks'
import { CheckG, ChevronDownG, SearchG } from './glyphs'
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
export function Select({ label, value, options, onChange, placeholder = 'Scegli…', searchable, creatable, createLabel, readOnly, extra }: Props) {
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
    <div>
      {readOnly ? (
        <div role="textbox" aria-readonly="true" aria-label={label} class="fld ro">
          <div>
            <span class="l">{label}</span>
            <span class="v" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shownLabel || placeholder}</span>
          </div>
        </div>
      ) : (
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} class="fld">
          <div>
            <span class="l">{label}</span>
            <span class="v" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: shownLabel ? undefined : 'var(--ink-muted)' }}>
              {selected?.color && <span aria-hidden="true" class="dot" style={{ background: selected.color, width: '12px', height: '12px', borderRadius: '9999px', flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shownLabel || placeholder}</span>
            </span>
          </div>
          <span class="muted">
            <ChevronDownG size={20} />
          </span>
        </button>
      )}

      <Sheet open={open && !readOnly} title={label} onClose={close}>
        {withSearch && (
          <label class="fld">
            <div>
              <span class="l">Cerca</span>
              <input
                type="search"
                value={query}
                onInput={(e) => setQuery(e.currentTarget.value)}
                placeholder="Cerca…"
                autoComplete="off"
                enterkeyhint="search"
                class="v"
                onKeyDown={(e) => {
                  // Invio non deve inviare il modulo che sta sotto
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (canCreate) pick(query.trim())
                    else if (filtered.length === 1) pick(filtered[0].value)
                  }
                }}
              />
            </div>
            <span class="muted">
              <SearchG size={20} />
            </span>
          </label>
        )}
        <ul role="listbox" aria-label={label} class="sel-list">
          {canCreate && (
            <li>
              <button type="button" role="option" aria-selected="false" onClick={() => pick(query.trim())} class="sel-opt" style={{ color: 'var(--azzurro-ink)' }}>
                {createLabel ? createLabel(query.trim()) : `Usa «${query.trim()}»`}
              </button>
            </li>
          )}
          {filtered.map((o) => {
            const on = o.value === value
            return (
              <li>
                <button type="button" role="option" aria-selected={on} onClick={() => pick(o.value)} class={`sel-opt${on ? ' on' : ''}`}>
                  {o.color && <span aria-hidden="true" class="dot" style={{ background: o.color }} />}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                    {o.hint && <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.hint}</small>}
                  </span>
                  {on && <CheckG size={20} sw={2.8} />}
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && !canCreate && <li style={{ padding: '16px 12px', color: 'var(--ink-muted)' }}>Nessun risultato.</li>}
          {extra && (
            <li style={{ marginTop: '6px', borderTop: '1px solid var(--hairline)', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  close()
                  extra.onPick()
                }}
                class="sel-opt"
                style={{ color: 'var(--azzurro-ink)' }}
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
