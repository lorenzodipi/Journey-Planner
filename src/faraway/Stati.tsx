// Stati di sistema del design system (mock Fa-19, Fa-49, Fa-50, issue #49): vuoto con
// illustrazione, vuoto da filtro, caricamento a scheletro, errore, offline.
import type { ReactNode } from 'react'
import { ART } from '../ui/art'
import { Pulsante } from './base'
import type { SvName } from './icons'
import { Sv } from './icons'

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
        <div style={{ padding: '8px 16px 16px', display: 'grid', gap: 12 }}>
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
    <div className="fa-card pad" style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
      <h2 className="fa-h3">{title}</h2>
      <p className="fa-m">{text}</p>
      <button type="button" className="fa-btn soft" style={{ width: 'auto', height: 44, padding: '0 16px', fontSize: 14 }} onClick={onAction}>
        {action}
      </button>
    </div>
  )
}

const bar = (h: number, w: string, r = 8) => <span style={{ display: 'block', height: h, width: w, borderRadius: r, background: 'var(--surface-high)' }} />

/** Caricamento a scheletro (niente rotelle infinite): card e righe grigie con una frase. */
export function Caricamento({ text = 'Sto caricando il viaggio', rows = 4 }: { text?: string; rows?: number }) {
  return (
    <>
      <div role="status" aria-busy="true" aria-label={text} style={{ display: 'grid', gap: 16 }}>
        <div aria-hidden="true" className="fa-card xl pad" style={{ display: 'grid', gap: 12 }}>
          {bar(20, '40%')}
          {bar(44, '70%', 12)}
          {bar(14, '55%')}
          {bar(8, '100%', 9999)}
        </div>
        <div className="fa-list" aria-hidden="true">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 12, padding: '10px 16px', alignItems: 'center' }}>
              {bar(44, '44px', 9999)}
              <div style={{ display: 'grid', gap: 8 }}>
                {bar(16, '60%')}
                {bar(14, '40%')}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="fa-off" style={{ justifyContent: 'center' }}>
        <Sv name="clock" size={16} />
        {text}
      </div>
    </>
  )
}
