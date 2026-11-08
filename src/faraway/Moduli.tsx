// Pezzi comuni dei fogli (docs/linee-guida/03-modali-e-moduli.md): gruppi con titolo, «Altri dettagli» che si apre come
// un gruppo, percorso partenza → arrivo con la durata, riquadri con l'immagine, «Per chi», «Il costo è» e il contatore.
import { useEffect, useId, useState, type ReactNode } from 'react'
import { alterna, alternaPersona, conseguenzaCosto, modoPerChi, selezionePerModo, type ModoPerChi } from '../lib/moduli'
import { discOf, initials } from '../state/me'
import type { Trip } from '../types'
import { Ic } from '../ui/Sprite'
import { cx } from './cx'
import { Sv, type SvName } from './icons'

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']
const primo = (name: string) => name.split(/\s+/)[0]

/** Gruppo di campi con un titolo: 16 px tra i campi, 32 px tra un gruppo e l'altro (classe `grp` sul modulo). */
export function Gruppo({ titolo, children, id }: { titolo: string; children: ReactNode; id?: string }) {
  const h = useId()
  return (
    <section className="fa-grp" aria-labelledby={h} id={id}>
      <h3 id={h}>{titolo}</h3>
      {children}
    </section>
  )
}

/** Titolo piccolo dentro un gruppo (una tratta, l'apertura del check-in). */
export function Micro({ titolo, nota, livello = 4 }: { titolo: string; nota?: string; livello?: 4 | 5 }) {
  const H = livello === 5 ? 'h5' : 'h4'
  return (
    <H className="fa-micro">
      {titolo}
      {nota ? <span>{nota}</span> : null}
    </H>
  )
}

/**
 * «Altri dettagli»: l'ultimo gruppo del foglio, con i campi che servono di rado. Da chiuso è solo un titolo con la freccia
 * e sotto che cosa contiene (o quanti campi sono compilati); si apre da solo se un campo è compilato o se dentro c'è un errore.
 */
export function AltriDettagli({ pieni, contenuto, errore, apriSeCompilati = true, children }: {
  pieni: number
  contenuto: string
  /** un errore dentro la sezione: la apre (passare un valore nuovo a ogni salvataggio, es. l'oggetto degli errori) */
  errore?: unknown
  /** `false` per campi che si compilano da soli (le coordinate): contano, ma non aprono la sezione. */
  apriSeCompilati?: boolean
  children: ReactNode
}) {
  const [aperta, setAperta] = useState(apriSeCompilati && pieni > 0)
  useEffect(() => {
    if (errore) setAperta(true)
  }, [errore])
  return (
    <details className="fa-altri" open={aperta} onToggle={(e) => setAperta(e.currentTarget.open)}>
      <summary>
        <span>
          <span className="t">Altri dettagli</span>
          <span className="m">{pieni > 0 ? `${pieni} ${pieni === 1 ? 'compilato' : 'compilati'}` : contenuto}</span>
        </span>
        <span className="chv" aria-hidden="true">
          <Sv name="chev" size={20} />
        </span>
      </summary>
      {aperta ? <div className="in">{children}</div> : null}
    </details>
  )
}

interface Punto {
  titolo: string
  children: ReactNode
}

/** Partenza e arrivo come due punti di una linea, con la durata in mezzo (se si può calcolare). */
export function Percorso({ da, a, durata, livello = 4 }: { da: Punto; a: Punto; durata?: string; livello?: 4 | 5 }) {
  const H = livello === 5 ? 'h5' : 'h4'
  const punto = (p: Punto, fine: boolean) => (
    <div className={cx('tp', fine && 'end')} role="group" aria-label={p.titolo}>
      <span className="rail" aria-hidden="true" />
      <div className="cnt">
        <H>{p.titolo}</H>
        {p.children}
      </div>
    </div>
  )
  return (
    <div className="fa-perc">
      {punto(da, false)}
      {durata ? (
        <div className="tp dur">
          <span className="rail" aria-hidden="true" />
          <span className="pill">
            <span className="sr-only">Durata: </span>
            {durata}
          </span>
        </div>
      ) : null}
      {punto(a, true)}
    </div>
  )
}

export interface Riquadro<T extends string> {
  value: T
  label: string
  /** glifo dello sprite (g-tra-train, g-cat-food…) */
  glifo?: string
  icona?: SvName
  sub?: string
}

/** Riquadri con l'immagine (come «Dove» della checklist): una scelta tra poche opzioni importanti. */
export function Riquadri<T extends string>({ label, cols, value, options, onChange, deselezionabile, children, error }: {
  label: string
  cols: number
  value: T | ''
  options: Riquadro<T>[]
  onChange: (v: T | '') => void
  /** toccando di nuovo la scelta la si toglie */
  deselezionabile?: boolean
  children?: ReactNode
  error?: string
}) {
  return (
    <div className="fa-fld k-ChecklistNuova" role="group" aria-label={label}>
      {label}
      <div className="sg" style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
        {options.map((o) => (
          <button key={o.value} type="button" className={cx('seg', 'fa-riq', value === o.value && 'on')} aria-pressed={value === o.value} onClick={() => onChange(deselezionabile ? alterna(value, o.value) : o.value)}>
            {o.glifo ? <Ic name={o.glifo} size={36} className="gl" /> : o.icona ? <Sv name={o.icona} size={24} className="ic" /> : null}
            <span className="lb">{o.label}</span>
            {o.sub ? <span className="sb">{o.sub}</span> : null}
          </button>
        ))}
      </div>
      {children}
      {error ? (
        <span className="fa-help bad" role="alert">
          <Sv name="err" size={16} />
          {error}
        </span>
      ) : null}
    </div>
  )
}

/**
 * «Per chi» a riquadri. Una persona: niente. Due: «Tutti», «Solo io» e «Solo <l'altra>». Da tre in su: «Tutti», «Solo io»
 * e «Scegli», che apre l'elenco delle persone con la spunta. La scelta non resta mai vuota.
 */
export function PerChi({ trip, meId, value, onChange, label = 'Per chi', help }: { trip: Pick<Trip, 'travelers'>; meId?: string | null; value: string[]; onChange: (ids: string[]) => void; label?: string; help?: ReactNode }) {
  const all = trip.travelers.map((p) => p.id)
  const me = meId && all.includes(meId) ? meId : null
  const [scegli, setScegli] = useState(() => all.length >= 3 && modoPerChi(value, all, me, false) === 'pick')
  if (all.length < 2) return null
  const modo = modoPerChi(value, all, me, scegli)
  const nome = (id: string) => primo(trip.travelers.find((p) => p.id === id)?.name ?? '')
  const opzioni: Riquadro<ModoPerChi>[] = [
    { value: 'all', label: 'Tutti', icona: 'users', sub: all.length === 2 ? `${nome(all[0])} e ${nome(all[1])}` : `${all.length} persone` },
  ]
  if (me) opzioni.push({ value: 'me', label: 'Solo io', icona: 'user', sub: nome(me) })
  if (all.length === 2) for (const id of all.filter((x) => x !== me)) opzioni.push({ value: `solo:${id}`, label: `Solo ${nome(id)}`, icona: 'user' })
  else opzioni.push({ value: 'pick', label: 'Scegli', icona: 'users', sub: modo === 'pick' ? `${value.length} di ${all.length}` : 'Alcune persone' })
  const scelti = value.length > 0 ? value : all
  return (
    <Riquadri<ModoPerChi>
      label={label}
      cols={opzioni.length}
      value={modo}
      options={opzioni}
      onChange={(m) => {
        if (!m) return
        setScegli(m === 'pick')
        onChange(selezionePerModo(m, scelti, all, me))
      }}
    >
      {modo === 'pick' ? (
        <div className="pk" role="group" aria-label="Persone">
          {trip.travelers.map((p) => {
            const on = scelti.includes(p.id)
            const ultimo = on && scelti.length === 1
            return (
              <button key={p.id} type="button" className="pr" role="checkbox" aria-checked={on} aria-disabled={ultimo || undefined} onClick={() => !ultimo && onChange(alternaPersona(scelti, p.id, all))}>
                <span className="av" aria-hidden="true" style={{ ['--c' as string]: `var(--disco-${COL[(discOf(trip, p.id) - 1) % 5]})` }}>
                  {initials(p.name)}
                </span>
                <b>
                  {p.name}
                  {p.id === me ? ' (io)' : ''}
                </b>
                <span className={cx('cb', on && 'on')} aria-hidden="true">
                  <Sv name="check" size={14} className="ic" />
                </span>
              </button>
            )
          })}
          {scelti.length === 1 ? <span className="fa-help">Serve almeno una persona.</span> : null}
        </div>
      ) : null}
      {help}
    </Riquadri>
  )
}

/** «Il costo è»: a persona o totale, con sotto quanto fa l'altra lettura. Con una persona sola non serve e non si mostra. */
export function IlCostoE({ value, onChange, amount, persone, currency }: { value: 'per_person' | 'total'; onChange: (v: 'per_person' | 'total') => void; amount: number | null; persone: number; currency: string }) {
  if (persone < 2) return null
  const c = conseguenzaCosto(amount, persone, currency)
  return (
    <Riquadri<'per_person' | 'total'>
      label="Il costo è"
      cols={2}
      value={value}
      onChange={(v) => v && onChange(v)}
      options={[
        { value: 'per_person', label: 'A persona', icona: 'user', sub: c.perPersona || undefined },
        { value: 'total', label: 'Totale', icona: 'users', sub: c.totale || undefined },
      ]}
    />
  )
}

/** Contatore − n + per numeri piccoli. Con `vuoto` il numero si può togliere (sotto 1 torna «—», non indicato). */
export function Contatore({ label, hint, value, onChange, min = 1, max = 99, vuoto }: { label: string; hint?: string; value: number | null; onChange: (n: number | null) => void; min?: number; max?: number; vuoto?: boolean }) {
  const meno = value === null ? null : value <= min ? (vuoto ? null : min) : value - 1
  const piu = value === null ? min : Math.min(max, value + 1)
  const id = useId()
  return (
    <div className="fa-cont" role="group" aria-labelledby={id}>
      <span className="l">
        <b id={id}>{label}</b>
        {hint ? <span>{hint}</span> : null}
      </span>
      <span className="ctl">
        <button type="button" className="fa-ib" aria-label={`${label}: uno in meno`} disabled={value === null || (!vuoto && value <= min)} hidden={value === null} onClick={() => onChange(meno)}>
          <Sv name="minus" size={20} />
        </button>
        <output aria-live="polite" className={value === null ? 'vuoto' : undefined} aria-label={value === null ? `${label}: non indicato` : undefined}>
          {value === null ? '—' : value}
        </output>
        <button type="button" className="fa-ib" aria-label={`${label}: uno in più`} disabled={value !== null && value >= max} onClick={() => onChange(piu)}>
          <Sv name="plus" size={20} />
        </button>
      </span>
    </div>
  )
}

/** Selettore a segmenti facoltativo: si può lasciare vuoto e la stessa scelta, toccata di nuovo, si toglie. */
export function SegmentiFacoltativi<T extends string>({ label, value, options, onChange, help }: { label: string; value: T | ''; options: { value: T; label: string; nome?: string }[]; onChange: (v: T | '') => void; help?: string }) {
  return (
    <div className="fa-fld" role="group" aria-label={label}>
      {label}
      <div className="fa-seg" style={{ gridTemplateColumns: `repeat(${options.length},minmax(0,1fr))` }}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} aria-label={o.nome} className={value === o.value ? 'on' : undefined} onClick={() => onChange(alterna(value, o.value))}>
            {o.label}
          </button>
        ))}
      </div>
      <span className="fa-help">{value ? 'Tocca di nuovo la scelta per toglierla.' : (help ?? 'Facoltativo.')}</span>
    </div>
  )
}
