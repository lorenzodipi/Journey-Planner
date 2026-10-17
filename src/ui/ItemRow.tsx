import type { DayItem, ItemKind } from '../types'

export const KIND_DOT: Record<ItemKind, string> = {
  visit: 'bg-accent',
  meal: 'bg-warn',
  transport: 'bg-secondary',
  flight: 'bg-secondary',
  free: 'bg-muted',
  note: 'bg-line',
}

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
  /** Numero della tappa sulla mappa del giorno: sostituisce il pallino colorato. */
  n?: number
  /** Riga in più sotto il titolo (es. il tempo dalla tappa precedente). */
  hint?: string
  /** Tocco sulla riga: apre la modifica. Senza, la riga è di sola lettura. */
  onOpen?: () => void
  onToggleDone?: () => void
  /** Se presente, al posto della spunta compaiono le frecce per riordinare. */
  reorder?: { onUp?: () => void; onDown?: () => void }
}

export function ItemRow({ item, n, hint, onOpen, onToggleDone, reorder }: Props) {
  const time = item.time ? (item.endTime ? `${item.time}–${item.endTime}` : item.time) : ''
  const body = (
    <>
      <span class="w-11 shrink-0 text-right text-sm tabular-nums text-muted">{item.time ?? ''}</span>
      {n != null ? (
        <span
          class="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: '#c8402f' }}
          title={`Tappa ${n} sulla mappa`}
        >
          {n}
        </span>
      ) : (
        <span class={`h-2.5 w-2.5 shrink-0 rounded-full ${KIND_DOT[item.kind]}`} title={KIND_LABEL[item.kind]} />
      )}
      <span class="min-w-0 flex-1">
        <span class={`block truncate font-medium ${item.done ? 'text-muted line-through' : ''}`}>{item.title}</span>
        {(item.note || (item.endTime && time)) && (
          <span class="block truncate text-xs text-muted">{item.endTime ? `${time}${item.note ? ' · ' : ''}` : ''}{item.note}</span>
        )}
        {hint && <span class="block text-xs text-muted">{hint}</span>}
      </span>
    </>
  )

  return (
    <li class="flex min-h-12 items-center gap-1">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Modifica ${item.title}`}
          class="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 text-left"
        >
          {body}
        </button>
      ) : (
        <div class="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2">{body}</div>
      )}

      {reorder ? (
        <span class="flex shrink-0">
          <button
            type="button"
            aria-label="Sposta su"
            disabled={!reorder.onUp}
            onClick={reorder.onUp}
            class="grid h-11 w-11 place-items-center rounded-full text-lg text-accent disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Sposta giù"
            disabled={!reorder.onDown}
            onClick={reorder.onDown}
            class="grid h-11 w-11 place-items-center rounded-full text-lg text-accent disabled:opacity-30"
          >
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
            class="grid h-11 w-11 shrink-0 place-items-center"
          >
            <span
              class={`grid h-6 w-6 place-items-center rounded-full border-2 text-xs ${
                item.done ? 'border-ok bg-ok text-bg' : 'border-line'
              }`}
            >
              {item.done ? '✓' : ''}
            </span>
          </button>
        )
      )}
    </li>
  )
}
