import type { DayItem, ItemKind } from '../types'
import { TrashButton } from './ConfirmDialog'
import { PinIcon, TickIcon } from './Icons'
import { Ticket } from './Ticket'

export const KIND_LABEL: Record<ItemKind, string> = {
  visit: 'Visita',
  meal: 'Pasto',
  transport: 'Spostamento',
  flight: 'Volo',
  free: 'Tempo libero',
  note: 'Nota',
}

interface Props {
  item: DayItem
  /** Numero d'ordine della tappa nel giorno (vale anche per la mappa). */
  n?: number
  /** La tappa ha una posizione e compare sulla mappa del giorno. */
  onMap?: boolean
  /** Riga in più sotto il titolo (es. il tempo dalla tappa precedente). */
  hint?: string
  /** Il luogo collegato (nome e città), se serve a capire dove si va. */
  place?: string
  /** Link per aprire il luogo della tappa in Maps (solo se ha un luogo collegato). Non compare mentre si riordina. */
  mapsHref?: string
  /** Tocco sulla riga: apre la modifica. Senza, la riga è di sola lettura. */
  onOpen?: () => void
  onToggleDone?: () => void
  /** Cestino in fondo alla riga (chiede conferma chi lo usa). Non compare mentre si riordina. */
  onDelete?: () => void
  /** Se presente, al posto della spunta compaiono le frecce per riordinare. */
  reorder?: { onUp?: () => void; onDown?: () => void }
}

export function ItemRow({ item, n, onMap, hint, place, mapsHref, onOpen, onToggleDone, onDelete, reorder }: Props) {
  const range = item.time && item.endTime ? `${item.time}–${item.endTime}` : ''
  const sub = [KIND_LABEL[item.kind], item.endTime && range, item.note, place].filter(Boolean).join(' · ')
  const stub = item.time ? (
    <span class={`text-[22px] font-extrabold leading-none tabular-nums ${item.done ? 'text-muted' : 'text-pale'}`}>{item.time}</span>
  ) : n != null ? (
    <span
      class={`grid size-7 place-items-center rounded-full text-sm font-extrabold ${onMap ? 'bg-accent text-white' : 'border-2 border-line text-muted'}`}
      title={onMap ? `Tappa ${n} sulla mappa` : `Tappa ${n} (senza posizione sulla mappa)`}
    >
      {n}
    </span>
  ) : (
    <span class="text-sm font-extrabold text-muted">—</span>
  )
  const body = (
    <span class="min-w-0 flex-1">
      <span class={`block line-clamp-2 text-[17px] font-extrabold leading-tight ${item.done ? 'text-muted line-through' : ''}`}>{item.title}</span>
      {sub && <span class="mt-0.5 block truncate text-[13px] text-muted">{sub}</span>}
    </span>
  )

  return (
    <li>
      {hint && (
        <div class="ml-9 flex h-[30px] items-center gap-2.5" aria-hidden="true">
          <i class="h-full border-l-[3px] border-dashed border-line" />
          <span class="text-xs text-muted">{hint}</span>
        </div>
      )}
      <Ticket stub={stub} tone={item.done ? 'ok' : 'line'}>
        <div class="min-w-0 flex-1">
          {onOpen ? (
            <button type="button" onClick={onOpen} aria-label={`Modifica ${item.title}`} class="flex min-h-11 w-full min-w-0 items-center text-left">
              {body}
            </button>
          ) : (
            <div class="flex min-h-11 min-w-0 items-center">{body}</div>
          )}
          {mapsHref && !reorder && (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Apri «${item.title}» in Maps`}
              class="-mt-1 inline-flex min-h-11 items-center gap-1.5 pr-3 text-sm font-extrabold text-pale"
            >
              <PinIcon size={14} />
              Apri in Maps
            </a>
          )}
        </div>

        {reorder ? (
          <span class="flex shrink-0">
            <button type="button" aria-label="Sposta su" disabled={!reorder.onUp} onClick={reorder.onUp} class="grid size-11 place-items-center rounded-full text-lg text-pale disabled:opacity-30">
              ↑
            </button>
            <button type="button" aria-label="Sposta giù" disabled={!reorder.onDown} onClick={reorder.onDown} class="grid size-11 place-items-center rounded-full text-lg text-pale disabled:opacity-30">
              ↓
            </button>
          </span>
        ) : (
          onToggleDone && (
            <button
              type="button"
              role="checkbox"
              aria-checked={Boolean(item.done)}
              aria-label={item.done ? 'Segna come da fare' : 'Segna come fatta'}
              onClick={onToggleDone}
              class="grid size-11 shrink-0 place-items-center"
            >
              <span class={`grid size-6 place-items-center rounded-full border-2 ${item.done ? 'border-ok bg-ok text-bg' : 'border-line'}`}>
                {item.done && <TickIcon size={14} />}
              </span>
            </button>
          )
        )}
        {!reorder && onDelete && <TrashButton label={`Elimina ${item.title}`} onClick={onDelete} />}
      </Ticket>
    </li>
  )
}
