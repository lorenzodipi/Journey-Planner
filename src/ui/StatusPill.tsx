import type { PlaceStatus } from '../types'
import { CalendarIcon, CloseIcon, TickIcon } from './Icons'
import { STATUS_LABEL } from './placeMeta'

// Stato del luogo nella card della Mappa: etichetta PIENA con un'icona, per non confonderla con la categoria,
// che è a contorno. (L'elenco Luoghi usa ancora le etichette a contorno e non passa di qui.)
const LOOK: Record<Exclude<PlaceStatus, 'idea'>, { bg: string; fg: string; Icon: typeof TickIcon }> = {
  planned: { bg: 'var(--limone)', fg: 'var(--on-bright)', Icon: CalendarIcon }, // testo scuro su giallo: contrasto oltre 10:1
  done: { bg: 'var(--menta)', fg: 'var(--on-bright)', Icon: TickIcon }, // idem su menta
  skipped: { bg: 'var(--surface-high)', fg: 'var(--ink)', Icon: CloseIcon }, // neutro, ma leggibile
}

/** Niente per «Idea»: è lo stato di partenza e non serve dirlo. */
export function StatusPill({ status }: { status: PlaceStatus }) {
  if (status === 'idea') return null
  const { bg, fg, Icon } = LOOK[status]
  return (
    <span className="inline-flex items-center gap-1 rounded-full py-0.5 pl-1.5 pr-2 text-xs font-extrabold leading-snug" style={{ background: bg, color: fg }}>
      <Icon size={11} />
      {STATUS_LABEL[status]}
    </span>
  )
}
