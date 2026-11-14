// Biglietto lavanda di un alloggio (componente Biglietto, mock Fa-37, #39): «Alloggio · N notti», pillola Pagato / Non pagato,
// nome grande, indirizzo · città; dopo la perforazione Check-in, Check-out e Camera, il codice di prenotazione e «Apri sulla mappa».
// Al tocco si apre in linea: costo e chi ha pagato, pasti, note, Modifica, Elimina.
import { cameraDi, inclusi, notti, orarioCheck } from '../lib/alloggi'
import { formatShort } from '../lib/dates'
import { convert, formatMoney, rateFor } from '../lib/money'
import { nightsOf } from '../lib/stays'
import type { Stay, Trip } from '../types'
import { Ic } from '../ui/Sprite'
import { Pulsante } from './base'
import { cx } from './cx'
import { Sv } from './icons'
import { PersoneRiga, stessePersone } from './Persone'
import { RigaApribile } from './Righe'

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
  /** visualizzatore (0049): niente «Pagato», costo, «Pagato da», Modifica ed Elimina */
  lettura?: boolean
}

export function CartaAlloggio({ trip, stay: s, open, onToggle, onEdit, onDelete, lettura }: Props) {
  const n = nightsOf(s)
  const href = mappaAlloggio(s)
  const rate = s.totalCost != null && trip.baseCurrency !== s.currency ? rateFor(trip, s.currency) : undefined
  const approx = s.totalCost != null && rate ? convert(s.totalCost, rate) : null
  const ids = s.forTravelers?.length ? s.forTravelers : trip.travelers.map((p) => p.id)
  // «Diviso tra» è un dato sul costo: il visualizzatore non lo vede e vede sempre «Dormono qui»
  const perChi = !lettura && ids.length > 0 && trip.travelers.length > 1
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
              {lettura ? null : (
                <span className={cx('ok', !s.paid && 'td')}>
                  <Sv name={s.paid ? 'check' : 'clock'} size={16} />
                  {s.paid ? 'Pagato' : 'Non pagato'}
                </span>
              )}
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
                Maps
              </Pulsante>
            ) : null}
          </div>
          {open ? (
            <div className="dt">
              <dl className="dl">
                {lettura ? null : (
                  <div>
                    <dt>Costo</dt>
                    <dd>{s.totalCost == null ? 'Non ancora inserito' : approx != null ? `${formatMoney(s.totalCost, s.currency)} ≈ ${formatMoney(approx, trip.baseCurrency)}` : formatMoney(s.totalCost, s.currency)}</dd>
                  </div>
                )}
                {paidBy && !lettura ? (
                  <div>
                    <dt>Pagato da</dt>
                    <dd>{paidBy.name.split(/\s+/)[0]}</dd>
                  </div>
                ) : null}
                {perChi ? (
                  <div>
                    <dt>Diviso tra</dt>
                    <dd>
                      <PersoneRiga trip={trip} ids={ids} />
                    </dd>
                  </div>
                ) : null}
                {s.guests ? (
                  <div>
                    <dt>Ospiti</dt>
                    <dd>{s.guests}</dd>
                  </div>
                ) : null}
                {/* «Dormono qui» solo se sono persone diverse da «Per chi» (altrimenti è una ripetizione) */}
                {s.participants?.length && !(perChi && stessePersone(s.participants, ids)) ? (
                  <div>
                    <dt>Dormono qui</dt>
                    <dd>
                      <PersoneRiga trip={trip} ids={s.participants} />
                    </dd>
                  </div>
                ) : null}
                {s.phone ? (
                  <div>
                    <dt>Telefono</dt>
                    <dd><a className="fa-lnk" href={`tel:${s.phone.replace(/\s+/g, '')}`}>{s.phone}</a></dd>
                  </div>
                ) : null}
                {s.email ? (
                  <div>
                    <dt>Email</dt>
                    <dd><a className="fa-lnk" href={`mailto:${s.email}`}>{s.email}</a></dd>
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
              {lettura ? null : (
                <div className="acts2">
                  <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={onEdit}>
                    Modifica
                  </Pulsante>
                  <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={onDelete}>
                    Elimina
                  </Pulsante>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  )
}


/** Versione compatta per la pagina del giorno: una riga («Check-in», «Check-out» o «Si dorme qui») che si apre sui dettagli essenziali. */
export function RigaAlloggio({ stay: s, date, open, onToggle, onEdit, onDelete, lettura }: Omit<Props, 'stay'> & { stay: Stay; date: string }) {
  const href = mappaAlloggio(s)
  const ruolo = s.checkOut === date ? 'Check-out' : s.checkIn === date ? 'Check-in' : 'Si dorme qui'
  const orario = s.checkOut === date ? orarioCheck(s.checkOutInfo, 'out') : s.checkIn === date ? orarioCheck(s.checkInInfo, 'in') : ''
  return (
    <RigaApribile icon="i-sez-bed" title={s.name} sub={[ruolo, orario || null, s.city && s.city !== s.name ? s.city : null].filter(Boolean).join(' · ')} open={open} onToggle={onToggle}>
      <dl className="fa-dlc">
        <div>
          <dt>Soggiorno</dt>
          <dd>{formatShort(s.checkIn)} → {formatShort(s.checkOut)} · {notti(nightsOf(s))}</dd>
        </div>
        {s.address ? (
          <div>
            <dt>Indirizzo</dt>
            <dd>{s.address}</dd>
          </div>
        ) : null}
        {s.bookingCode ? (
          <div>
            <dt>Codice</dt>
            <dd>{s.bookingCode}</dd>
          </div>
        ) : null}
        {cameraDi(s) !== '—' ? (
          <div>
            <dt>Camera</dt>
            <dd>{cameraDi(s)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="fa-acts">
        {href ? (
          <Pulsante size="sm" color="secondary" iconLeading="pin" href={href} target="_blank" aria-label={`Apri ${s.name} sulla mappa`}>
            Maps
          </Pulsante>
        ) : null}
        {lettura ? null : (
          <>
            <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={onEdit}>
              Modifica
            </Pulsante>
            <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={onDelete}>
              Elimina
            </Pulsante>
          </>
        )}
      </div>
    </RigaApribile>
  )
}
