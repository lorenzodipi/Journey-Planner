// Biglietto lavanda di un alloggio (componente Biglietto, mock Fa-37, #39): «Alloggio · N notti», pillola Pagato / Non pagato,
// nome grande, indirizzo · città; dopo la perforazione Check-in, Check-out e Camera, il codice di prenotazione e «Apri sulla mappa».
// Al tocco si apre in linea: costo e chi ha pagato, pasti, note, Modifica, Elimina.
import { cameraDi, inclusi, notti, orarioCheck } from '../lib/alloggi'
import { formatShort } from '../lib/dates'
import { convert, formatMoney, rateFor } from '../lib/money'
import { nightsOf } from '../lib/stays'
import { discOf, initials } from '../state/me'
import type { Stay, Trip } from '../types'
import { Ic } from '../ui/Sprite'
import { Pulsante } from './base'
import { cx } from './cx'
import { Sv } from './icons'

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']

export function mappaAlloggio(s: Stay): string | null {
  if (s.mapsUrl) return s.mapsUrl
  const q = [s.name, s.address, s.city].filter(Boolean).join(' ')
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null
}


interface Props {
  trip: Trip
  stay: Stay
  open: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

export function CartaAlloggio({ trip, stay: s, open, onToggle, onEdit, onDelete }: Props) {
  const n = nightsOf(s)
  const href = mappaAlloggio(s)
  const rate = s.totalCost != null && trip.baseCurrency !== s.currency ? rateFor(trip, s.currency) : undefined
  const approx = s.totalCost != null && rate ? convert(s.totalCost, rate) : null
  const ids = s.forTravelers?.length ? s.forTravelers : trip.travelers.map((p) => p.id)
  const paidBy = trip.travelers.find((p) => p.id === s.paidBy)
  const pasti = inclusi(s)
  const indirizzo = [s.address, s.city && s.city !== s.name ? s.city : ''].filter(Boolean).join(' · ')
  return (
    <div className="k-Biglietto fa-stay">
      <article className="tk t-lavanda" aria-label={s.name}>
        <div className="top">
          <button type="button" className="hdl" aria-expanded={open} onClick={onToggle}>
            <span className="hd">
              <span className="kind">
                <Ic name="i-sez-bed-gl" size={24} />
                Alloggio · {notti(n)}
              </span>
              <span className={cx('ok', !s.paid && 'td')}>
                <Sv name={s.paid ? 'check' : 'clock'} size={16} />
                {s.paid ? 'Pagato' : 'Non pagato'}
              </span>
            </span>
            <span className="nm">{s.name}</span>
            {indirizzo ? <span className="ad">{indirizzo}</span> : null}
            <Sv name="chev" size={20} className={cx('chv', open && 'up')} />
          </button>
          <div className="f3">
            <div>
              <span className="k">Check-in</span>
              <b>{formatShort(s.checkIn)}</b>
              <em>{orarioCheck(s.checkInInfo, 'in') || '—'}</em>
            </div>
            <div>
              <span className="k">Check-out</span>
              <b>{formatShort(s.checkOut)}</b>
              <em>{orarioCheck(s.checkOutInfo, 'out') || '—'}</em>
            </div>
            <div>
              <span className="k">Camera</span>
              <b>{cameraDi(s)}</b>
            </div>
          </div>
        </div>
        <div className="bot">
          <div className="fr">
            <span>
              <span className="k">Codice di prenotazione</span>
              <b className="cd">{s.bookingCode || '—'}</b>
            </span>
            {href ? (
              <Pulsante size="sm" color="secondary" iconLeading="pin" href={href} target="_blank" aria-label={`Apri ${s.name} sulla mappa`}>
                Apri sulla mappa
              </Pulsante>
            ) : null}
          </div>
          {open ? (
            <div className="dt">
              <dl className="dl">
                <div>
                  <dt>Costo</dt>
                  <dd>{s.totalCost == null ? 'Non ancora inserito' : approx != null ? `${formatMoney(s.totalCost, s.currency)} ≈ ${formatMoney(approx, trip.baseCurrency)}` : formatMoney(s.totalCost, s.currency)}</dd>
                </div>
                {paidBy ? (
                  <div>
                    <dt>Pagato da</dt>
                    <dd>{paidBy.name.split(/\s+/)[0]}</dd>
                  </div>
                ) : null}
                {ids.length > 0 && trip.travelers.length > 1 ? (
                  <div>
                    <dt>Per chi</dt>
                    <dd>
                      <span aria-hidden="true" className="avs">
                        {ids.slice(0, 4).map((id) => (
                          <span key={id} style={{ background: `var(--disco-${COL[(discOf(trip, id) - 1) % 5]})` }}>
                            {initials(trip.travelers.find((p) => p.id === id)?.name ?? '?')}
                          </span>
                        ))}
                      </span>
                      {ids.length === trip.travelers.length ? ' Tutti' : ` ${ids.length} persone`}
                    </dd>
                  </div>
                ) : null}
                {pasti ? (
                  <div>
                    <dt>Pasti e servizi</dt>
                    <dd>{pasti}</dd>
                  </div>
                ) : null}
                {s.notes ? (
                  <div>
                    <dt>Nota</dt>
                    <dd style={{ whiteSpace: 'pre-line' }}>{s.notes}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="acts2">
                <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={onEdit}>
                  Modifica
                </Pulsante>
                <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={onDelete}>
                  Elimina
                </Pulsante>
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  )
}

