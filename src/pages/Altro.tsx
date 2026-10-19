import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { useAuth } from '../lib/auth'
import { formatShort } from '../lib/dates'
import { TRAVELER_COLORS } from '../lib/tripForm'
import { useTrips } from '../state/trip'
import type { Traveler, Trip } from '../types'
import { SecondaryButton } from '../ui/Field'
import { BedIcon, BudgetIcon, ChecklistIcon, ChevronRightIcon, SettingsIcon, TicketIcon, TrainCarIcon } from '../ui/Icons'
import { PageHeader } from '../ui/PageHeader'
import { isJapanTrip } from '../lib/tripLocale'
import { BoardingNotches, Disc, Jp, Stripe } from '../ui/Ticket'
import { Sheet } from '../ui/Sheet'
import { InviteForm } from '../ui/InviteForm'
import { LinkAccount } from '../ui/LinkAccount'
import { TravelerForm } from '../ui/TravelerForm'
import { TrashButton } from '../ui/ConfirmDialog'
import { useDeleter } from '../ui/useDeleter'
import { TripForm } from '../ui/TripForm'

const sections = [
  {
    href: '/altro/alloggi',
    title: 'Alloggi',
    color: '#ffa23a',
    Icon: BedIcon,
    text: (t: Trip) => (t.stays.length ? `${t.stays.length} ${t.stays.length === 1 ? 'alloggio' : 'alloggi'}` : 'Hotel, check-in e check-out, costi'),
  },
  {
    href: '/altro/trasporti',
    title: 'Trasporti e voli',
    color: '#3fd0e8',
    Icon: TrainCarIcon,
    text: (t: Trip) =>
      t.flights.length + t.transports.length
        ? `${t.flights.length} ${t.flights.length === 1 ? 'volo' : 'voli'} · ${t.transports.length} ${t.transports.length === 1 ? 'spostamento' : 'spostamenti'}`
        : 'Treni, pass, voli con scali e fusi orari',
  },
  {
    href: '/altro/budget',
    title: 'Budget e spese',
    color: '#2cc48a',
    Icon: BudgetIcon,
    text: (t: Trip) => (t.budget.length + t.expenses.length ? `${t.budget.length} voci · ${t.expenses.length} spese` : 'Previsto, speso e chi deve a chi'),
  },
  {
    href: '/altro/checklist',
    title: 'Checklist e valigia',
    color: '#3d86ff',
    Icon: ChecklistIcon,
    text: (t: Trip) => {
      const done = t.checklist.filter((c) => c.done).length
      return t.checklist.length ? `${done} di ${t.checklist.length} fatte` : 'Cose da fare e da portare, per persona'
    },
  },
  {
    href: '/altro/prenotazioni',
    title: 'Prenotazioni e documenti',
    color: '#b58cff',
    Icon: TicketIcon,
    text: (t: Trip) => (t.bookings.length ? `${t.bookings.length} ${t.bookings.length === 1 ? 'prenotazione' : 'prenotazioni'}` : 'Codici, link e biglietti, anche offline'),
  },
  {
    href: '/altro/impostazioni',
    title: 'Impostazioni',
    color: '#f472b6',
    Icon: SettingsIcon,
    text: () => 'Esporta e ripristina i dati, copia sul telefono, info',
  },
]

type SheetState =
  | { kind: 'pick-trip' }
  | { kind: 'new-trip' }
  | { kind: 'edit-trip' }
  | { kind: 'delete-trip' }
  | { kind: 'new-traveler' }
  | { kind: 'edit-traveler'; traveler: Traveler }
  | null

export function Altro() {
  const t = useTrips()
  const auth = useAuth()
  const [del, delDialog] = useDeleter()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [tripFilter, setTripFilter] = useState('')
  const trip = t.active
  if (!trip) return null
  const close = () => setSheet(null)
  const isOwner = trip.myRole === undefined || trip.myRole === 'owner'

  const title =
    sheet?.kind === 'pick-trip'
      ? 'Scegli il viaggio'
      : sheet?.kind === 'new-trip'
      ? 'Nuovo viaggio'
      : sheet?.kind === 'edit-trip'
        ? 'Modifica viaggio'
        : sheet?.kind === 'delete-trip'
          ? 'Eliminare il viaggio?'
          : sheet?.kind === 'new-traveler'
            ? 'Aggiungi una persona'
            : 'Modifica viaggiatore'

  return (
    <>
      <PageHeader title="Altro" jp={isJapanTrip(trip) ? '設定' : undefined} />
      <div class="px-5">
        <section class="rise relative rounded-[20px] border-2 border-line bg-surface">
          <Stripe />
          <div class="px-[18px] pb-3.5 pt-3">
            <div class="flex justify-between">
              <span class="text-[13px] text-muted">Viaggio attivo</span>
              {isJapanTrip(trip) && <Jp>日本</Jp>}
            </div>
            <h2 class="font-display text-[28px] font-extrabold leading-tight tracking-[-0.5px]">{trip.title}</h2>
            <p class="mt-0.5 text-[13px] text-muted">
              {trip.destination && `${trip.destination} · `}
              {formatShort(trip.startDate)} – {formatShort(trip.endDate)} · {trip.days.length} giorni
            </p>
            {t.trips.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setTripFilter('')
                  setSheet({ kind: 'pick-trip' })
                }}
                class="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl bg-accent-soft px-4 text-sm font-extrabold text-pale"
              >
                <span>Cambia viaggio</span>
                <span class="flex items-center gap-1 text-muted">
                  {t.trips.length} viaggi
                  <ChevronRightIcon size={16} />
                </span>
              </button>
            )}
          </div>
          <BoardingNotches />
          <div class="grid grid-cols-2 border-t-2 border-dashed border-line">
            <button type="button" onClick={() => setSheet({ kind: 'edit-trip' })} class="min-h-[52px] text-[15px] font-extrabold text-pale">
              Modifica
            </button>
            <button type="button" onClick={() => setSheet({ kind: 'new-trip' })} class="min-h-[52px] border-l-2 border-dashed border-line text-[15px] font-extrabold text-pale">
              Nuovo viaggio
            </button>
          </div>
        </section>

        <section class="mt-4 rounded-2xl border-2 border-line bg-surface px-4 py-1.5">
          <div class="flex min-h-12 items-center justify-between">
            <h2 class="font-display text-lg font-extrabold">Viaggiatori</h2>
            {isOwner && (
              <button type="button" onClick={() => setSheet({ kind: 'new-traveler' })} class="min-h-11 px-1 text-sm font-extrabold text-pale">
                + Aggiungi
              </button>
            )}
          </div>
          {trip.travelers.length === 0 ? (
            <p class="border-t-2 border-dashed border-line py-3 text-sm text-muted">Nessun viaggiatore: aggiungi una persona con la sua email per assegnare costi e spese.</p>
          ) : (
            <ul>
              {trip.travelers.map((person) => (
                <li class="flex items-center border-t-2 border-dashed border-line">
                  <button type="button" onClick={() => setSheet({ kind: 'edit-traveler', traveler: person })} class="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 text-left">
                    <span aria-hidden="true" class="size-4 shrink-0 rounded-full" style={{ background: person.color }} />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-base font-extrabold">{person.name}</span>
                      {person.userId ? (
                        person.email && <span class="block truncate text-xs text-muted">{person.email}</span>
                      ) : (
                        <span class="block text-xs text-danger">Senza account · da collegare</span>
                      )}
                    </span>
                  </button>
                  {isOwner && (
                    <TrashButton
                      label={`Rimuovi ${person.name} dal viaggio`}
                      onClick={() =>
                        void del({
                          title: `Rimuovere ${person.name} dal viaggio?`,
                          text: 'Le spese già assegnate a questa persona restano nel database ma non saranno più visibili. Non si può annullare.',
                          confirmLabel: 'Rimuovi',
                          done: `${person.name} rimosso dal viaggio`,
                          run: () => t.removeTraveler(person.id),
                        })
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* pila di carte come nel Wallet: ogni voce ha la linguetta del suo colore */}
        <ul class="mt-5">
          {sections.map((sec, i) => {
            const last = i === sections.length - 1
            return (
              <li class="relative" style={{ zIndex: i + 1, marginTop: i ? '-50px' : 0 }}>
                <Link
                  href={sec.href}
                  class="block box-border rounded-[18px] border-2 border-line bg-surface px-[18px] py-3 shadow-[0_-4px_12px_rgb(0_0_0/0.35)]"
                  style={{ borderTop: `8px solid ${sec.color}`, height: last ? '112px' : '126px' }}
                >
                  <span class="flex items-center gap-3">
                    <Disc color={sec.color}>
                      <sec.Icon size={22} />
                    </Disc>
                    <span class="min-w-0 flex-1">
                      <span class="block text-[17px] font-extrabold">{sec.title}</span>
                      <span class="block truncate text-xs text-muted">{sec.text(trip)}</span>
                    </span>
                    <ChevronRightIcon size={18} class="shrink-0 text-muted" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        <section class="mt-[18px] flex items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-3">
          {auth.status === 'demo' && <p class="text-sm text-muted">Anteprima con dati fittizi: Supabase non è ancora collegato.</p>}
          {auth.status === 'signed-in' && (
            <>
              <div class="min-w-0 flex-1">
                <p class="text-[13px] text-muted">Accesso come</p>
                <p class="truncate text-sm font-extrabold">{auth.session?.user.email}</p>
              </div>
              <button type="button" onClick={() => void auth.signOut()} class="min-h-11 rounded-full border-2 border-line px-4 text-sm font-extrabold">
                Esci
              </button>
            </>
          )}
        </section>
      </div>

      {delDialog}
      <Sheet open={sheet !== null} title={title} onClose={close}>
        {sheet?.kind === 'pick-trip' && (
          <div class="space-y-3">
            {t.trips.length > 6 && (
              <input
                type="search"
                value={tripFilter}
                onInput={(e) => setTripFilter(e.currentTarget.value)}
                placeholder="Cerca un viaggio"
                aria-label="Cerca un viaggio"
                class="min-h-12 w-full rounded-[14px] border-2 border-line bg-bg px-4"
              />
            )}
            {(() => {
              const q = tripFilter.trim().toLowerCase()
              const list = t.trips.filter((x) => !q || `${x.title} ${x.destination}`.toLowerCase().includes(q))
              if (list.length === 0) return <p class="py-4 text-center text-sm text-muted">Nessun viaggio con questo nome.</p>
              return (
                <ul class="space-y-2" aria-label="Viaggi">
                  {list.map((other) => {
                    const current = other.id === trip.id
                    return (
                      <li>
                        <button
                          type="button"
                          aria-current={current}
                          onClick={() => {
                            t.setActive(other.id)
                            close()
                          }}
                          class={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-2 text-left ${current ? 'border-accent bg-accent-soft' : 'border-line'}`}
                        >
                          <span class="min-w-0 flex-1">
                            <span class={`block truncate text-base font-extrabold ${current ? 'text-pale' : ''}`}>{other.title}</span>
                            <span class="block truncate text-xs text-muted">
                              {other.destination && `${other.destination} · `}
                              {formatShort(other.startDate)} – {formatShort(other.endDate)}
                            </span>
                          </span>
                          {current && <span class="shrink-0 text-xs font-extrabold text-pale">Attivo</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )
            })()}
          </div>
        )}

        {sheet?.kind === 'new-trip' && <TripForm onSubmit={t.createTrip} onDone={close} />}

        {sheet?.kind === 'edit-trip' && (
          <div class="space-y-4">
            <TripForm trip={trip} onSubmit={(input) => t.updateTrip(trip.id, input)} onDone={close} />
            <SecondaryButton
              danger
              onClick={() => {
                setDeleteError(null)
                setSheet({ kind: 'delete-trip' })
              }}
            >
              Elimina viaggio
            </SecondaryButton>
          </div>
        )}

        {sheet?.kind === 'delete-trip' && (
          <div class="space-y-3">
            <p class="text-sm text-muted">
              «{trip.title}» sparirà dall'elenco. I dati non vengono cancellati subito dal database, quindi si possono
              ancora recuperare dalla dashboard di Supabase.
            </p>
            {deleteError && (
              <p role="alert" class="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
                {deleteError}
              </p>
            )}
            <SecondaryButton
              danger
              onClick={async () => {
                const message = await t.deleteTrip(trip.id)
                if (message) setDeleteError(message)
                else close()
              }}
            >
              Sì, elimina
            </SecondaryButton>
            <SecondaryButton onClick={close}>Annulla</SecondaryButton>
          </div>
        )}

        {sheet?.kind === 'new-traveler' && (
          <InviteForm
            defaultColor={TRAVELER_COLORS[trip.travelers.length % TRAVELER_COLORS.length]}
            onSubmit={(input) => t.addTraveler(trip.id, input)}
            onDone={close}
          />
        )}

        {sheet?.kind === 'edit-traveler' && (
          <div class="space-y-4">
            {sheet.traveler.email && <p class="truncate text-sm text-muted">Account: {sheet.traveler.email}</p>}
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
