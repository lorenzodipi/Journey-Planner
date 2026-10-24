import { useLocation } from 'wouter-preact'
import { useAuth } from '../lib/auth'
import { daysBetween, formatShort } from '../lib/dates'
import { tripToday } from '../lib/today'
import { useTrips } from '../state/trip'
import type { Trip } from '../types'
import { ART } from '../ui/art'
import { ArrowRightG, PlusG, UserG } from '../ui/glyphs'
import { PageHeader } from '../ui/PageHeader'
import { AvatarStack, namesOf, plural } from './altroBits'

const TINTS = ['azzurro', 'menta', 'lavanda', 'confetto', 'limone'] as const

const cities = (t: Trip) => [...new Set(t.days.map((d) => d.city).filter(Boolean))]

/** Scelta del viaggio (Fw3-Viaggi): i viaggi in corso o in arrivo come biglietti colorati, quelli conclusi come riquadri semplici. */
export function Viaggi({ onClose, onNew }: { onClose: () => void; onNew: () => void }) {
  const t = useTrips()
  const auth = useAuth()
  const [, navigate] = useLocation()
  const name = auth.session?.user.email?.split('@')[0]
  const greeting = name ? `Ciao ${name.charAt(0).toUpperCase()}${name.slice(1)}` : 'I tuoi viaggi'

  const state = (trip: Trip) => {
    const today = tripToday(trip)
    const toStart = daysBetween(today, trip.startDate)
    const toEnd = daysBetween(today, trip.endDate)
    return { toStart, over: toEnd < 0, live: toStart <= 0 && toEnd >= 0 }
  }
  const open = (id: string, to: string) => {
    t.setActive(id)
    onClose()
    navigate(to)
  }
  let tint = 0

  return (
    <main class="screen">
      <PageHeader
        title={greeting}
        subtitle="Quale viaggio vuoi aprire?"
        back={{ href: '/altro', label: 'Altro' }}
        actions={
          <a class="rbtn" href="#/altro/account" aria-label="Il tuo account">
            <UserG />
          </a>
        }
      />
      <section aria-label="I tuoi viaggi" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {t.trips.map((trip) => {
          const s = state(trip)
          const people = trip.travelers
          const places = cities(trip)
          if (s.over) {
            return (
              <article class="card" aria-label={trip.title} style={{ padding: '20px' }}>
                <div class="tr" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <h2 class="h-lg">{trip.title}</h2>
                    <p class="b-bold num" style={{ marginTop: '2px' }}>
                      {formatShort(trip.startDate)} – {formatShort(trip.endDate)} · {plural(trip.days.length, 'giorno', 'giorni')}
                    </p>
                    <p class="b-sm" style={{ marginTop: '2px' }}>
                      {[places.length ? plural(places.length, 'città', 'città') : '', people.length ? plural(people.length, 'persona', 'persone') : ''].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span class="sp idle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                    </svg>
                    Concluso
                  </span>
                </div>
                <button type="button" class="btn soft block" style={{ marginTop: '16px', background: 'var(--surface-high)', color: 'var(--ink)' }} onClick={() => open(trip.id, '/')}>
                  Rivedi il riepilogo
                </button>
              </article>
            )
          }
          const c = TINTS[tint++ % TINTS.length]
          const when = s.live ? 'In corso' : s.toStart === 1 ? 'Domani' : `Tra ${s.toStart} giorni`
          return (
            <article class={`trip t-${c} tinta cori`} style={{ background: `var(--tinta-${c})` }} aria-label={trip.title}>
              <div class="trip-scene">
                <img src={ART.partenza} alt="" />
                <span class="badge now">{when}</span>
              </div>
              <h2 class="d-lg" style={{ marginTop: '16px', fontSize: '36px', lineHeight: '40px', position: 'relative' }}>
                {trip.title}
              </h2>
              <p class="b-bold num" style={{ position: 'relative', marginTop: '2px' }}>
                {formatShort(trip.startDate)} – {formatShort(trip.endDate)} · {plural(trip.days.length, 'giorno', 'giorni')}
              </p>
              {places.length > 0 && (
                <p class="b-sm" style={{ marginTop: '8px' }}>
                  {places.length > 1 ? `${places.slice(0, -1).join(', ')} e ${places[places.length - 1]}` : places[0]}
                </p>
              )}
              {people.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                  <AvatarStack people={people} />
                  <span class="b-sm">{namesOf(people)}</span>
                </div>
              )}
              <button type="button" class="btn block" style={{ marginTop: '20px' }} onClick={() => open(trip.id, '/')}>
                Apri il viaggio
                <ArrowRightG />
              </button>
            </article>
          )
        })}
        <button type="button" class="dashbtn" onClick={onNew}>
          <PlusG size={22} />
          Nuovo viaggio
        </button>
      </section>
      <p class="b-sm" style={{ textAlign: 'center' }}>
        Puoi cambiare viaggio quando vuoi da Altro.
      </p>
    </main>
  )
}
