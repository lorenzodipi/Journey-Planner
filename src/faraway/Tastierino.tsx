// Tastierino con le operazioni per i campi degli importi (come Satispay o Revolut): cifre, virgola, + − × ÷, cancella,
// «=» e «Fatto». Solo sui touch (puntatore grossolano): lì il campo non apre la tastiera del telefono (inputMode «none») e
// compare questo, **come una tastiera**: fisso in basso, sopra il menu, in primo piano (portale nel foglio aperto o nel body).
// Il campo scorre sopra il tastierino. Per lasciar scorrere anche l'ultimo campo, lo spazio in più va in fondo all'area che
// scorre (il corpo del foglio o la pagina) come padding: il modulo resta com'è, senza un vuoto sotto il campo.
// Con mouse e tastiera si scrive il calcolo direttamente nel campo («120+35,50»).
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { calcola, eCalcolo, premi } from '../lib/calcolo'
import { LOCALE, t } from '../i18n'
import { Sv } from './icons'

const TOUCH = '(pointer: coarse)'

/** Vero sui telefoni e i tablet: lì i campi degli importi usano il tastierino con le operazioni. */
export function useTastierino(): boolean {
  const [si, setSi] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(TOUCH).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(TOUCH)
    if (!mq) return
    const fn = () => setSi(mq.matches)
    mq.addEventListener?.('change', fn)
    return () => mq.removeEventListener?.('change', fn)
  }, [])
  return si
}

/** Il risultato da scrivere nel campo al posto del calcolo («155,5»), o null se il calcolo non torna. */
export function risultato(testo: string): string | null {
  if (!eCalcolo(testo)) return null
  const r = calcola(testo)
  return r === null ? null : String(r).replace('.', ',')
}

const fmt = (n: number, decimali: number) => n.toLocaleString(LOCALE, { maximumFractionDigits: decimali, minimumFractionDigits: 0 })

const TASTI: { k: string; label?: string; op?: boolean }[] = [
  { k: '7' }, { k: '8' }, { k: '9' }, { k: '÷', label: t('Diviso'), op: true },
  { k: '4' }, { k: '5' }, { k: '6' }, { k: '×', label: t('Per'), op: true },
  { k: '1' }, { k: '2' }, { k: '3' }, { k: '−', label: t('Meno'), op: true },
  { k: ',', label: t('Virgola') }, { k: '0' }, { k: '⌫', label: t('Cancella') }, { k: '+', label: t('Più'), op: true },
]

/**
 * Il tastierino del campo attivo, fisso in basso. I tasti non prendono il fuoco (pointerdown/mousedown senza default): il
 * campo resta attivo e la tastiera del telefono non si apre. «=» scrive il risultato; «Fatto» lo scrive e chiude.
 */
// ultimo tocco sul tastierino. Su iPhone toccare un pulsante toglie il fuoco al campo anche se il pointerdown è annullato
// (e il blur arriva senza relatedTarget): senza questo il tastierino si chiudeva prima del click, il tasto non scriveva niente
// e la pagina saltava su.
const tocco = { t: 0 }
const segna = () => void (tocco.t = Date.now())

/** Il campo perde il fuoco per un tocco o un tab sul tastierino: non si chiude (e su iPhone il fuoco torna al campo). */
export function dentroTastierino(n: EventTarget | null, campo?: HTMLElement | null): boolean {
  if (n instanceof Element && n.closest('.fa-calc')) return true
  if (Date.now() - tocco.t > 700) return false
  // se nel frattempo si è premuto «Fatto» (tocco azzerato) il fuoco non torna: il tastierino resta chiuso
  const t0 = tocco.t
  if (campo) requestAnimationFrame(() => tocco.t === t0 && campo.focus({ preventScroll: true }))
  return true
}

export function Tastierino({ value, onChange, onFatto, decimali = 2, unita }: { value: string; onChange: (v: string) => void; onFatto: () => void; decimali?: number; unita?: string }) {
  // il campo che l'ha aperto (ha il fuoco) e dove va il pannello: dentro il foglio aperto, se c'è, se no nel body
  const [campo] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null))
  const [dove] = useState<HTMLElement>(() => campo?.closest('dialog') ?? document.body)
  const pannello = useRef<HTMLDivElement>(null)
  const [alto, setAlto] = useState(0)
  useLayoutEffect(() => {
    const el = pannello.current
    if (!el) return
    const misura = () => setAlto(el.getBoundingClientRect().height)
    misura()
    const ro = new ResizeObserver(misura)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // spazio per scorrere: in fondo all'area che scorre (corpo del foglio, se no la pagina), non sotto il campo
  useLayoutEffect(() => {
    if (!alto) return
    const area = campo?.closest<HTMLElement>('.fa-sheet > .fb') ?? campo?.closest<HTMLElement>('.fa-main') ?? null
    if (!area) return
    const prima = area.style.paddingBottom
    area.style.paddingBottom = ''
    const base = parseFloat(getComputedStyle(area).paddingBottom) || 0
    area.style.paddingBottom = `${base + alto}px`
    return () => void (area.style.paddingBottom = prima)
  }, [campo, alto])
  // il campo resta visibile sopra il tastierino
  // (tutto il convertitore, con l'altra valuta, non solo il campo)
  useEffect(() => {
    const el = campo?.closest<HTMLElement>('.k-ValutaPiccola .vc') ?? campo
    if (!el || !alto) return
    el.style.scrollMarginBottom = `${alto + 16}px`
    el.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    return () => void (el.style.scrollMarginBottom = '')
  }, [campo, alto])
  const tieniFuoco = (e: RPointerEvent | RMouseEvent) => {
    segna()
    e.preventDefault()
  }
  const calc = eCalcolo(value)
  const r = calc ? calcola(value) : null
  const uguale = () => {
    const v = risultato(value)
    if (v !== null) onChange(v)
  }
  return (
    <>
      {createPortal(
    <div ref={pannello} className="fa-calc" role="group" aria-label={t('Tastierino con le operazioni')} onPointerDown={tieniFuoco} onMouseDown={tieniFuoco} onTouchStart={segna}>
      <div className="ris" aria-live="polite">
        {calc ? (r !== null ? `= ${fmt(r, decimali)}${unita ? ` ${unita}` : ''}` : t('Il calcolo non torna')) : ' '}
      </div>
      <div className="tasti">
        {TASTI.map(({ k, label, op }) => (
          <button key={k} type="button" className={op ? 'op' : k === '⌫' ? 'del' : undefined} aria-label={label} onPointerDown={tieniFuoco} onClick={() => onChange(premi(value, k))}>
            {k === '⌫' ? <Sv name="cancella" size={24} /> : k}
          </button>
        ))}
        <button type="button" className="op uguale" aria-label={t('Uguale')} onPointerDown={tieniFuoco} onClick={uguale} disabled={!calc || r === null}>
          =
        </button>
        <button type="button" className="fatto" onPointerDown={tieniFuoco} onClick={() => ((tocco.t = 0), uguale(), onFatto())}>
          {t('Fatto')}
        </button>
      </div>
    </div>,
        dove,
      )}
    </>
  )
}
