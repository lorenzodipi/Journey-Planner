// Tastierino con le operazioni per i campi degli importi (come Satispay o Revolut): cifre, virgola, + − × ÷, cancella,
// «=» e «Fatto». Solo sui touch (puntatore grossolano): lì il campo non apre la tastiera del telefono (inputMode «none») e
// sotto compare questo. Con mouse e tastiera si scrive il calcolo direttamente nel campo («120+35,50»).
import { useEffect, useState, type PointerEvent as RPointerEvent } from 'react'
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
 * Il tastierino sotto il campo attivo. I tasti non prendono il fuoco (pointerdown senza default): il campo resta attivo e
 * la tastiera del telefono non si apre. «=» scrive il risultato; «Fatto» lo scrive e chiude.
 */
export function Tastierino({ value, onChange, onFatto, decimali = 2, unita }: { value: string; onChange: (v: string) => void; onFatto: () => void; decimali?: number; unita?: string }) {
  const tieniFuoco = (e: RPointerEvent) => e.preventDefault()
  const calc = eCalcolo(value)
  const r = calc ? calcola(value) : null
  const uguale = () => {
    const v = risultato(value)
    if (v !== null) onChange(v)
  }
  return (
    <div className="fa-calc" role="group" aria-label={t('Tastierino con le operazioni')}>
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
        <button type="button" className="fatto" onPointerDown={tieniFuoco} onClick={() => (uguale(), onFatto())}>
          {t('Fatto')}
        </button>
      </div>
    </div>
  )
}
