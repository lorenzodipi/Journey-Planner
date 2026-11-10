// Struttura delle schermate Faraway: barra in alto (grande o con «indietro»), contenuto,
// barra delle schede (BarraSchede) e pulsante volante «+ …» (FAB), come nel mock.
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { cx } from './cx'
import { tornaSu } from '../lib/indietro'
import { useVaiAllErrore } from './useVaiAllErrore'
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

/**
 * Due colonne affiancate sui pieghevoli aperti e sugli schermi larghi; sul telefono non esiste (display: contents), quindi
 * ordine, spazi e aspetto restano quelli di sempre. Con la piega verticale le colonne si dividono esattamente sulla piega.
 * Figli diretti senza `Colonna`: si alternano sinistra/destra. Con `Colonna` si sceglie il lato; `alta` occupa due righe.
 */
export function Affianca({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('fa-duo', className)}>{children}</div>
}

/** Un gruppo di elementi nella stessa colonna di `Affianca` (sul telefono anche questo è trasparente); `tutta` va da un bordo all'altro. */
export function Colonna({ lato, alta, children }: { lato: 'sinistra' | 'destra' | 'tutta'; alta?: boolean; children: ReactNode }) {
  return <div className={cx('fa-duo-c', lato === 'sinistra' ? 'l' : lato === 'destra' ? 'r' : 'tutta', alta && 'alta')}>{children}</div>
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

/** «Indietro» in alto a sinistra: sale sempre alla pagina madre `madre` (es. «Giorni»), non alla pagina precedente. */
export function useBack(madre: string) {
  return () => tornaSu(madre)
}

/** Barra delle pagine secondarie: «indietro» a sinistra, titolo al centro, azione a destra. */
export function BarraIndietro({ title, back, right, senzaIndietro }: { title: ReactNode; back: string; right?: ReactNode; senzaIndietro?: boolean }) {
  const goBack = useBack(back)
  return (
    <div className="fa-bar">
      <div className="tp back">
        {senzaIndietro ? <span aria-hidden="true" style={{ minWidth: 44 }} /> : <PulsanteIcona icon="back" label="Indietro" onPress={goBack} />}
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
  /** Barra (e `fissa`) sempre visibile in cima: solo il resto scorre. Per le pagine principali. */
  fisso?: boolean
  /** Contenuto che resta fermo sotto la barra insieme a lei (ricerca, scelta della vista, filtri). Richiede `fisso`. */
  fissa?: ReactNode
}

/**
 * Testa fissa della pagina. Dice quando il contenuto sta scorrendo sotto di lei (per il filo sottile in fondo) e tiene in
 * `--head-h` la sua altezza, così `scrollIntoView` e i salti ai punti della pagina non finiscono nascosti dietro.
 */
function useTestaFissa(attiva: boolean) {
  const testa = useRef<HTMLDivElement>(null)
  const sentinella = useRef<HTMLDivElement>(null)
  const [scorre, setScorre] = useState(false)
  useEffect(() => {
    if (!attiva || !sentinella.current) return
    const io = new IntersectionObserver(([e]) => setScorre(!e.isIntersecting), { threshold: 0 })
    io.observe(sentinella.current)
    return () => io.disconnect()
  }, [attiva])
  useEffect(() => {
    const el = testa.current
    if (!attiva || !el) return
    const root = document.documentElement
    const misura = () => root.style.setProperty('--head-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    misura()
    const ro = new ResizeObserver(misura)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--head-h')
    }
  }, [attiva])
  return { testa, sentinella, scorre }
}

/** Una schermata dell'app: la «cornice del telefono» del mock è la pagina intera. */
export function Schermata({ bar, children, tabs = true, fab, gap, mainStyle, overlay, className, bare, rete = true, fisso, fissa }: ScreenProps) {
  const main = useRef<HTMLElement>(null)
  const fissata = !!fisso && !bare
  const { testa, sentinella, scorre } = useTestaFissa(fissata)
  useVaiAllErrore(main)
  useEffect(() => {
    const root = document.documentElement
    if (tabs) root.removeAttribute('data-no-tabs')
    else root.setAttribute('data-no-tabs', '')
  }, [tabs])
  return (
    <div className={cx('fa-phone', tabs && 'has-tabs', fab && 'has-fab', className)}>
      {fissata ? (
        <>
          <div ref={sentinella} className="fa-sent" aria-hidden="true" />
          <div ref={testa} className="fa-head" data-scrolled={scorre || undefined}>
            <div className="fa-top" />
            {bar}
            {fissa ? <div className="fa-fissa">{fissa}</div> : null}
          </div>
        </>
      ) : (
        <>
          <div className="fa-top" />
          {bar}
        </>
      )}
      {bare ? (
        children
      ) : (
        <main ref={main} className="fa-main" style={{ ...(gap ? { gap } : null), ...mainStyle }}>
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
