import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { formatDay } from '../lib/dates'
import { canSwap } from '../lib/itemOrder'
import { useTrip } from '../state/trip'
import { DaySheet, type DaySheetState } from '../ui/DaySheet'
import { ItemRow } from '../ui/ItemRow'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { useItemActions } from '../ui/useItemActions'

export function Giorni() {
  const trip = useTrip()
  const actions = useItemActions()
  const [sheet, setSheet] = useState<DaySheetState>(null)
  const [reordering, setReordering] = useState<string | null>(null) // id del giorno in riordino


  return (
    <>
      <PageHeader title="Giorni" subtitle={`${trip.days.length} giorni in programma · tocca un giorno per aprirlo`} />
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
              <Link
                href={`/giorni/${day.id}`}
                aria-label={`Apri ${formatDay(day.date)}`}
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
                <span aria-hidden="true" class="text-xl text-muted">›</span>
              </Link>

              {day.notes && <p class="mt-2 whitespace-pre-line text-sm text-muted">{day.notes}</p>}

              {isReordering && (
                <p class="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent">
                  Le tappe con un orario seguono l'orario: per spostarne una, cambia il suo orario. Le altre si spostano con le frecce.
                </p>
              )}
              {day.items.length > 0 && (
                <ul class="mt-2 divide-y divide-line border-t border-line">
                  {day.items.map((item, i) => (
                    <ItemRow
                      item={item}
                      n={i + 1}
                      onOpen={isReordering ? undefined : () => setSheet({ kind: 'edit-item', day, item })}
                      onToggleDone={isReordering ? undefined : () => void actions.toggleDone(item)}
                      onDelete={() => actions.remove(item)}
                      reorder={
                        isReordering
                          ? {
                              onUp: i > 0 && canSwap(day.items[i - 1], item) ? () => void actions.move(day.id, item, -1) : undefined,
                              onDown: i < day.items.length - 1 && canSwap(item, day.items[i + 1]) ? () => void actions.move(day.id, item, 1) : undefined,
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

      {actions.dialog}
      <DaySheet trip={trip} state={sheet} onChange={setSheet} />
    </>
  )
}
