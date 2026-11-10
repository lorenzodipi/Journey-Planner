// Componenti di base del design system Faraway, costruiti come in Untitled UI React
// (stesse API: Button con color/size/iconLeading/onPress, Input, Toggle, Badge, Avatar, sopra
// React Aria Components) ma con l'aspetto del mock (classi .fa-* di faraway.css).
import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Button as AriaButton, Link as AriaLink, Menu as AriaMenu, MenuItem as AriaMenuItem, MenuTrigger as AriaMenuTrigger, OverlayArrow as AriaOverlayArrow, Popover as AriaPopover, Switch as AriaSwitch } from 'react-aria-components'
import { cx } from './cx'
import { apriSelettore } from '../lib/picker'
import { Loader } from './Loader'
import { Sv, type SvName } from './icons'

/* ---------------------------------------------------------------- Pulsante (Button) */

export type ButtonColor = 'primary' | 'secondary' | 'secondary-soft' | 'tertiary' | 'link-color' | 'tertiary-destructive'

const COLOR_CLASS: Record<ButtonColor, string> = {
  primary: 'pri',
  secondary: 'out',
  'secondary-soft': 'soft',
  tertiary: 'txt',
  'link-color': 'txt',
  'tertiary-destructive': 'del',
}

interface ButtonProps {
  children?: ReactNode
  color?: ButtonColor
  /** `sm` = 44px e larghezza del contenuto; `md` = 48px a tutta larghezza (azione della schermata). */
  size?: 'sm' | 'md'
  iconLeading?: SvName | ReactNode
  iconTrailing?: SvName | ReactNode
  onPress?: () => void
  isDisabled?: boolean
  isLoading?: boolean
  type?: 'button' | 'submit'
  href?: string
  target?: string
  className?: string
  'aria-label'?: string
  'aria-expanded'?: boolean
  form?: string
}

const icon = (i: SvName | ReactNode) => (typeof i === 'string' ? <Sv name={i as SvName} size={20} /> : i)

/** Pulsante del design system (Untitled UI `Button`): `primary` azzurro, uno per schermata. */
export function Pulsante({ children, color = 'primary', size = 'md', iconLeading, iconTrailing, onPress, isDisabled, isLoading, type = 'button', href, target, className, form, ...aria }: ButtonProps) {
  const cls = cx('fa-btn', COLOR_CLASS[color], size === 'sm' && 'sm', !children && 'ico', (isDisabled || isLoading) && 'dis', className)
  const body = (
    <>
      {isLoading ? <Loader size={20} label="Operazione in corso" /> : iconLeading ? icon(iconLeading) : null}
      {children}
      {iconTrailing ? icon(iconTrailing) : null}
    </>
  )
  if (href)
    return (
      <AriaLink href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} className={cls} isDisabled={isDisabled} aria-label={aria['aria-label']}>
        {body}
      </AriaLink>
    )
  return (
    <AriaButton type={type} form={form} className={cls} onPress={onPress} isDisabled={isDisabled || isLoading} aria-label={aria['aria-label']} aria-expanded={aria['aria-expanded']}>
      {body}
    </AriaButton>
  )
}

/** Pulsante rotondo con sola icona (44px): `surface-high`, il principale in azzurro. Ha sempre un'etichetta. */
export function PulsanteIcona({ icon: name, label, onPress, primary, className, expanded, pressed, badge, isDisabled }: { icon: SvName; label: string; onPress?: () => void; primary?: boolean; className?: string; expanded?: boolean; pressed?: boolean; badge?: number; isDisabled?: boolean }) {
  return (
    <AriaButton className={cx('fa-ib', primary && 'pri', className)} isDisabled={isDisabled} aria-label={label} onPress={onPress} aria-expanded={expanded} aria-pressed={pressed}>
      <Sv name={name} />
      {badge ? <span className="fa-ibn">{badge}</span> : null}
    </AriaButton>
  )
}

/** Tre puntini verticali che aprono un popover con poche azioni (tastiera e lettore di schermo con react-aria). */
export function MenuAzioni({ label, azioni }: { label: string; azioni: { id: string; label: string; onPress: () => void }[] }) {
  return (
    <AriaMenuTrigger>
      <AriaButton className="fa-dots" aria-label={label}>
        <Sv name="dotsv" size={20} />
      </AriaButton>
      <AriaPopover className="fa-pop" placement="bottom" offset={12}>
        <AriaOverlayArrow className="fa-poparr">
          {/* quadrato ruotato a cavallo del bordo del pannello: stesso fondo e stesso bordo, quindi un pezzo unico */}
          <span className="dia" aria-hidden="true" />
        </AriaOverlayArrow>
        <AriaMenu className="fa-popm" aria-label={label} onAction={(k) => azioni.find((a) => a.id === k)?.onPress()}>
          {azioni.map((a) => (
            <AriaMenuItem key={a.id} id={a.id} className="fa-popi">
              {a.label}
            </AriaMenuItem>
          ))}
        </AriaMenu>
      </AriaPopover>
    </AriaMenuTrigger>
  )
}

/* ---------------------------------------------------------------- Campo (Input) */

interface InputProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'time' | 'date'
  inputMode?: 'decimal' | 'numeric' | 'text' | 'email' | 'url' | 'tel' | 'search'
  icon?: SvName
  hint?: ReactNode
  /** Messaggio d'errore: se c'è, il campo è in errore (bordo rosso, icona e frase sotto). */
  error?: string | null
  /** Aiuto positivo («Diviso in quattro: …»): pillola tinta acqua. */
  positive?: ReactNode
  autoComplete?: string
  required?: boolean
  maxLength?: number
  min?: string
  max?: string
  autoFocus?: boolean
  onBlur?: () => void
  /** Solo per l'orario: da vuoto il selettore si apre su 00:00 (il campo resta vuoto finché non si sceglie un valore). */
  da00?: boolean
  textarea?: boolean
  trailing?: ReactNode
  name?: string
  /** Id di un <datalist> con i suggerimenti. */
  list?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  enterKeyHint?: 'done' | 'go' | 'next' | 'search' | 'send'
  hideLabel?: boolean
}

/** Segnaposto di riserva: ogni campo vuoto dice cosa scrivere o scegliere, anche dove chi lo usa non ne ha dato uno. */
export function segnaposto(label: string, type: string, textarea: boolean): string {
  const l = label.toLowerCase()
  // con l'etichetta «Data» o «Ora» (dentro «Partenza», «Check-in»…) il segnaposto la ripeterebbe: niente segnaposto
  if (type === 'date') return l === 'data' ? '' : 'Data'
  if (type === 'time') return l === 'ora' || l === 'imbarco' ? '' : 'Ora'
  if (/codice/.test(l)) return 'es. AB12CD'
  if (/terminal/.test(l)) return 'es. T1'
  if (/gate/.test(l)) return 'es. B12'
  if (/^posto\b/.test(l)) return 'es. 14A'
  if (/binario/.test(l)) return 'es. 5'
  if (/bagaglio/.test(l)) return 'es. 1 bagaglio da 23 kg'
  if (/cambio|rimborso/.test(l)) return 'es. Cambio gratuito fino a 24 ore prima'
  if (/indirizzo/.test(l)) return 'Via e numero'
  if (/latitudine/.test(l)) return 'Latitudine'
  if (/longitudine/.test(l)) return 'Longitudine'
  if (/importo|prezzo|costo/.test(l)) return '0,00'
  if (/e-?mail/.test(l) || type === 'email') return 'nome@esempio.it'
  if (type === 'password') return 'La tua password'
  if (/password/.test(l)) return 'La tua password'
  if (/nome/.test(l)) return 'Scrivi il nome'
  if (/nota|note|descrizione/.test(l)) return textarea ? 'Scrivi qui' : 'Scrivi una nota'
  return textarea ? 'Scrivi qui' : 'Scrivi qui'
}

/** Campo del design system (Untitled UI `Input`): 56px, etichetta sopra, aiuto o errore sotto. */
/** Mette il focus senza far scorrere la pagina: l'`autoFocus` del browser, con il campo in una testa fissa, saltava in cima e poi tornava giù. */
export function useFocoIniziale<T extends HTMLElement>(attivo: boolean | undefined) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (attivo) ref.current?.focus({ preventScroll: true })
  }, [attivo])
  return ref
}

export function Campo({ label, value, onChange, placeholder, type = 'text', inputMode, icon: ic, hint, error, positive, textarea, trailing, hideLabel, da00, onBlur, autoFocus, ...rest }: InputProps) {
  const id = useId()
  const foco = useFocoIniziale<HTMLInputElement>(autoFocus && !textarea)
  const focoTa = useFocoIniziale<HTMLTextAreaElement>(autoFocus && textarea)
  const [anteprima, setAnteprima] = useState(false)
  const helpId = `${id}-h`
  const described = error || hint || positive ? helpId : undefined
  const ph = placeholder ?? segnaposto(label, type, !!textarea)
  const mostrato = value || (anteprima ? '00:00' : '')
  const pickerVuoto = (type === 'date' || type === 'time') && !mostrato
  return (
    <div className="fa-fld">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
      </label>
      <span className={cx('fa-in', textarea && 'ta', error && 'bad', pickerVuoto && 'vuoto')}>
        {ic ? <Sv name={ic} size={20} /> : null}
        {textarea ? (
          <textarea ref={focoTa} id={id} value={value} placeholder={ph} onChange={(e) => onChange(e.currentTarget.value)} aria-invalid={error ? true : undefined} aria-describedby={described} maxLength={rest.maxLength} rows={3} />
        ) : (
          <input ref={foco} id={id} type={type} inputMode={inputMode} value={mostrato} placeholder={ph} onChange={(e) => { setAnteprima(false); onChange(e.currentTarget.value) }} onBlur={() => { setAnteprima(false); onBlur?.() }} onClick={type === 'time' || type === 'date' ? (e) => { const el = e.currentTarget; if (da00 && type === 'time' && !value) flushSync(() => setAnteprima(true)); apriSelettore(el) } : undefined} aria-invalid={error ? true : undefined} aria-describedby={described} {...rest} />
        )}
        {pickerVuoto ? <span className="ph" aria-hidden="true">{ph}</span> : null}
        {trailing}
      </span>
      {error ? (
        <span id={helpId} className="fa-help bad" role="alert">
          <Sv name="err" size={16} />
          {error}
        </span>
      ) : positive ? (
        <span id={helpId} className="fa-help ok">
          {positive}
        </span>
      ) : hint ? (
        <span id={helpId} className="fa-help">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------- Interruttore (Toggle) */

/** Interruttore del design system (Untitled UI `Toggle`): riga da 44px con l'etichetta a sinistra. */
export function Interruttore({ label, hint, isSelected, onChange, isDisabled }: { label: ReactNode; hint?: ReactNode; isSelected: boolean; onChange: (v: boolean) => void; isDisabled?: boolean }) {
  return (
    <AriaSwitch className="fa-sw" isSelected={isSelected} onChange={onChange} isDisabled={isDisabled}>
      <span className="fa-swl">
        <span>{label}</span>
        {hint ? <span className="fa-c">{hint}</span> : null}
      </span>
      <span className={cx('fa-tr', !isSelected && 'off')} aria-hidden="true">
        <i />
      </span>
    </AriaSwitch>
  )
}

/* ---------------------------------------------------------------- Badge, stati, avatar */

/** Pillola di stato (Untitled UI `Badge` pill-color). */
export function Pillola({ children, tone, icon: ic }: { children: ReactNode; tone?: 'soft' | 'acq' | 'cor' | 'mut'; icon?: SvName }) {
  return (
    <span className={cx('fa-pillst', tone)}>
      {ic ? <Sv name={ic} size={14} /> : null}
      {children}
    </span>
  )
}

/** Stato con icona e parola: mai solo il colore. */
export function Stato({ children, tone, icon: ic }: { children: ReactNode; tone: 'ok' | 'wa' | 'ba' | 'br'; icon: SvName }) {
  return (
    <span className={cx('fa-st', tone)}>
      <Sv name={ic} size={16} />
      {children}
    </span>
  )
}

/** Avatar a disco con le iniziali: `n` sceglie il disco (1 corallo, 2 glicine, 3 cielo, 4 menta, 5 rosa). */
export function Avatar({ initials, n = 1, large, label }: { initials: string; n?: number; large?: boolean; label?: string }) {
  return (
    <span className={cx('fa-av', `r${((n - 1) % 5) + 1}`, large && 'l')} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {initials}
    </span>
  )
}

export function Avatars({ people, ring = true, label }: { people: { initials: string; n: number }[]; ring?: boolean; label?: string }) {
  return (
    <span className={cx('fa-avs', ring && 'anello')} role={label ? 'img' : undefined} aria-label={label}>
      {people.map((p, i) => (
        <Avatar key={i} initials={p.initials} n={p.n} />
      ))}
    </span>
  )
}

/* ---------------------------------------------------------------- struttura */

/** Intestazione di sezione: titolo a sinistra, testo o azione a destra. */
export function Sezione({ title, right, id, level = 2 }: { title: ReactNode; right?: ReactNode; id?: string; level?: 2 | 3 }) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <div className="fa-sech">
      <H className="fa-h3" id={id}>
        {title}
      </H>
      {right}
    </div>
  )
}

// Un dito che ha fatto scorrere una riga non sta scegliendo un filtro. Con il tocco, Safari a volte non annulla il «press» durante lo
// scroll e il chip sotto il dito si selezionava al rilascio: qui si ricorda quanto si è mosso il dito e quando ha scorso l'ultimo elemento.
const TOCCO = { tipo: '', x: 0, y: 0, mosso: false, scroll: -1e9 }
const SOGLIA_MOVIMENTO = 10
const SOGLIA_SCROLL_MS = 120
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => Object.assign(TOCCO, { tipo: e.pointerType, x: e.clientX, y: e.clientY, mosso: false }), { capture: true, passive: true })
  document.addEventListener(
    'pointermove',
    (e) => {
      if (TOCCO.tipo !== 'mouse' && !TOCCO.mosso && Math.hypot(e.clientX - TOCCO.x, e.clientY - TOCCO.y) > SOGLIA_MOVIMENTO) TOCCO.mosso = true
    },
    { capture: true, passive: true },
  )
  document.addEventListener('scroll', () => (TOCCO.scroll = performance.now()), { capture: true, passive: true })
}
/** Vero se il «press» è il rilascio di un dito che stava scorrendo (tastiera e lettore di schermo non contano). */
export function eScorrimento(pointerType: string): boolean {
  if (pointerType !== 'touch' && pointerType !== 'pen') return false
  return TOCCO.mosso || performance.now() - TOCCO.scroll < SOGLIA_SCROLL_MS
}

/** Chip/filtro da 36px (area tappabile 44px). */
export function Chip({ children, on, onPress, icon: ic, label }: { children: ReactNode; on?: boolean; onPress?: () => void; icon?: ReactNode; label?: string }) {
  return (
    <AriaButton className={cx('fa-chip', on && 'on')} aria-pressed={on} onPress={(e) => (eScorrimento(e.pointerType) ? undefined : onPress?.())} aria-label={label}>
      {ic}
      {children != null && children !== false ? <span className="t">{children}</span> : null}
    </AriaButton>
  )
}

/** Selettore a due o più segmenti (es. Elenco | Mappa, Di tutti | Mie). */
export function Segmenti<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="fa-seg" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : undefined} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Banner informativo: `cor` per avvisi, `az` per informazioni, `ac` per conferme. */
export function Banner({ tone, icon: ic, title, children, action }: { tone: 'cor' | 'az' | 'ac'; icon: SvName; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cx('fa-banner', tone)} role="status">
      <Sv name={ic} size={20} />
      <span style={{ flex: 1, minWidth: 0 }}>
        {title ? <b>{title}</b> : null} {children}
      </span>
      {action}
    </div>
  )
}

/** Barra di avanzamento sottile. */
export function Barra({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="fa-pbar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}
