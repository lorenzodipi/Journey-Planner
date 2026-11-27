// Le azioni su una categoria di spesa (previsto, nome, eliminazione), usate dalla pagina Budget quando si tocca una categoria.
import type { ReactNode } from 'react'
import { formatMoney } from '../../lib/money'
import type { RigaCategoria } from '../../lib/ricevuta'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import { useConferma } from '../../faraway/Foglio'
import type { AzioniCategoria } from '../../faraway/PrevistoCategoria'
import type { Trip } from '../../types'
import { nomeCategoria, t as tt } from '../../i18n'

export function useAzioniCategoria(trip: Trip, meId: string | undefined): AzioniCategoria & { confirmNode: ReactNode } {
  const t = useTrips()
  const [ask, confirmNode] = useConferma()
  const cur = trip.baseCurrency
  const me = meId ? { id: meId } : undefined
    async function onPlanned(c: RigaCategoria, planned: number | null, travelerId?: string) {
      if (!travelerId) {
        const m = await t.setExpenseCategoryPlanned(trip.id, c.label, planned)
        if (!m) showToast(planned === null ? tt('Previsto di {label} calcolato dai costi', { label: c.label }) : tt('Previsto di {label}: {v1}', { label: c.label, v1: formatMoney(planned, cur) }))
        return m
      }
      const mio = travelerId === me?.id
      const chi = trip.travelers.find((x) => x.id === travelerId)?.name.split(/\s+/)[0] ?? ''
      const m = await t.setTravelerCategoryPlanned(trip.id, c.label, travelerId, planned)
      if (!m)
        showToast(
          planned === null
            ? mio
              ? tt('Il tuo previsto di {label} torna alla stima dai costi', { label: nomeCategoria(c.label) })
              : tt('Il previsto di {nome} per {label} torna alla stima dai costi', { nome: chi, label: nomeCategoria(c.label) })
            : mio
              ? tt('Il tuo previsto di {label}: {v1}', { label: nomeCategoria(c.label), v1: formatMoney(planned, cur) })
              : tt('Previsto di {nome} per {label}: {v1}', { nome: chi, label: nomeCategoria(c.label), v1: formatMoney(planned, cur) }),
        )
      return m
    }
    async function onRename(c: RigaCategoria, label: string) {
      return c.id ? t.renameExpenseCategory(trip.id, c.id, label) : null
    }
    async function onDelete(c: RigaCategoria) {
      if (!c.id) return
      if (c.nSpese > 0) {
        // una categoria in uso non si elimina: si archivia (resta sulle spese già fatte, non si propone più)
        const archivia = await ask({
          title: tt('«{label}» è usata da {nSpese} {v2}', { label: c.label, nSpese: c.nSpese, v2: c.nSpese === 1 ? tt('spesa') : tt('spese') }),
          message: tt('Non si può eliminare finché è in uso. Spostale prima in un’altra categoria, oppure archivia questa: resta sulle spese già fatte ma non si propone più.'),
          confirm: tt('Archivia la categoria'),
          cancel: tt('Lascia stare'),
          destructive: false,
        })
        if (!archivia) return
        const m = await t.setExpenseCategoryArchived(c.id, true)
        showToast(m ?? tt('Categoria archiviata'), m ? undefined : { label: tt('Annulla'), run: () => void t.setExpenseCategoryArchived(c.id as string, false) })
        return
      }
      // niente spese ma costi previsti (voci di budget): passano in «Altro», poi la categoria si elimina
      const previsti = trip.budget.filter((b) => b.categoryId === c.id)
      if (previsti.length > 0) {
        const nomi = previsti.map((b) => `«${b.label}»`).join(', ')
        const sposta = await ask({
          title: tt('Eliminare «{label}»?', { label: c.label }),
          message: tt('Non ha spese, ma ha {v0}: {nomi}. {v2} nella categoria «Altro», così il previsto totale non cambia.', { v0: previsti.length === 1 ? tt('un costo previsto') : tt('{length} costi previsti', { length: previsti.length }), nomi, v2: previsti.length === 1 ? tt('Passa') : tt('Passano') }),
          confirm: tt('Sposta ed elimina'),
          cancel: tt('Tieni la categoria'),
          destructive: true,
        })
        if (!sposta) return
        const m = await t.deleteExpenseCategoryMovingBudget(trip.id, c.id)
        showToast(m ?? tt('Categoria eliminata, {v0} in «Altro»', { v0: previsti.length === 1 ? tt('il costo previsto è') : tt('i costi previsti sono') }))
        return
      }
      const ok = await ask({
        title: tt('Eliminare «{label}»?', { label: c.label }),
        message: tt('Non ha spese: sparisce dalla ricevuta.'),
        confirm: tt('Elimina la categoria'),
        cancel: tt('Tieni la categoria'),
        destructive: true,
      })
      if (!ok) return
      const m = await t.setExpenseCategoryDeleted(c.id, true)
      showToast(m ?? tt('Categoria eliminata'), m ? undefined : { label: tt('Annulla'), run: () => void t.setExpenseCategoryDeleted(c.id as string, false) })
    }
  return { onPlanned, onRename, onDelete, confirmNode }
}
