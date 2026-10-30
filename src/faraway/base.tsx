// Componenti di base del design system Faraway, costruiti come in Untitled UI React
// (stesse API: Button con color/size/iconLeading/onPress, Input, Toggle, Badge, Avatar, sopra
// React Aria Components) ma con l'aspetto del mock (classi .fa-* di faraway.css).
import type { ReactNode } from 'react'
import { useId } from 'react'
import { Button as AriaButton, Link as AriaLink, Switch as AriaSwitch } from 'react-aria-components'
import { cx } from './cx'
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
  const cls = cx('fa-btn', COLOR_CLASS[color], size === 'sm' && 'sm', (isDisabled || isLoading) && 'dis', className)
  const body = (
    <>
      {iconLeading ? icon(iconLeading) : null}
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
export function PulsanteIcona({ icon: name, label, onPress, primary, className, expanded, pressed, badge }: { icon: SvName; label: string; onPress?: () => void; primary?: boolean; className?: string; expanded?: boolean; pressed?: boolean; badge?: number }) {
  return (
    <AriaButton className={cx('fa-ib', primary && 'pri', className)} aria-label={label} onPress={onPress} aria-expanded={expanded} aria-pressed={pressed}>
      <Sv name={name} />
      {badge ? <span className="fa-ibn">{badge}</span> : null}
    </AriaButton>
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
  textarea?: boolean
  trailing?: ReactNode
  name?: string
  enterKeyHint?: 'done' | 'go' | 'next' | 'search' | 'send'
  hideLabel?: boolean
}

/** Campo del design system (Untitled UI `Input`): 56px, etichetta sopra, aiuto o errore sotto. */
export function Campo({ label, value, onChange, placeholder, type = 'text', inputMode, icon: ic, hint, error, positive, textarea, trailing, hideLabel, ...rest }: InputProps) {
  const id = useId()
  const helpId = `${id}-h`
  const described = error || hint || positive ? helpId : undefined
  return (
    <div className="fa-fld">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>
        {label}
      </label>
      <span className={cx('fa-in', textarea && 'ta', error && 'bad')}>
        {ic ? <Sv name={ic} size={20} /> : null}
        {textarea ? (
          <textarea id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.currentTarget.value)} aria-invalid={error ? true : undefined} aria-describedby={described} maxLength={rest.maxLength} rows={3} />
        ) : (
          <input id={id} type={type} inputMode={inputMode} value={value} placeholder={placeholder} onChange={(e) => onChange(e.currentTarget.value)} aria-invalid={error ? true : undefined} aria-describedby={described} {...rest} />
        )}
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
    <span className={cx('fa-avs', ring && 'ring')} role={label ? 'img' : undefined} aria-label={label}>
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

/** Chip/filtro da 36px (area tappabile 44px). */
export function Chip({ children, on, onPress, icon: ic, label }: { children: ReactNode; on?: boolean; onPress?: () => void; icon?: ReactNode; label?: string }) {
  return (
    <AriaButton className={cx('fa-chip', on && 'on')} aria-pressed={on} onPress={onPress} aria-label={label}>
      {ic}
      {children}
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
