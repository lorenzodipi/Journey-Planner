import type { DayItem, ItemKind } from '../types'

const dot: Record<ItemKind, string> = {
  visit: 'bg-accent',
  meal: 'bg-warn',
  transport: 'bg-secondary',
  flight: 'bg-secondary',
  free: 'bg-muted',
  note: 'bg-line',
}

const kindLabel: Record<ItemKind, string> = {
  visit: 'Visita',
  meal: 'Pasto',
  transport: 'Spostamento',
  flight: 'Volo',
  free: 'Libero',
  note: 'Nota',
}

export function ItemRow({ item }: { item: DayItem }) {
  return (
    <li class="flex min-h-12 items-center gap-3 py-2">
      <span class="w-11 shrink-0 text-right text-sm tabular-nums text-muted">{item.time ?? ''}</span>
      <span class={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[item.kind]}`} title={kindLabel[item.kind]} />
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">{item.title}</span>
        {item.note && <span class="block truncate text-xs text-muted">{item.note}</span>}
      </span>
    </li>
  )
}
