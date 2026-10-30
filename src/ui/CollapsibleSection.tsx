import type { ReactNode } from 'react'
import { ChevronDownG } from './glyphs'

/**
 * Sezione che si apre e si chiude toccando l'intestazione (titolo, riepilogo e freccia a destra).
 * Aperta o chiusa la decide chi la usa (`open`), così può aprirla da altri punti della pagina.
 * `locked` la tiene aperta senza freccia (es. giorno vuoto: serve subito «+ Aggiungi tappa»).
 */
export function CollapsibleSection({
  id,
  title,
  summary,
  open,
  locked,
  onToggle,
  children,
}: {
  id: string
  title: string
  summary?: string
  open: boolean
  locked?: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const shown = open || Boolean(locked)
  const head = (
    <>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="h-md" style={{ display: 'block' }}>{title}</span>
        {summary && <span className="b-sm muted" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>}
      </span>
      {!locked && (
        <span className="csec-ch" style={{ transform: shown ? 'rotate(180deg)' : undefined }}>
          <ChevronDownG size={20} />
        </span>
      )}
    </>
  )
  return (
    <section aria-label={title}>
      {locked ? (
        <div className="card csec-h">{head}</div>
      ) : (
        <button type="button" aria-expanded={shown} aria-controls={id} onClick={onToggle} className="card csec-h">
          {head}
        </button>
      )}
      <div id={id} className="jp-collapse" data-open={shown}>
        <div>
          <div style={{ paddingTop: '16px' }}>{children}</div>
        </div>
      </div>
    </section>
  )
}
