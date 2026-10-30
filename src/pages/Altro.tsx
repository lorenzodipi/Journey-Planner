import { riepilogoTrasporti } from '../lib/trasporti'
import { useState } from 'react'
import { Link } from 'wouter'
import { useAuth } from '../lib/auth'
import { loadSnapshot } from '../lib/cache'
import { daysBetween, formatShort } from '../lib/dates'
import { TRAVELER_COLORS } from '../lib/tripForm'
import { useTrips } from '../state/trip'
import type { Traveler, Trip } from '../types'
import { ChevronRightG, LogoSym, PlusG, UserG } from '../ui/glyphs'
import { PageHeader } from '../ui/PageHeader'
import { Ic } from '../ui/Sprite'
import { Sheet } from '../ui/Sheet'
import { InviteForm } from '../ui/InviteForm'
import { LinkAccount } from '../ui/LinkAccount'
import { TravelerForm } from '../ui/TravelerForm'
import { ViaggioSheet } from './viaggio/ViaggioSheet'
import { AvatarStack, avColor, initialOf, plural } from './altroBits'
import { Viaggi } from './Viaggi'

const nightsOf = (t: Trip) => t.stays.reduce((n, s) => n + Math.max(0, daysBetween(s.checkIn, s.checkOut)), 0)

const sections = [
  {
    href: '/altro/alloggi',
    title: 'Alloggi',
    icon: 'i-sez-bed',
    text: (t: Trip) => (t.stays.length ? `${plural(t.stays.length, 'soggiorno', 'soggiorni')} · ${plural(nightsOf(t), 'notte', 'notti')}` : 'Hotel, check-in e check-out, costi'),
  },
  {
    href: '/altro/voli',
    title: 'Voli',
    icon: 'i-tra-plane',
    text: (t: Trip) => (t.flights.length ? `${plural(t.flights.length, 'volo', 'voli')} · ${plural(t.flights.reduce((n, f) => n + f.legs.length, 0), 'tratta', 'tratte')}` : 'Carte d\'imbarco, scali e fusi orari'),
  },
  {
    href: '/altro/trasporti',
    title: 'Trasporti',
    icon: 'i-tra-train',
    text: (t: Trip) => (t.transports.length ? riepilogoTrasporti(t.transports) : 'Treni, pass, bus e taxi'),
  },
  {
    href: '/altro/budget',
    title: 'Spese',
    icon: 'i-con-spese',
    text: (t: Trip) => (t.budget.length + t.expenses.length ? `${plural(t.budget.length, 'voce', 'voci')} · ${plural(t.expenses.length, 'spesa', 'spese')}` : 'Previsto, speso e chi deve a chi'),
  },
  {
    href: '/altro/checklist',
    title: 'Checklist e valigia',
    icon: 'i-con-organizzazione',
    text: (t: Trip) => {
      const done = t.checklist.filter((c) => c.done).length
      return t.checklist.length ? `${done} di ${t.checklist.length} fatte` : 'Cose da fare e da portare, per persona'
    },
  },
  {
    href: '/altro/prenotazioni',
    title: 'Prenotazioni e documenti',
    icon: 'i-sez-ticket',
    text: (t: Trip) => (t.bookings.length ? plural(t.bookings.length, 'prenotazione', 'prenotazioni') : 'Codici, link e biglietti, anche offline'),
  },
  {
    href: '/altro/impostazioni',
    title: 'Impostazioni del viaggio',
    icon: 'i-azi-settings',
    text: () => 'Esporta il viaggio, importa luoghi, tasso di cambio',
  },
]

type SheetState =
  | { kind: 'new-trip' }
  | { kind: 'edit-trip' }
  | { kind: 'new-traveler' }
  | { kind: 'edit-traveler'; traveler: Traveler }
  | null

export function Altro() {
  const t = useTrips()
  const auth = useAuth()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [viaggi, setViaggi] = useState(false)
  const trip = t.active
  if (!trip) return null
  const close = () => setSheet(null)
  const isOwner = trip.myRole === undefined || trip.myRole === 'owner'

  const title =
    sheet?.kind === 'new-trip'
      ? 'Nuovo viaggio'
      : sheet?.kind === 'edit-trip'
        ? 'Modifica viaggio'
        : sheet?.kind === 'new-traveler'
          ? 'Aggiungi una persona'
          : 'Modifica viaggiatore'

  const saved = loadSnapshot()?.savedAt
  const savedTime = saved ? new Date(saved).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null

  if (viaggi && sheet === null) {
    return (
      <>
        <Viaggi
          onClose={() => setViaggi(false)}
          onNew={() => {
            setViaggi(false)
            setSheet({ kind: 'new-trip' })
          }}
        />
      </>
    )
  }

  return (
    <>
      <main className="screen">
        <PageHeader
          title="Altro"
          subtitle={savedTime ? `Aggiornato alle ${savedTime}` : auth.status === 'demo' ? 'Anteprima con dati fittizi' : undefined}
          className="pad"
          actions={
            <Link href="/altro/account" className="rbtn" aria-label="Impostazioni account">
              <UserG />
            </Link>
          }
        />

        <section className="tinta t-azzurro pull" aria-label="Viaggio" style={{ padding: '20px' }}>
          <LogoSym className="logo-sym" width={50} height={59} style={{ position: 'absolute', right: '20px', top: '18px' }} />
          <p className="b-bold">Viaggio attuale</p>
          <h2 className="d-lg" style={{ marginTop: '2px', fontSize: '36px', lineHeight: '40px' }}>
            {trip.title}
          </h2>
          <p className="b-bold num" style={{ marginTop: '2px' }}>
            {formatShort(trip.startDate)} – {formatShort(trip.endDate)} · {plural(trip.days.length, 'giorno', 'giorni')}
            {trip.travelers.length > 0 && ` · ${plural(trip.travelers.length, 'persona', 'persone')}`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', gap: '12px' }}>
            <AvatarStack people={trip.travelers} />
            <div style={{ display: 'flex', gap: '8px' }}>
              {isOwner && (
                <button type="button" className="btn sm line" onClick={() => setSheet({ kind: 'edit-trip' })}>
                  Modifica
                </button>
              )}
              <button type="button" className="btn sm" onClick={() => setViaggi(true)}>
                {t.trips.length > 1 ? 'Cambia viaggio' : 'Viaggi'}
              </button>
            </div>
          </div>
        </section>

        <section aria-label="Sezioni del viaggio">
          <h2 className="h-md" style={{ marginBottom: '10px' }}>
            Il viaggio
          </h2>
          <div className="rows">
            {sections.map((sec) => (
              <Link href={sec.href} className="row" style={{ minHeight: '76px' }}>
                <Ic name={sec.icon} size={44} />
                <span className="grow">
                  <span className="tt" style={{ display: 'block', fontWeight: 700, fontSize: '17px' }}>
                    {sec.title}
                  </span>
                  <span className="mm">{sec.text(trip)}</span>
                </span>
                <span>
                  <ChevronRightG />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Persone">
          <div className="sec-h" style={{ marginBottom: '10px' }}>
            <h2 className="h-md">Viaggiatori</h2>
            {isOwner && (
              <button type="button" className="btn soft sm" onClick={() => setSheet({ kind: 'new-traveler' })}>
                <PlusG size={16} />
                Aggiungi
              </button>
            )}
          </div>
          {trip.travelers.length === 0 ? (
            <div className="card empty">
              <p className="b-sm muted">Nessun viaggiatore: aggiungi una persona con la sua email per assegnare costi e spese.</p>
            </div>
          ) : (
            <div className="rows">
              {trip.travelers.map((person, i) => (
                <div className="row" style={{ position: 'relative' }}>
                  <button type="button" className="row" style={{ flex: 1, padding: 0, border: 0, background: 'none', textAlign: 'left', minHeight: '52px' }} onClick={() => setSheet({ kind: 'edit-traveler', traveler: person })}>
                    <span className="av" style={{ background: avColor(i) }} aria-hidden="true">
                      {initialOf(person.name)}
                    </span>
                    <span className="grow">
                      <span className="tt" style={{ display: 'block' }}>
                        {person.name}
                      </span>
                      <span className="mm" style={person.userId ? undefined : { color: 'var(--danger)' }}>
                        {person.userId ? person.email : 'Senza account · da collegare'}
                      </span>
                    </span>
                    <span className="muted">
                      <ChevronRightG size={18} sw={2.2} />
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-label="Generale">
          <h2 className="h-md" style={{ marginBottom: '10px' }}>
            Generale
          </h2>
          <div className="rows">
            <Link href="/altro/account" className="row" style={{ minHeight: '76px' }}>
              <Ic name="i-sez-cloud" size={44} />
              <span className="grow">
                <span className="tt" style={{ display: 'block', fontWeight: 700, fontSize: '17px' }}>
                  Sincronizzazione
                </span>
                <span className="mm">
                  {t.pending > 0 ? `${plural(t.pending, 'modifica', 'modifiche')} in coda` : 'Tutto aggiornato · nessuna modifica in coda'}
                </span>
              </span>
              <span>
                <ChevronRightG />
              </span>
            </Link>
            <button type="button" className="row" style={{ minHeight: '76px', width: '100%', border: 0, background: 'none', textAlign: 'left' }} onClick={() => setSheet({ kind: 'new-trip' })}>
              <Ic name="i-tra-plane" size={44} />
              <span className="grow">
                <span className="tt" style={{ display: 'block', fontWeight: 700, fontSize: '17px' }}>
                  Nuovo viaggio
                </span>
                <span className="mm">Nome, date e chi viaggia</span>
              </span>
              <span>
                <ChevronRightG />
              </span>
            </button>
          </div>
        </section>
      </main>

      <ViaggioSheet key={sheet?.kind === 'edit-trip' ? trip.id : 'new'} trip={sheet?.kind === 'edit-trip' ? trip : undefined} open={sheet?.kind === 'new-trip' || sheet?.kind === 'edit-trip'} onClose={close} />
      <Sheet open={sheet?.kind === 'new-traveler' || sheet?.kind === 'edit-traveler'} title={title} onClose={close}>
        {sheet?.kind === 'new-traveler' && (
          <InviteForm
            defaultColor={TRAVELER_COLORS[trip.travelers.length % TRAVELER_COLORS.length]}
            onSubmit={(input) => t.addTraveler(trip.id, input)}
            onDone={close}
          />
        )}

        {sheet?.kind === 'edit-traveler' && (
          <div className="space-y-4">
            {sheet.traveler.email && <p className="truncate text-sm text-muted">Account: {sheet.traveler.email}</p>}
            <TravelerForm
              key={sheet.traveler.id}
              initial={sheet.traveler}
              onSubmit={(input) => t.updateTraveler(sheet.traveler.id, input)}
              onRemove={() => t.removeTraveler(sheet.traveler.id)}
              onDone={close}
            />
            {!sheet.traveler.userId && isOwner && (
              <LinkAccount onSubmit={(email) => t.linkTraveler(sheet.traveler.id, email)} onDone={close} />
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}
