import type { DayItem, ItemKind } from '../types'
import { formatDuration } from '../lib/duration'
import { TrashButton } from './ConfirmDialog'
import { ArrowDownIcon, ArrowUpIcon, GripIcon, TickIcon } from './Icons'
import { MapsPill } from './MapsPill'
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
  /** Tempo di permanenza in minuti (proprio o del luogo). */
  duration?: number
  /** Link per aprire il luogo della tappa in Maps (solo se ha un luogo collegato). Non compare mentre si riordina. */
  mapsHref?: string
  /** Tocco sulla riga: apre la modifica. Senza, la riga è di sola lettura. */
  onOpen?: () => void
  onToggleDone?: () => void
  /** Cestino in fondo alla riga (chiede conferma chi lo usa). Non compare mentre si riordina. */
  onDelete?: () => void
  /**
   * Se presente, al posto della spunta compaiono i comandi per riordinare: le frecce (su web; su touch restano
   * solo per screen reader e tastiera) e, su touch, la maniglia da trascinare (`onGrab`, assente se la tappa ha un orario).
   */
  reorder?: { onUp?: () => void; onDown?: () => void; onGrab?: (e: PointerEvent) => void }
  /** Stile della riga mentre si trascina (spostamento) e se è proprio questa a essere trascinata. */
  dragStyle?: { transform: string; transition: string }
  dragging?: boolean
  /** La tappa trovata toccando la mappa: per un attimo ha il fondo colorato. */
  highlight?: boolean
}

export function ItemRow({ item, n, onMap, hint, place, duration, mapsHref, onOpen, onToggleDone, onDelete, reorder, dragStyle, dragging, highlight }: Props) {
  const range = item.time && item.endTime ? `${item.time}–${item.endTime}` : ''
  const sub = [KIND_LABEL[item.kind], item.endTime && range, duration ? `sosta ${formatDuration(duration)}` : '', item.note, place].filter(Boolean).join(' · ')
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
    <li
      id={`tappa-${item.id}`}
      style={dragStyle}
      class={`scroll-mt-24 scroll-mb-28 ${dragging ? 'relative z-20 [filter:drop-shadow(0_10px_16px_rgb(0_0_0/0.35))]' : ''}`}
    >
      {hint && (
        <div class="ml-9 flex h-[30px] items-center gap-2.5" aria-hidden="true">
          <i class="h-full border-l-[3px] border-dashed border-line" />
          <span class="text-xs text-muted">{hint}</span>
        </div>
      )}
      <Ticket stub={stub} tone={highlight ? 'accent' : item.done ? 'ok' : 'line'} flash={highlight}>
        <div class="min-w-0 flex-1">
          {onOpen ? (
            <button type="button" onClick={onOpen} aria-label={`Modifica ${item.title}`} class="flex min-h-11 w-full min-w-0 items-center text-left">
              {body}
            </button>
          ) : (
            <div class="flex min-h-11 min-w-0 items-center">{body}</div>
          )}
          {mapsHref && !reorder && (
            <div class="pb-1 pt-0.5">
              <MapsPill href={mapsHref} label={item.title} text="Maps" compact />
            </div>
          )}
        </div>

        {reorder ? (
          <span class="flex shrink-0 items-center">
            <span class="flex pointer-coarse:sr-only">
              <button type="button" aria-label="Sposta su" disabled={!reorder.onUp} onClick={reorder.onUp} class="grid size-11 place-items-center rounded-full text-pale disabled:opacity-30">
                <ArrowUpIcon size={18} />
              </button>
              <button type="button" aria-label="Sposta giù" disabled={!reorder.onDown} onClick={reorder.onDown} class="grid size-11 place-items-center rounded-full text-pale disabled:opacity-30">
                <ArrowDownIcon size={18} />
              </button>
            </span>
            {reorder.onGrab && (
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onPointerDown={reorder.onGrab}
                class="hidden size-11 cursor-grab touch-none select-none place-items-center rounded-full text-pale pointer-coarse:grid"
                title={`Trascina «${item.title}»`}
              >
                <GripIcon size={20} />
              </button>
            )}
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
