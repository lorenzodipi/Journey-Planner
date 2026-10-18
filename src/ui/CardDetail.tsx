import { useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { PencilIcon } from './Icons'

/** Una sola card aperta alla volta: toccare quella aperta la richiude. */
export function useOpenCard(): [string | null, (id: string) => void] {
  const [openId, setOpenId] = useState<string | null>(null)
  return [openId, (id) => setOpenId((cur) => (cur === id ? null : id))]
}

/** Righe etichetta/valore col tratteggio, per la parte che si apre in una card. */
export function DetailRows({ rows }: { rows: { label: string; value: ComponentChildren }[] }) {
  if (rows.length === 0) return null
  return (
    <dl class="pr-3 text-sm">
      {rows.map((r) => (
        <div class="flex items-baseline justify-between gap-4 border-t-2 border-dashed border-line py-1.5 first:border-t-0">
          <dt class="shrink-0 text-muted">{r.label}</dt>
          <dd class="min-w-0 text-right font-extrabold">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Il blocco che compare sotto la card quando la si tocca: righe di dettaglio + "Modifica" con la matita. */
export function CardDetail({
  rows,
  note,
  onEdit,
  editLabel,
  children,
}: {
  rows: { label: string; value: ComponentChildren }[]
  note?: string
  onEdit: () => void
  editLabel: string
  children?: ComponentChildren
}) {
  return (
    <div class="mt-2 border-t-2 border-dashed border-line pt-2">
      <DetailRows rows={rows} />
      {note && (
        <p class="mt-1 whitespace-pre-line border-t-2 border-dashed border-line pr-3 pt-2 text-sm text-muted">{note}</p>
      )}
      {children}
      <div class="mt-2 flex pr-2">
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          class="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line px-4 text-sm font-extrabold"
        >
          <PencilIcon size={18} />
          Modifica
        </button>
      </div>
    </div>
  )
}
