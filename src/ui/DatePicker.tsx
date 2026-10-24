import { useState } from 'preact/hooks'
import { isDayBlocked, isYmd, longDay, monthBeforeMin, monthGrid, monthTitle, shiftMonth, shortDay, startMonth, WEEKDAYS } from '../lib/calendar'
import { CalendarG, ChevronLeftG, ChevronRightG } from './glyphs'
import { Sheet } from './Sheet'

interface Props {
  label: string
  /** «YYYY-MM-DD» oppure '' */
  value: string
  onInput: (value: string) => void
  /** Primo giorno scegliibile: i giorni prima sono grigi e non si possono toccare (es. «al» non prima di «dal»). */
  min?: string
  max?: string
  /** Con `optional` compare «Nessuna data» per svuotare il campo. */
  optional?: boolean
}

const todayYmd = () => new Date().toISOString().slice(0, 10)

/**
 * Selettore di data con calendario nostro. A differenza del calendario del telefono, i giorni fuori dal
 * limite (prima di `min`, dopo `max`) non si possono proprio toccare, su qualsiasi dispositivo.
 */
export function DatePicker({ label, value, onInput, min, max, optional = false }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => startMonth(value, min, todayYmd()))
  const today = todayYmd()

  function show() {
    setView(startMonth(value, min, todayYmd()))
    setOpen(true)
  }

  function pick(ymd: string) {
    onInput(ymd)
    setOpen(false)
  }

  const weeks = monthGrid(view.year, view.month)
  const prev = shiftMonth(view.year, view.month, -1)
  const next = shiftMonth(view.year, view.month, 1)
  const backBlocked = monthBeforeMin(prev.year, prev.month, min)

  return (
    <div>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${isYmd(value) ? longDay(value) : 'nessuna data'}`} onClick={show} class="fld">
        <div>
          <span class="l">{label}</span>
          <span class="v" style={{ display: 'block', color: isYmd(value) ? undefined : 'var(--ink-muted)' }}>
            {isYmd(value) ? shortDay(value) : 'Scegli la data'}
          </span>
        </div>
        <span class="muted">
          <CalendarG size={20} />
        </span>
      </button>

      <Sheet open={open} title={label} onClose={() => setOpen(false)}>
        <div class="cal-h">
          <button type="button" aria-label="Mese precedente" disabled={backBlocked} onClick={() => setView(prev)} class="rbtn">
            <ChevronLeftG size={20} />
          </button>
          <p class="cal-t" aria-live="polite">
            {monthTitle(view.year, view.month)}
          </p>
          <button type="button" aria-label="Mese successivo" onClick={() => setView(next)} class="rbtn">
            <ChevronRightG size={20} />
          </button>
        </div>

        <div role="grid" aria-label={monthTitle(view.year, view.month)}>
          <div role="row" class="cal-wd">
            {WEEKDAYS.map((d) => (
              <span role="columnheader">{d}</span>
            ))}
          </div>
          {weeks.map((week) => (
            <div role="row" class="cal-wk">
              {week.map((ymd, i) => {
                if (!ymd) return <span role="gridcell" key={i} />
                const blocked = isDayBlocked(ymd, min, max)
                const on = ymd === value
                return (
                  <span role="gridcell" key={ymd} style={{ display: 'grid', placeItems: 'center' }}>
                    <button type="button" disabled={blocked} aria-pressed={on} aria-label={longDay(ymd)} onClick={() => pick(ymd)} class={`cal-d num${on ? ' on' : ymd === today ? ' today' : ''}`}>
                      {Number(ymd.slice(8))}
                    </button>
                  </span>
                )
              })}
            </div>
          ))}
        </div>

        {isYmd(min) && <p class="b-sm muted">Non si può scegliere prima del {shortDay(min)}.</p>}
        {optional && isYmd(value) && (
          <button type="button" onClick={() => pick('')} class="btn soft block">
            Nessuna data
          </button>
        )}
      </Sheet>
    </div>
  )
}
