// Carta d'imbarco di un volo (componente Ticket, mock Fa-38 e Fa-57, #36): chiusa con codici, orari, durata totale e scali;
// aperta, per ogni tratta, Gate, Posto, Imbarco, Classe e la riga dello scalo. Il codice a barre o il QR compaiono solo
// se al volo è stato salvato un codice (#38): senza, solo la riga «Prenotazione» in testo.
import { Fragment } from 'react'
import { airportCity } from '../lib/airports'
import { formatInZone, legDuration } from '../lib/flights'
import { durataLunga, fasciaScali, riepilogoVolo } from '../lib/voli'
import { discOf, initials } from '../state/me'
import type { Flight, FlightLeg, Trip } from '../types'
import { Avatars, Pulsante } from './base'
import { cx } from './cx'
import { Sv } from './icons'

const PLANE = 'M482.3 192c34.2 0 93.7 29 93.7 64c0 36-59.5 64-93.7 64l-116.6 0L265.2 495.9c-5.7 10-16.3 16.1-27.8 16.1l-56.2 0c-10.6 0-18.3-10.2-15.4-20.4l49-171.6L112 320 68.8 377.6c-3 4-7.8 6.4-12.8 6.4l-42 0c-7.8 0-14-6.3-14-14c0-1.3 .2-2.6 .5-3.9L32 256 .5 145.9c-.4-1.3-.5-2.6-.5-3.9c0-7.8 6.3-14 14-14l42 0c5 0 9.8 2.4 12.8 6.4L112 192l102.9 0-49-171.6C162.9 10.2 170.6 0 181.2 0l56.2 0c11.5 0 22.1 6.2 27.8 16.1L365.7 192l116.6 0z'

interface Props {
  trip: Trip
  flight: Flight
  open: boolean
  onToggle: () => void
  onEdit: () => void
  /** «Mostra il codice» (#38): compare solo se il volo ha un codice salvato. */
  onCode?: () => void
  onDelete: () => void
}

/** Posto di una tratta: «14A» o, con più passeggeri, «LD 14A · MA 14B». */
function postoDi(leg: FlightLeg, trip: Trip, people: string[]): string {
  if (leg.seatsBy && Object.keys(leg.seatsBy).length > 0) {
    const parts = people.filter((id) => leg.seatsBy?.[id]).map((id) => `${people.length > 1 ? `${initials(trip.travelers.find((p) => p.id === id)?.name ?? '?')} ` : ''}${leg.seatsBy?.[id]}`)
    if (parts.length > 0) return parts.join(' · ')
  }
  return leg.seats?.trim() || '—'
}

export function CartaVolo({ trip, flight, open, onToggle, onEdit, onDelete, onCode }: Props) {
  const r = riepilogoVolo(flight)
  const scalo = fasciaScali(r.scali)
  const people = flight.forTravelers?.length ? flight.forTravelers : trip.travelers.map((p) => p.id)
  const names = people.map((id) => trip.travelers.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
  const brand = flight.airline?.trim() || 'Volo'
  const numeri = r.numeri.length > 0 ? `${flight.airline ? 'Volo ' : ''}${r.numeri.join(' · ')}` : flight.airline ? '' : flight.title
  const first = flight.legs[0]
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${airportCity(first.from)} ${first.from} aeroporto${first.terminal ? ` terminal ${first.terminal}` : ''}`)}`

  return (
    <div className="k-Ticket">
      <div className="tk">
        <div className={open ? 'a v-top' : 'a v-top closed'}>
          <div className="hd">
            <span className="brand">{flight.airline?.trim() ? brand : flight.title}</span>
            <span className="fl">{numeri}</span>
          </div>
          <div className="body">
            <button type="button" aria-expanded={open} aria-label={`${flight.title}: da ${r.fromCity} a ${r.toCity}`} onClick={onToggle} style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}>
              <div className="rt">
                <div className="pt">
                  <div className="code">{r.from}</div>
                  <div className="city">{r.fromCity}</div>
                  <div className="time">{r.departTime}</div>
                </div>
                <div className="mid">
                  <span className="dot" />
                  <span className="ln" />
                  <span className="pl">
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 576 512">
                      <path d={PLANE} fill="currentColor" />
                    </svg>
                  </span>
                  <span className="ln" />
                  <span aria-hidden="true" className="hole" />
                  <div className="dur">{r.duration}</div>
                </div>
                <div className="pt r">
                  <div className="code">{r.to}</div>
                  <div className="city">{r.toCity}</div>
                  <div className="time">
                    {r.arriveTime}
                    {r.plus > 0 ? <sup style={{ marginLeft: 2, fontSize: 12 }}>+{r.plus}</sup> : null}
                  </div>
                </div>
              </div>
              {scalo ? (
                <div className="stop">
                  <Sv name="plane" size={16} />
                  <span>
                    <b>{scalo.titolo}</b> · {scalo.resto}
                  </span>
                </div>
              ) : null}
              <div className="pax">
                <span>
                  {names.length === 1 ? (
                    <b>{names[0].name}</b>
                  ) : (
                    <Avatars people={names.map((p) => ({ initials: initials(p.name), n: discOf(trip, p.id) }))} ring={false} label={names.map((p) => p.name).join(', ')} />
                  )}
                </span>
                <span className="dt">
                  {r.date}
                  <span aria-hidden="true" className={open ? 'tgl up' : 'tgl'}>
                    <Sv name="chev" size={20} />
                  </span>
                </span>
              </div>
            </button>
          </div>
        </div>
        {open ? (
          <div className="b">
            {flight.legs.map((l, i) => {
              const prev = flight.legs[i - 1]
              const wait = prev ? r.scali[i - 1] : null
              return (
                <Fragment key={l.id}>
                  {wait ? <div className="lay">Scalo a {wait.city} · {durataLunga(wait.minutes)}</div> : null}
                  <div className="leg">
                    <div className="lh">
                      <b>
                        {airportCity(l.from)} → {airportCity(l.to)}
                        {l.flightNumber ? ` · ${l.flightNumber}` : ''}
                      </b>
                      <span>
                        {formatInZone(l.departAt, l.fromTz)} – {formatInZone(l.arriveAt, l.toTz)} · {durataLunga(legDuration({ depart: l.departAt, arrive: l.arriveAt }))}
                      </span>
                    </div>
                    <div className="grid">
                      {[
                        ['Terminal', l.terminal],
                        ['Gate', l.gate],
                        ['Posto', postoDi(l, trip, people) === '—' ? undefined : postoDi(l, trip, people)],
                        ['Imbarco', l.boardingTime],
                        ['Classe', l.cabin],
                      ]
                        .filter(([k, v]) => v || k !== 'Terminal')
                        .slice(0, 5)
                        .map(([k, v]) => (
                          <div className="f" key={k}>
                            <div className="k">{k}</div>
                            <div className="v">{v || '—'}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                </Fragment>
              )
            })}
            {flight.bookingRef ? (
              <div className={cx('bc', !onCode && 'nobar')}>
                <span className="lb">Prenotazione</span>
                <span className="cd">{flight.bookingRef}</span>
              </div>
            ) : null}
            {flight.baggage || flight.policy ? (
              <div style={{ display: 'grid', gap: 4, marginTop: 12 }}>
                {flight.baggage ? <span className="fa-m">Bagaglio · {flight.baggage}</span> : null}
                {flight.policy ? <span className="fa-m">Cambio e rimborso · {flight.policy}</span> : null}
              </div>
            ) : null}
            <div className="acts" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <Pulsante size="sm" color="secondary" iconLeading="pin" href={maps} target="_blank">
                Apri il terminal in Maps
              </Pulsante>
              {onCode ? (
                <Pulsante size="sm" color="secondary" iconLeading="qr" onPress={onCode}>
                  Mostra il codice
                </Pulsante>
              ) : null}
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
    </div>
  )
}
