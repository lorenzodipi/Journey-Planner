import { useState } from 'preact/hooks'
import { isDayBlocked, isYmd, longDay, monthBeforeMin, monthGrid, monthTitle, shiftMonth, shortDay, startMonth, WEEKDAYS } from '../lib/calendar'
import { CalendarIcon, ChevronRightIcon } from './Icons'
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
    <div class="block">
      <span class="mb-1 block text-[13px] font-extrabold">{label}</span>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${isYmd(value) ? longDay(value) : 'nessuna data'}`}
        onClick={show}
        class="flex min-h-12 w-full items-center gap-2 rounded-[14px] border-2 border-line bg-bg px-3.5 text-left text-base"
      >
        <span class={`min-w-0 flex-1 truncate ${isYmd(value) ? '' : 'text-muted/70'}`}>{isYmd(value) ? shortDay(value) : 'Scegli la data'}</span>
        <CalendarIcon size={18} class="shrink-0 text-muted" />
      </button>

      <Sheet open={open} title={label} onClose={() => setOpen(false)}>
        <div class="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Mese precedente"
            disabled={backBlocked}
            onClick={() => setView(prev)}
            class="grid size-11 place-items-center rounded-full border-2 border-line text-pale disabled:opacity-30"
          >
            <ChevronRightIcon size={16} class="rotate-180" />
          </button>
          <p class="text-base font-extrabold capitalize" aria-live="polite">
            {monthTitle(view.year, view.month)}
          </p>
          <button type="button" aria-label="Mese successivo" onClick={() => setView(next)} class="grid size-11 place-items-center rounded-full border-2 border-line text-pale">
            <ChevronRightIcon size={16} />
          </button>
        </div>

        <div role="grid" aria-label={monthTitle(view.year, view.month)} class="mt-3">
          <div role="row" class="grid grid-cols-7 text-center text-xs font-extrabold text-muted">
            {WEEKDAYS.map((d) => (
              <span role="columnheader" class="py-1">
                {d}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div role="row" class="grid grid-cols-7">
              {week.map((ymd, i) => {
                if (!ymd) return <span role="gridcell" key={i} />
                const blocked = isDayBlocked(ymd, min, max)
                const on = ymd === value
                return (
                  <span role="gridcell" key={ymd} class="grid place-items-center">
                    <button
                      type="button"
                      disabled={blocked}
                      aria-pressed={on}
                      aria-label={longDay(ymd)}
                      onClick={() => pick(ymd)}
                      class={`grid size-11 place-items-center rounded-full text-[15px] tabular-nums ${
                        on
                          ? 'bg-accent font-extrabold text-white'
                          : blocked
                            ? 'text-muted/40 line-through decoration-1'
                            : ymd === today
                              ? 'border-2 border-accent font-extrabold'
                              : 'font-bold'
                      }`}
                    >
                      {Number(ymd.slice(8))}
                    </button>
                  </span>
                )
              })}
            </div>
          ))}
        </div>

        {isYmd(min) && <p class="mt-2 text-xs text-muted">Non si può scegliere prima del {shortDay(min)}.</p>}
        {optional && isYmd(value) && (
          <button type="button" onClick={() => pick('')} class="mt-2 min-h-11 px-1 text-sm font-extrabold text-muted">
            Nessuna data
          </button>
        )}
      </Sheet>
    </div>
  )
}
