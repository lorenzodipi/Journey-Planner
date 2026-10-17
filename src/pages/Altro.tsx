import { useState } from 'preact/hooks'
import { useAuth } from '../lib/auth'
import { formatShort } from '../lib/dates'
import { TRAVELER_COLORS } from '../lib/tripForm'
import { useTrips } from '../state/trip'
import type { Traveler } from '../types'
import { SecondaryButton } from '../ui/Field'
import { Card, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'
import { ShareForm } from '../ui/ShareForm'
import { TravelerForm } from '../ui/TravelerForm'
import { TripForm } from '../ui/TripForm'

const upcoming = [
  { title: 'Alloggi', text: 'Hotel, check-in e check-out, costi', sprint: 3 },
  { title: 'Trasporti e voli', text: 'Treni, pass, voli con scali e fusi orari', sprint: 3 },
  { title: 'Budget e spese', text: 'Previsto, speso e da pagare, in EUR e JPY', sprint: 3 },
  { title: 'Checklist e valigia', text: 'Cose da fare e da portare, per persona', sprint: 3 },
  { title: 'Prenotazioni e documenti', text: 'Codici, link e biglietti, anche offline', sprint: 3 },
  { title: 'Impostazioni', text: 'Tasso di cambio, esporta i dati', sprint: 4 },
]

type SheetState =
  | { kind: 'new-trip' }
  | { kind: 'edit-trip' }
  | { kind: 'delete-trip' }
  | { kind: 'share' }
  | { kind: 'new-traveler' }
  | { kind: 'edit-traveler'; traveler: Traveler }
  | null

export function Altro() {
  const t = useTrips()
  const auth = useAuth()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const trip = t.active
  if (!trip) return null
  const close = () => setSheet(null)

  const title =
    sheet?.kind === 'new-trip'
      ? 'Nuovo viaggio'
      : sheet?.kind === 'edit-trip'
        ? 'Modifica viaggio'
        : sheet?.kind === 'delete-trip'
          ? 'Eliminare il viaggio?'
          : sheet?.kind === 'share'
            ? 'Condividi il viaggio'
            : sheet?.kind === 'new-traveler'
            ? 'Nuovo viaggiatore'
            : 'Modifica viaggiatore'

  return (
    <>
      <PageHeader title="Altro" subtitle="Tutto il resto del viaggio" />
      <div class="space-y-3 px-4">
        <Card>
          <p class="text-xs font-medium uppercase tracking-wide text-muted">Viaggio attivo</p>
          <h2 class="font-display mt-1 text-xl font-semibold leading-tight">{trip.title}</h2>
          <p class="text-sm text-muted">
            {trip.destination && `${trip.destination} · `}
            {formatShort(trip.startDate)} – {formatShort(trip.endDate)} · {trip.days.length} giorni
          </p>

          {t.trips.length > 1 && (
            <ul class="mt-3 space-y-1" aria-label="Cambia viaggio">
              {t.trips.map((other) => (
                <li>
                  <button
                    type="button"
                    aria-pressed={other.id === trip.id}
                    onClick={() => t.setActive(other.id)}
                    class={`min-h-11 w-full rounded-2xl px-4 text-left text-sm font-medium ${
                      other.id === trip.id ? 'bg-accent-soft text-accent' : 'text-muted'
                    }`}
                  >
                    {other.title}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div class="mt-4 grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setSheet({ kind: 'edit-trip' })}>Modifica</SecondaryButton>
            <SecondaryButton onClick={() => setSheet({ kind: 'new-trip' })}>Nuovo viaggio</SecondaryButton>
          </div>
        </Card>

        <Card>
          <div class="mb-2 flex items-center justify-between">
            <h2 class="font-display text-lg font-semibold">Viaggiatori</h2>
            <button
              type="button"
              onClick={() => setSheet({ kind: 'new-traveler' })}
              class="min-h-11 rounded-full px-3 text-sm font-medium text-accent"
            >
              + Aggiungi
            </button>
          </div>
          {trip.travelers.length === 0 ? (
            <p class="py-2 text-sm text-muted">Nessun viaggiatore: aggiungine uno per assegnare costi e spese.</p>
          ) : (
            <ul class="divide-y divide-line">
              {trip.travelers.map((person) => (
                <li>
                  <button
                    type="button"
                    onClick={() => setSheet({ kind: 'edit-traveler', traveler: person })}
                    class="flex min-h-14 w-full items-center gap-3 text-left"
                  >
                    <span aria-hidden="true" class="h-4 w-4 shrink-0 rounded-full" style={{ background: person.color }} />
                    <span class="min-w-0 flex-1 truncate font-medium">{person.name}</span>
                    <span class="text-xs text-muted">Modifica</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 class="font-display text-lg font-semibold">Accesso</h2>
          <p class="mt-1 text-sm text-muted">
            Chi ha un account può vedere e modificare questo viaggio. Crea prima l'utente su Supabase, poi aggiungilo qui con la sua email.
          </p>
          <div class="mt-3">
            <SecondaryButton onClick={() => setSheet({ kind: 'share' })}>Dai accesso a una persona</SecondaryButton>
          </div>
        </Card>

        <Card class="!p-0">
          <ul class="divide-y divide-line">
            {upcoming.map((s) => (
              <li class="flex min-h-16 items-center gap-3 px-4 py-3 opacity-80">
                <div class="min-w-0 flex-1">
                  <p class="font-medium">{s.title}</p>
                  <p class="truncate text-xs text-muted">{s.text}</p>
                </div>
                <span class="shrink-0 rounded-full bg-line px-2.5 py-1 text-[11px] font-medium text-muted">
                  Sprint {s.sprint}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          {auth.status === 'demo' && (
            <p class="text-sm text-muted">Anteprima con dati fittizi: Supabase non è ancora collegato.</p>
          )}
          {auth.status === 'signed-in' && (
            <>
              <p class="truncate text-sm text-muted">Accesso come {auth.session?.user.email}</p>
              <button
                type="button"
                onClick={() => void auth.signOut()}
                class="mt-3 min-h-11 w-full rounded-full border border-line px-4 text-sm font-medium text-danger"
              >
                Esci
              </button>
            </>
          )}
        </Card>
      </div>

      <Sheet open={sheet !== null} title={title} onClose={close}>
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

        {sheet?.kind === 'share' && <ShareForm onSubmit={(email) => t.addMember(trip.id, email, 'editor')} onDone={close} />}

        {sheet?.kind === 'new-traveler' && (
          <TravelerForm
            defaultColor={TRAVELER_COLORS[trip.travelers.length % TRAVELER_COLORS.length]}
            onSubmit={(input) => t.addTraveler(trip.id, input)}
            onDone={close}
          />
        )}

        {sheet?.kind === 'edit-traveler' && (
          <TravelerForm
            key={sheet.traveler.id}
            initial={sheet.traveler}
            onSubmit={(input) => t.updateTraveler(sheet.traveler.id, input)}
            onRemove={() => t.removeTraveler(sheet.traveler.id)}
            onDone={close}
          />
        )}
      </Sheet>
    </>
  )
}
