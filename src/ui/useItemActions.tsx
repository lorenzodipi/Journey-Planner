import type { ComponentChildren } from 'preact'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import type { DayItem } from '../types'
import { useDeleter } from './useDeleter'

/** Azioni sulle tappe di un giorno (riordina, segna fatta, elimina con conferma), uguali in "Giorni" e nella pagina del giorno. */
export function useItemActions(): {
  move: (dayId: string, item: DayItem, step: -1 | 1) => Promise<void>
  toggleDone: (item: DayItem) => Promise<void>
  remove: (item: DayItem) => void
  dialog: ComponentChildren
} {
  const t = useTrips()
  const [del, dialog] = useDeleter()
  return {
    async move(dayId, item, step) {
      const message = await t.moveItem(dayId, item.id, step)
      if (message) showToast(message)
    },
    async toggleDone(item) {
      const message = await t.setItemDone(item.id, !item.done)
      if (message) showToast(message)
    },
    remove(item) {
      void del({
        title: `Eliminare «${item.title}»?`,
        done: 'Tappa eliminata',
        run: () => t.setItemDeleted(item.id, true),
        undo: () => t.setItemDeleted(item.id, false),
      })
    },
    dialog,
  }
}
