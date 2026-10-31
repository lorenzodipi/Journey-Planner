// Card del luogo (componenti Luoghi / LuoghiAperti, mock Fa-16…Fa-21): disco della categoria, nome, città,
// stato, Maps sempre cliccabile; aperta in linea con durata, orari, note, «Aggiungi a una tappa» (scelta del
// giorno in linea) o «Aggiunto al Giorno N · Cambia», Modifica ed Elimina.
import { ora } from '../lib/formati'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { categoryIcon } from '../lib/categoryIcon'
import { parseYmd } from '../lib/dates'
import { mapsLinkFor } from '../lib/mapsUrl'
import { openingParts } from '../lib/opening'
import { durata } from '../lib/tappa'
import { STATO_LUOGO, statoLuogo, tappaDelLuogo } from '../lib/luoghi'
import type { Place, Trip } from '../types'
import { Ic } from '../ui/Sprite'
import { cx } from './cx'
import { G } from './Tappe'

const wdm = (ymd: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(parseYmd(ymd)).replace(/\./g, '')

export const discOfPlace = (p: Pick<Place, 'category'>) => {
  const icon = categoryIcon(p.category)
  return `i-cat-${icon === 'pin' ? 'pin' : icon}`
}

interface Props {
  trip: Trip
  place: Place
  open: boolean
  onToggle: () => void
  onAddToDay: (dayId: string) => Promise<void>
  onChangeDay: () => void
  onEdit: () => void
  onDelete: () => void
  /** In selezione multipla: la riga seleziona invece di aprirsi. */
  selecting?: boolean
  selected?: boolean
  onSelect?: () => void
  /** Pressione lunga sulla card: entra in selezione multipla. */
  onLongPress?: () => void
  /** Al posto del disco della categoria (es. la foto del luogo nella Mappa). */
  lead?: ReactNode
  /** Riga in fondo ai dettagli (es. il credito della foto). */
  foot?: ReactNode
}

export function LuogoCard({ trip, place, open, onToggle, onAddToDay, onChangeDay, onEdit, onDelete, selecting, selected, onSelect, onLongPress, lead, foot }: Props) {
  const stato = statoLuogo(trip, place)
  const s = STATO_LUOGO[stato]
  const tappa = tappaDelLuogo(trip, place.id)
  const [picking, setPicking] = useState(false)
  const [day, setDay] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const opening = openingParts(place.openingSpec)
  const days = [...trip.days].sort((a, b) => Number((b.city || '').toLowerCase() === place.city.toLowerCase()) - Number((a.city || '').toLowerCase() === place.city.toLowerCase()))
  const chosen = trip.days.find((d) => d.id === day)
  const press = useRef<{ t: number; x: number; y: number; fired: boolean } | null>(null)
  const longPress = onLongPress && !selecting
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          const t = window.setTimeout(() => {
            if (press.current) press.current.fired = true
            navigator.vibrate?.(10)
            onLongPress()
          }, 500)
          press.current = { t, x: e.clientX, y: e.clientY, fired: false }
        },
        onPointerMove: (e: React.PointerEvent) => {
          const p = press.current
          if (p && !p.fired && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) window.clearTimeout(p.t)
        },
        onPointerUp: () => press.current && window.clearTimeout(press.current.t),
        onPointerCancel: () => press.current && window.clearTimeout(press.current.t),
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {}
  const click = () => {
    if (press.current?.fired) {
      press.current = null
      return
    }
    if (selecting) onSelect?.()
    else onToggle()
  }

  return (
    <div className={cx('pl', open && 'open', selected && 'fa-sel')}>
      <div className="ph">
        <button type="button" className="tg" aria-expanded={selecting ? undefined : open} aria-pressed={selecting ? selected : undefined} onClick={click} {...longPress}>
          {selecting ? (
            <span className={cx('fa-cbx', selected && 'on')} aria-hidden="true">
              {selected ? <G name="g-check" /> : null}
            </span>
          ) : (
            (lead ?? <Ic name={discOfPlace(place)} size={44} className="d" />)
          )}
          <span className="tx">
            <b>{place.name}</b>
            {place.city ? (
              <span className="ct">
                <G name="g-pin" />
                {place.city}
              </span>
            ) : null}
            <span className={cx('st', s.cls)}>
              <G name={s.icon} />
              {s.label}
            </span>
            {place.lat == null ? <span className="fa-c">Non sulla mappa</span> : null}
          </span>
          {selecting ? null : (
            <span className="chv">
              <G name="g-chev" />
            </span>
          )}
        </button>
        {selecting ? null : (
          <a aria-label={`Apri ${place.name} su Maps`} className="btn mp" href={mapsLinkFor(place)} target="_blank" rel="noopener noreferrer">
            <G name="g-pinout" />
            Maps
          </a>
        )}
      </div>
      {open && !selecting ? (
        <div className="dt">
          {place.visitMinutes ? (
            <div className="rw">
              <span className="ri">
                <G name="g-hour" />
              </span>
              <div className="rx">
                <div className="rm">Ci si ferma {durata(place.visitMinutes)}</div>
                <div className="rs">Tempo previsto</div>
              </div>
            </div>
          ) : null}
          {opening || place.openingHours ? (
            <div className="rw">
              <span className="ri">
                <G name="g-clock" />
              </span>
              <div className="rx">
                <div className="rm">{opening ? opening.main : place.openingHours}</div>
                {opening?.sub ? <div className="rs">{opening.sub}</div> : null}
              </div>
            </div>
          ) : null}
          {place.note ? (
            <div className="rw">
              <span className="ri">
                <G name="g-note" />
              </span>
              <div className="rx">
                <div className="rm">
                  <span className="nt" style={{ fontWeight: 400, whiteSpace: 'pre-line' }}>
                    {place.note}
                  </span>
                </div>
                <div className="rs">Note</div>
              </div>
            </div>
          ) : null}
          {stato === 'skipped' ? null : tappa ? (
            <div className="rw">
              <span className="ri">
                <G name="g-cal" />
              </span>
              <div className="rx">
                <div className="rm">Aggiunto al Giorno {tappa.dayIndex + 1}</div>
                <div className="rs">{[wdm(trip.days[tappa.dayIndex].date), ora(tappa.item.time)].filter(Boolean).join(' · ')}</div>
              </div>
              <button type="button" className="btn sec" onClick={onChangeDay}>
                Cambia
              </button>
            </div>
          ) : trip.days.length > 0 ? (
            <div className="add">
              <div className="k">Aggiungi a una tappa</div>
              <button type="button" className="fld" aria-expanded={picking} aria-haspopup="listbox" onClick={() => setPicking(!picking)}>
                <span className="fi">
                  <G name="g-cal" />
                </span>
                <span className="fx">
                  <span className="fl">Giorno</span>
                  <span className={cx('fv', !chosen && 'pk')}>{chosen ? `Giorno ${trip.days.indexOf(chosen) + 1} · ${wdm(chosen.date)}` : 'Scegli il giorno'}</span>
                </span>
                <span className="sc">
                  <G name="g-chev" />
                </span>
              </button>
              {picking ? (
                <div className="menu">
                  <div className="mh">Scegli il giorno</div>
                  <ul role="listbox" aria-label="Giorno" style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 320, overflow: 'auto' }}>
                    {days.map((d) => {
                      const n = trip.days.indexOf(d) + 1
                      const on = d.id === day
                      return (
                        <li
                          key={d.id}
                          role="option"
                          tabIndex={0}
                          aria-selected={on}
                          className={cx('op', on && 'on')}
                          onClick={() => (setDay(d.id), setPicking(false))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setDay(d.id)
                              setPicking(false)
                            }
                          }}
                        >
                          <span className="dn">{n}</span>
                          <span className="ox">
                            <b>
                              Giorno {n} · {wdm(d.date)}
                            </b>
                            <span>{[d.city, `${d.items.length} ${d.items.length === 1 ? 'tappa' : 'tappe'}`].filter(Boolean).join(' · ')}</span>
                          </span>
                          {on ? <G name="g-check" /> : null}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
              <button
                type="button"
                className="btn pri"
                style={{ width: '100%' }}
                disabled={!day || busy}
                onClick={async () => {
                  if (!day) return setPicking(true)
                  setBusy(true)
                  await onAddToDay(day)
                  setBusy(false)
                  setDay(null)
                }}
              >
                <G name="g-plus" />
                Aggiungi al giorno
              </button>
            </div>
          ) : null}
          <div className="acts">
            <button type="button" className="btn sec" onClick={onEdit}>
              <G name="g-pencil" />
              Modifica
            </button>
            <button type="button" className="btn del" onClick={onDelete}>
              <G name="g-trash" />
              Elimina
            </button>
          </div>
          {foot}
        </div>
      ) : null}
    </div>
  )
}
