// Struttura delle schermate Faraway: barra in alto (grande o con «indietro»), contenuto,
// barra delle schede (BarraSchede) e pulsante volante «+ …» (FAB), come nel mock.
import type { CSSProperties, ReactNode } from 'react'
import { useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { cx } from './cx'
import { Sv, TAB_PATHS } from './icons'
import { PulsanteIcona } from './base'
import { PillolaOffline, StatoRete } from './Rete'
import { useRichiesteDaDecidere } from '../pages/spese/Rimborsi'
import { useTrips } from '../state/trip'

const TABS = [
  { href: '/', label: 'Oggi' },
  { href: '/giorni', label: 'Giorni' },
  { href: '/luoghi', label: 'Luoghi' },
  { href: '/spese', label: 'Spese' },
  { href: '/altro', label: 'Altro' },
] as const

export type TabName = (typeof TABS)[number]['label']

/** Quale scheda è attiva per una rotta. */
export function tabFor(location: string): TabName {
  if (location === '/' || location === '') return 'Oggi'
  if (location.startsWith('/giorni')) return 'Giorni'
  if (location.startsWith('/luoghi')) return 'Luoghi'
  if (location.startsWith('/spese')) return 'Spese'
  return 'Altro'
}

/** Barra delle schede (componente BarraSchede): pillola sull'icona attiva, etichetta sotto, area sicura in basso. */
export function BarraSchede() {
  const [location] = useLocation()
  const active = tabFor(location)
  const richieste = useRichiesteDaDecidere(useTrips().active).length
  return (
    <nav className="fa-tabs" aria-label="Sezioni">
      {TABS.map((t) => {
        const on = t.label === active
        return (
          <Link key={t.href} href={t.href} className={cx('fa-tab', on && 'on')} aria-current={on ? 'page' : undefined}>
            <span className="pill">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {TAB_PATHS[t.label]}
              </svg>
              {t.label === 'Spese' && richieste > 0 ? <span className="fa-tbn" role="img" aria-label={`${richieste} richieste di rimborso da confermare`}>{richieste}</span> : null}
            </span>
            <span className="tl">{t.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/** Barra grande delle pagine principali: azioni rotonde in alto a destra, titolo grande e sottotitolo. */
export function BarraGrande({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="fa-bar">
      <div className="tp">{actions}</div>
      <h1>{title}</h1>
      {sub ? <span className="sub">{sub}</span> : null}
    </div>
  )
}

/** Torna alla pagina precedente; se non c'è (link aperto da fuori), va a `fallback`. */
export function useBack(fallback: string) {
  const [, navigate] = useLocation()
  return () => {
    if (window.history.length > 1) window.history.back()
    else navigate(fallback, { replace: true })
  }
}

/** Barra delle pagine secondarie: «indietro» a sinistra, titolo al centro, azione a destra. */
export function BarraIndietro({ title, back, right }: { title: ReactNode; back: string; right?: ReactNode }) {
  const goBack = useBack(back)
  return (
    <div className="fa-bar">
      <div className="tp back">
        <PulsanteIcona icon="back" label="Indietro" onPress={goBack} />
        <h1 className="mid">{title}</h1>
        <span style={{ display: 'flex', gap: 8, minWidth: 44, justifyContent: 'flex-end' }}>{right}</span>
      </div>
    </div>
  )
}

/** Pulsante volante «+ Cosa» in basso a destra: testo bianco in chiaro e in scuro. */
export function Fab({ label, onPress, aria }: { label: string; onPress: () => void; aria?: string }) {
  return (
    <button type="button" className="fa-fab" onClick={onPress} aria-label={aria ?? `Aggiungi ${label.toLowerCase()}`}>
      <Sv name="plus" size={24} />
      {label}
    </button>
  )
}

interface ScreenProps {
  bar?: ReactNode
  children: ReactNode
  /** Mostra la barra delle schede (pagine principali e sezioni di Altro). */
  tabs?: boolean
  fab?: { label: string; onPress: () => void; aria?: string } | null
  /** Spazio tra le sezioni (15px nelle Home e nelle liste). */
  gap?: number
  mainStyle?: CSSProperties
  overlay?: ReactNode
  className?: string
  /** Contenuto senza il <main> con i margini (es. la Mappa a tutto schermo). */
  bare?: boolean
  /** Banner delle modifiche in coda in cima e «Sei offline» in fondo (#49); `pill: false` senza la pillola. */
  rete?: boolean | { pill: false }
}

/** Una schermata dell'app: la «cornice del telefono» del mock è la pagina intera. */
export function Schermata({ bar, children, tabs = true, fab, gap, mainStyle, overlay, className, bare, rete = true }: ScreenProps) {
  useEffect(() => {
    const root = document.documentElement
    if (tabs) root.removeAttribute('data-no-tabs')
    else root.setAttribute('data-no-tabs', '')
  }, [tabs])
  return (
    <div className={cx('fa-phone', tabs && 'has-tabs', fab && 'has-fab', className)}>
      <div className="fa-top" />
      {bar}
      {bare ? (
        children
      ) : (
        <main className="fa-main" style={{ ...(gap ? { gap } : null), ...mainStyle }}>
          {rete ? <StatoRete /> : null}
          {children}
          {rete === true ? <PillolaOffline /> : null}
        </main>
      )}
      {tabs ? <BarraSchede /> : null}
      {fab ? <Fab {...fab} /> : null}
      {overlay}
    </div>
  )
}
