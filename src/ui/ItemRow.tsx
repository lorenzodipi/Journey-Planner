import type React from 'react'
import type { ItemKind } from '../types'
import { NodeCheck } from './glyphs'
import { MapsPill } from './MapsPill'
import { Ic } from './Sprite'

export const KIND_LABEL: Record<ItemKind, string> = {
  visit: 'Visita',
  meal: 'Pasto',
  transport: 'Spostamento',
  flight: 'Volo',
  free: 'Tempo libero',
  note: 'Nota',
}

export type StepState = 'done' | 'now' | 'next'

/** Glifo del nodo dello stepper per una categoria (stessi segni del mock). */
export function nodeGlyph(icon: string): string {
  return ['district', 'food', 'shopping', 'temple'].includes(icon) ? `g-${icon}` : icon === 'pin' ? 'gl-nav-pin' : `gl-cat-${icon}`
}

const UpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
)
const DownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
)
const GripIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
)

interface StepProps {
  id: string
  title: string
  state: StepState
  /** simbolo del nodo (id nello sprite) */
  glyph: string
  meta?: string
  time?: string
  /** Mostra «Dopo»/«Da fare» accanto all'ora (solo per le tappe di oggi). */
  badge?: 'Dopo' | 'Da fare'
  mapsHref?: string
  onOpen?: () => void
  onToggleDone?: () => void
  /** La tappa trovata toccando la mappa: per un attimo ha il fondo colorato. */
  highlight?: boolean
}

/** Una tappa con orario nello stepper «Tappe del giorno» (`.tp-stp`). */
export function StepRow({ id, title, state, glyph, meta, time, badge, mapsHref, onOpen, onToggleDone, highlight }: StepProps) {
  const done = state === 'done'
  const head = (
    <>
      <span className="tp-t">{title}</span>
      {meta && <span className="tp-m">{meta}</span>}
    </>
  )
  const nodeInner = done ? (
    <NodeCheck />
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <use href={`#${glyph}`} />
    </svg>
  )
  return (
    <li id={`tappa-${id}`} className={`tp-stp ${state}${highlight ? ' hl' : ''}`}>
      <span className="tp-rail">
        {onToggleDone ? (
          <button type="button" className={`tp-nd ${state}`} role="checkbox" aria-checked={done} aria-label={`${done ? 'Segna come da fare' : 'Segna come fatta'}: ${title}`} onClick={onToggleDone}>
            {nodeInner}
          </button>
        ) : (
          <span className={`tp-nd ${state}`}>{nodeInner}</span>
        )}
      </span>
      <div className="tp-body">
        <div className="tp-top">
          {onOpen ? (
            <button type="button" className="tp-edit" onClick={onOpen} aria-label={`Modifica ${title}`}>
              {head}
            </button>
          ) : (
            <div className="tp-edit">{head}</div>
          )}
          <div className="tp-r">
            {time && <span className="tp-time">{time}</span>}
            {done ? (
              <span className="tp-st">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.5 12.5l3.8 3.8 7.2-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Fatta
              </span>
            ) : state === 'now' ? (
              <span className="tp-badge now">Ora</span>
            ) : badge ? (
              <span className="tp-badge next">{badge}</span>
            ) : null}
          </div>
        </div>
        {mapsHref && (
          <div className="tp-foot">
            <MapsPill kind="tp" href={mapsHref} label={title} />
          </div>
        )}
      </div>
    </li>
  )
}

interface RowProps {
  id: string
  title: string
  /** simbolo del disco (id nello sprite, es. i-cat-shopping) */
  icon: string
  meta?: string
  done?: boolean
  mapsHref?: string
  /** Tocco sulla riga: apre la modifica. */
  onOpen?: () => void
  onToggleDone?: () => void
  /**
   * Se presente, al posto del pulsante Maps compaiono i comandi per riordinare: le frecce (su touch restano
   * solo per screen reader e tastiera) e, su touch, la maniglia da trascinare.
   */
  reorder?: { onUp?: () => void; onDown?: () => void; onGrab?: (e: React.PointerEvent<HTMLElement>) => void }
  /** Stile della riga mentre si trascina (spostamento) e se è proprio questa a essere trascinata. */
  dragStyle?: { transform: string; transition: string }
  dragging?: boolean
  highlight?: boolean
}

/** Una tappa senza orario: riga `.prow` con il disco della categoria (toccandolo si segna fatta). */
export function ItemRow({ id, title, icon, meta, done, mapsHref, onOpen, onToggleDone, reorder, dragStyle, dragging, highlight }: RowProps) {
  const disc = done ? (
    <span className="tp-nd done" aria-hidden="true">
      <NodeCheck />
    </span>
  ) : (
    <Ic name={icon} size={44} />
  )
  return (
    <li id={`tappa-${id}`} className={`prow${highlight ? ' hl' : ''}${dragging ? ' dragging' : ''}`} style={dragStyle}>
      {onToggleDone ? (
        <button type="button" className="tp-disc" role="checkbox" aria-checked={Boolean(done)} aria-label={`${done ? 'Segna come da fare' : 'Segna come fatta'}: ${title}`} onClick={onToggleDone}>
          {disc}
        </button>
      ) : (
        disc
      )}
      <div className="grow">
        {onOpen ? (
          <button type="button" className="pt2 tp-edit" onClick={onOpen} aria-label={`Modifica ${title}`} style={done ? { color: 'var(--ink-muted)', textDecoration: 'line-through' } : undefined}>
            {title}
          </button>
        ) : (
          <p className="pt2">{title}</p>
        )}
        {meta && <p className="pm">{meta}</p>}
      </div>
      {reorder ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <span className="flex pointer-coarse:sr-only" style={{ gap: '4px' }}>
            <button type="button" className="rbtn sm" aria-label="Sposta su" disabled={!reorder.onUp} onClick={reorder.onUp} style={{ opacity: reorder.onUp ? 1 : 0.35 }}>
              <UpIcon />
            </button>
            <button type="button" className="rbtn sm" aria-label="Sposta giù" disabled={!reorder.onDown} onClick={reorder.onDown} style={{ opacity: reorder.onDown ? 1 : 0.35 }}>
              <DownIcon />
            </button>
          </span>
          {reorder.onGrab && (
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onPointerDown={reorder.onGrab}
              className="rbtn hidden cursor-grab touch-none select-none pointer-coarse:grid"
              title={`Trascina «${title}»`}
            >
              <GripIcon />
            </button>
          )}
        </span>
      ) : (
        mapsHref && <MapsPill kind="btn" href={mapsHref} label={title} />
      )}
    </li>
  )
}
