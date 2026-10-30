import { useState } from 'react'
import type { ReactNode } from 'react'
import { PencilIcon } from './Icons'

/** Una sola card aperta alla volta: toccare quella aperta la richiude. */
export function useOpenCard(): [string | null, (id: string) => void] {
  const [openId, setOpenId] = useState<string | null>(null)
  return [openId, (id) => setOpenId((cur) => (cur === id ? null : id))]
}

/** Righe etichetta/valore col tratteggio, per la parte che si apre in una card. */
export function DetailRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  if (rows.length === 0) return null
  return (
    <dl className="pr-3 text-sm">
      {rows.map((r) => (
        <div className="flex items-baseline justify-between gap-4 border-t border-hairline py-1.5 first:border-t-0">
          <dt className="shrink-0 text-muted">{r.label}</dt>
          <dd className="min-w-0 text-right font-extrabold">{r.value}</dd>
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
  rows: { label: string; value: ReactNode }[]
  note?: string
  onEdit: () => void
  editLabel: string
  children?: ReactNode
}) {
  return (
    <div className="mt-2 border-t border-hairline pt-2">
      <DetailRows rows={rows} />
      {note && (
        <p className="mt-1 whitespace-pre-line border-t border-hairline pr-3 pt-2 text-sm text-muted">{note}</p>
      )}
      {children}
      <div className="mt-2 flex pr-2">
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line px-4 text-sm font-extrabold"
        >
          <PencilIcon size={18} />
          Modifica
        </button>
      </div>
    </div>
  )
}
