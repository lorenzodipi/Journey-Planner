// Stati di sistema del design system (mock Fa-19, Fa-49, Fa-50, issue #49): vuoto con
// illustrazione, vuoto da filtro, errore, offline.
import type { ReactNode } from 'react'
import { ART } from '../ui/art'
import { Pulsante } from './base'
import type { SvName } from './icons'

type ArtName = keyof typeof ART

/** Stato vuoto con la scena: titolo, testo che invita ad agire e pulsante. */
export function Vuoto({ art, title, text, action, onAction, actionIcon = 'plus', secondary }: { art?: ArtName; title: string; text: ReactNode; action?: string; onAction?: () => void; actionIcon?: SvName; secondary?: ReactNode }) {
  return (
    <section className="fa-card xl" style={{ overflow: 'hidden' }}>
      {art ? (
        <div className="fa-scene" role="img" aria-label="" style={{ aspectRatio: '4/3', borderRadius: 0 }}>
          <img src={ART[art]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : null}
      <div style={{ padding: '24px 16px 8px', display: 'grid', gap: 8 }}>
        <h2 className="fa-h2">{title}</h2>
        <p className="fa-lead" style={{ color: 'var(--ink-muted)' }}>
          {text}
        </p>
      </div>
      {action || secondary ? (
        <div style={{ padding: '8px 16px 16px', display: 'grid', gap: 16 }}>
          {action ? (
            <Pulsante iconLeading={actionIcon} onPress={onAction}>
              {action}
            </Pulsante>
          ) : null}
          {secondary}
        </div>
      ) : null}
    </section>
  )
}

/** Vuoto dovuto a un filtro: card piccola con l'azione per tornare a vedere tutto. */
export function VuotoFiltro({ title, text, action, onAction }: { title: string; text: ReactNode; action: string; onAction: () => void }) {
  return (
    <div className="fa-card pad" style={{ display: 'grid', gap: 8 }}>
      <h2 className="fa-h3">{title}</h2>
      <p className="fa-m">{text}</p>
      <Pulsante color="secondary-soft" onPress={onAction}>
        {action}
      </Pulsante>
    </div>
  )
}

