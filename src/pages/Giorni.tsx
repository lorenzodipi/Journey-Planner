import { useState } from 'preact/hooks'
import { formatDay } from '../lib/dates'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { Day, DayItem } from '../types'
import { DayForm } from '../ui/DayForm'
import { ItemForm } from '../ui/ItemForm'
import { ItemRow } from '../ui/ItemRow'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'

type SheetState =
  | { kind: 'day'; day: Day }
  | { kind: 'new-item'; day: Day }
  | { kind: 'edit-item'; day: Day; item: DayItem }
  | null

export function Giorni() {
  const trip = useTrip()
  const t = useTrips()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [reordering, setReordering] = useState<string | null>(null) // id del giorno in riordino
  const close = () => setSheet(null)

  async function move(day: Day, item: DayItem, step: -1 | 1) {
    const message = await t.moveItem(day.id, item.id, step)
    if (message) showToast(message)
  }

  async function toggleDone(item: DayItem) {
    const message = await t.setItemDone(item.id, !item.done)
    if (message) showToast(message)
  }

  const sheetTitle =
    sheet?.kind === 'day' ? 'Modifica giornata' : sheet?.kind === 'new-item' ? 'Nuova tappa' : 'Modifica tappa'

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
        {trip.days.map((day, index) => {
          const isReordering = reordering === day.id
          return (
            <Card class="rise">
              <button
                type="button"
                onClick={() => setSheet({ kind: 'day', day })}
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
                  <span class="block truncate text-xs text-muted">
                    {day.city || day.title
                      ? `${day.city}${day.city && day.title ? ' · ' : ''}${day.title ?? ''}`
                      : 'Aggiungi città e titolo'}
                  </span>
                </span>
                {day.items.length > 0 && (
                  <span class="text-xs tabular-nums text-muted">
                    {day.items.length} {day.items.length === 1 ? 'tappa' : 'tappe'}
                  </span>
                )}
              </button>

              {day.notes && <p class="mt-2 whitespace-pre-line text-sm text-muted">{day.notes}</p>}

              {day.items.length > 0 && (
                <ul class="mt-2 divide-y divide-line border-t border-line">
                  {day.items.map((item, i) => (
                    <ItemRow
                      item={item}
                      onOpen={isReordering ? undefined : () => setSheet({ kind: 'edit-item', day, item })}
                      onToggleDone={isReordering ? undefined : () => void toggleDone(item)}
                      reorder={
                        isReordering
                          ? {
                              onUp: i > 0 ? () => void move(day, item, -1) : undefined,
                              onDown: i < day.items.length - 1 ? () => void move(day, item, 1) : undefined,
                            }
                          : undefined
                      }
                    />
                  ))}
                </ul>
              )}

              <div class="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
                <button
                  type="button"
                  onClick={() => setSheet({ kind: 'new-item', day })}
                  class="min-h-11 rounded-full px-3 text-sm font-medium text-accent"
                >
                  + Tappa
                </button>
                {day.items.length > 1 && (
                  <button
                    type="button"
                    aria-pressed={isReordering}
                    onClick={() => setReordering(isReordering ? null : day.id)}
                    class="min-h-11 rounded-full px-3 text-sm font-medium text-muted"
                  >
                    {isReordering ? 'Fine' : 'Riordina'}
                  </button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Sheet open={sheet !== null} title={sheetTitle} onClose={close}>
        {sheet?.kind === 'day' && (
          <DayForm
            key={sheet.day.id}
            day={sheet.day}
            onSubmit={(patch) => t.updateDay(sheet.day.id, patch)}
            onDone={close}
          />
        )}
        {sheet?.kind === 'new-item' && (
          <ItemForm trip={trip} onSubmit={(input) => t.createItem(trip.id, sheet.day.id, input)} onDone={close} />
        )}
        {sheet?.kind === 'edit-item' && (
          <ItemForm
            key={sheet.item.id}
            trip={trip}
            initial={sheet.item}
            onSubmit={(input) => t.updateItem(sheet.item.id, input)}
            onDelete={async () => {
              const id = sheet.item.id
              const message = await t.setItemDeleted(id, true)
              if (!message) showToast('Tappa eliminata', { label: 'Annulla', run: () => void t.setItemDeleted(id, false) })
              return message
            }}
            onDone={close}
          />
        )}
      </Sheet>
    </>
  )
}
