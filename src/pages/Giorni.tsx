import { useState } from 'preact/hooks'
import { formatDay } from '../lib/dates'
import { useTrip, useTrips } from '../state/trip'
import type { Day } from '../types'
import { DayForm } from '../ui/DayForm'
import { ItemRow } from '../ui/ItemRow'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'

export function Giorni() {
  const trip = useTrip()
  const { updateDay } = useTrips()
  const [editing, setEditing] = useState<Day | null>(null)

  return (
    <>
      <PageHeader title="Giorni" subtitle={`${trip.days.length} giorni in programma`} />
      <div class="space-y-3 px-4">
        {trip.days.length === 0 && (
          <EmptyState
            title="Nessun giorno"
            text="Imposta le date del viaggio da Altro → Modifica viaggio: i giorni si creano da soli."
          />
        )}
        {trip.days.map((day, index) => (
          <Card class="rise">
            <button
              type="button"
              onClick={() => setEditing(day)}
              aria-label={`Modifica ${formatDay(day.date)}`}
              class="-m-1 flex min-h-12 w-[calc(100%+0.5rem)] items-center gap-3 rounded-2xl p-1 text-left"
            >
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {index + 1}
              </span>
              <span class="min-w-0 flex-1">
                <span class="font-display block truncate text-lg font-semibold leading-tight first-letter:uppercase">
                  {formatDay(day.date)}
                </span>
                <span class={`block truncate text-xs ${day.city || day.title ? 'text-muted' : 'text-accent'}`}>
                  {day.city || day.title
                    ? `${day.city}${day.city && day.title ? ' · ' : ''}${day.title ?? ''}`
                    : 'Tocca per aggiungere città e titolo'}
                </span>
              </span>
              <span class="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                {day.items.length} {day.items.length === 1 ? 'tappa' : 'tappe'}
              </span>
            </button>
            {day.notes && <p class="mt-2 whitespace-pre-line text-sm text-muted">{day.notes}</p>}
            {day.items.length > 0 && (
              <ul class="mt-2 divide-y divide-line border-t border-line">
                {day.items.map((item) => (
                  <ItemRow item={item} />
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <Sheet open={editing !== null} title="Modifica giornata" onClose={() => setEditing(null)}>
        {editing && (
          <DayForm
            key={editing.id}
            day={editing}
            onSubmit={(patch) => updateDay(editing.id, patch)}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </>
  )
}
