import type { ComponentChildren } from 'preact'
import { ChevronDownIcon } from './Icons'

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
  children: ComponentChildren
}) {
  const shown = open || Boolean(locked)
  const head = (
    <>
      <span class="min-w-0 flex-1">
        <span class="block font-display text-lg font-extrabold leading-tight">{title}</span>
        {summary && <span class="mt-0.5 block truncate text-[13px] text-muted">{summary}</span>}
      </span>
      {!locked && (
        <span class={`grid size-11 shrink-0 place-items-center text-pale transition-transform duration-200 ${shown ? 'rotate-180' : ''}`}>
          <ChevronDownIcon size={18} />
        </span>
      )}
    </>
  )
  return (
    <section aria-label={title} class="rise">
      {locked ? (
        <div class="flex min-h-14 items-center gap-2 rounded-2xl border-2 border-line bg-surface py-2 pl-4 pr-4">{head}</div>
      ) : (
        <button
          type="button"
          aria-expanded={shown}
          aria-controls={id}
          onClick={onToggle}
          class="flex min-h-14 w-full items-center gap-2 rounded-2xl border-2 border-line bg-surface py-2 pl-4 pr-2 text-left"
        >
          {head}
        </button>
      )}
      <div id={id} class="jp-collapse" data-open={shown}>
        <div>
          <div class="pt-4">{children}</div>
        </div>
      </div>
    </section>
  )
}
