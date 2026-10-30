// Foglio «Sposta in un altro giorno» (mock Fa-15 chiaro): giorni con numero, data, città e tappe;
// il giorno attuale evidenziato. Lo stesso foglio serve per «Rimandata» (#32).
import { useState } from 'react'
import { parseYmd } from '../../lib/dates'
import type { Day, Trip } from '../../types'
import { Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'

const wdm = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const fmt = (ymd: string) => wdm.format(parseYmd(ymd)).replace(/\./g, '')

export function SpostaSheet({ trip, current, open, title = 'Sposta in un altro giorno', action = 'Sposta qui', onClose, onMove, preferCity }: { trip: Trip; current: Day; open: boolean; title?: string; action?: string; onClose: () => void; onMove: (dayId: string) => Promise<string | null>; preferCity?: string }) {
  const [sel, setSel] = useState(current.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const days = preferCity
    ? [...trip.days].sort((a, b) => Number((b.city || '').toLowerCase() === preferCity.toLowerCase()) - Number((a.city || '').toLowerCase() === preferCity.toLowerCase()))
    : trip.days

  async function go() {
    if (sel === current.id) return onClose()
    setBusy(true)
    const m = await onMove(sel)
    setBusy(false)
    if (m) setError(m)
    else onClose()
  }

  return (
    <Foglio open={open} title={title} onClose={onClose} plain>
      <div role="radiogroup" aria-label="Giorni del viaggio" style={{ display: 'grid', maxHeight: '50vh', overflow: 'auto' }}>
        {days.map((d) => {
          const n = trip.days.indexOf(d) + 1
          const on = d.id === sel
          return (
            <button key={d.id} type="button" role="radio" aria-checked={on} className="r" style={{ gridTemplateColumns: '44px 1fr auto', background: 'none', border: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => setSel(d.id)}>
              <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: on ? 'var(--azzurro-solid)' : 'var(--surface-high)', color: on ? 'var(--on-azzurro-solid)' : 'var(--ink)', font: '600 18px/20px var(--font-sans)' }}>{n}</span>
              <span>
                <span className="t" style={{ display: 'block' }}>
                  Giorno {n} · {fmt(d.date)}
                </span>
                <span className="m" style={{ display: 'block' }}>
                  {[d.city, `${d.items.length} ${d.items.length === 1 ? 'tappa' : 'tappe'}`].filter(Boolean).join(' · ')}
                </span>
              </span>
              {on ? (
                <span style={{ color: 'var(--azzurro-ink)' }}>
                  <Sv name="check" />
                </span>
              ) : (
                <span />
              )}
            </button>
          )
        })}
      </div>
      {error ? (
        <span className="fa-help bad" role="alert">
          <Sv name="err" size={16} />
          {error}
        </span>
      ) : null}
      <div className="bt">
        <Pulsante onPress={() => void go()} isLoading={busy}>
          {action}
        </Pulsante>
        <Pulsante color="secondary-soft" onPress={onClose}>
          Annulla
        </Pulsante>
      </div>
    </Foglio>
  )
}
