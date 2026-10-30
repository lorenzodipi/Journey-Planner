// Componenti di Oggi (mock Fa-03…Fa-07, Fa-52…Fa-55): Copertina (saluto), conto alla rovescia (Ticket),
// ChecklistHome, Orologio, Meteo, Biglietto, ValutaPiccola, Riepilogo.
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link } from 'wouter'
import { formatMoney } from '../lib/money'
import { decimalsOf } from '../lib/fx'
import { initials } from '../state/me'
import { Ic } from '../ui/Sprite'
import { cx } from './cx'
import { G } from './Tappe'
import { Wx, wxKind } from './Wx'

/** Simbolo di Faraway (anello di dischi che diventa mongolfiera), come nel mock. */
export function Simbolo({ style, tinta = 'var(--tinta-azzurro)' }: { style?: React.CSSProperties; tinta?: string }) {
  const c = (cx_: number, cy: number, fill: string) => <circle cx={cx_} cy={cy} r="17" fill={fill} stroke={tinta} strokeWidth="3" />
  return (
    <svg aria-hidden="true" viewBox="2 2 124 146" style={style}>
      <path d="M50 110L58 126M78 110L70 126" fill="none" stroke="var(--brand-800, #075A99)" strokeLinecap="round" strokeWidth="3.4" />
      <rect fill="var(--brand-800, #075A99)" height="16" rx="4.5" width="22" x="53" y="125" />
      {c(64, 24, 'var(--corallo)')}
      <circle cx="64" cy="24" r="5.5" fill={tinta} />
      {c(95.27, 39.06, '#0084D2')}
      {c(103, 72.9, '#0A7BDA')}
      {c(81.36, 100.04, '#4A72DE')}
      {c(46.64, 100.04, '#6A69DB')}
      {c(25, 72.9, '#8460D2')}
      {c(32.73, 39.06, '#9B56C2')}
    </svg>
  )
}

/** Simbolo semplice (senza contorno), come nel biglietto del conto alla rovescia e nel recap. */
export function SimboloPiatto({ style }: { style?: React.CSSProperties }) {
  return (
    <svg aria-label="Faraway, simbolo" role="img" viewBox="6 6 116 140" style={{ position: 'absolute', height: 'auto', pointerEvents: 'none', ...style }}>
      <title>Faraway, simbolo</title>
      <path d="M52 112L59 127M76 112L69 127" fill="none" stroke="#075A99" strokeLinecap="round" strokeWidth="3" />
      <rect fill="#075A99" height="14" rx="4" width="20" x="54" y="126" />
      <path d="M47 24a17 17 0 1 0 34 0a17 17 0 1 0 -34 0ZM58.5 24a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0Z" fill="#F04C55" fillRule="evenodd" />
      <circle cx="95.27" cy="39.06" fill="#0084D2" r="17" />
      <circle cx="103" cy="72.9" fill="#0A7BDA" r="17" />
      <circle cx="81.36" cy="100.04" fill="#4A72DE" r="17" />
      <circle cx="46.64" cy="100.04" fill="#6A69DB" r="17" />
      <circle cx="25" cy="72.9" fill="#8460D2" r="17" />
      <circle cx="32.73" cy="39.06" fill="#9B56C2" r="17" />
    </svg>
  )
}

/** Intestazione di Oggi: data lunga, saluto e avatar (→ Account e profilo). */
export function Saluto({ date, greeting, name }: { date: string; greeting: string; name?: string }) {
  return (
    <div className="k-Copertina">
      <header>
        <div>
          <div className="m">{date}</div>
          <h2>{name ? `${greeting} ${name}` : greeting}</h2>
        </div>
        {name ? (
          <Link href="/altro/account" className="me" aria-label="Account e profilo" style={{ textDecoration: 'none' }}>
            {initials(name)}
          </Link>
        ) : null}
      </header>
    </div>
  )
}

const PLANE = 'M482.3 192c34.2 0 93.7 29 93.7 64c0 36-59.5 64-93.7 64l-116.6 0L265.2 495.9c-5.7 10-16.3 16.1-27.8 16.1l-56.2 0c-10.6 0-18.3-10.2-15.4-20.4l49-171.6L112 320 68.8 377.6c-3 4-7.8 6.4-12.8 6.4l-42 0c-7.8 0-14-6.3-14-14c0-1.3 .2-2.6 .5-3.9L32 256 .5 145.9c-.4-1.3-.5-2.6-.5-3.9c0-7.8 6.3-14 14-14l42 0c5 0 9.8 2.4 12.8 6.4L112 192l102.9 0-49-171.6C162.9 10.2 170.6 0 181.2 0l56.2 0c11.5 0 22.1 6.2 27.8 16.1L365.7 192l116.6 0z'

/** Biglietto del conto alla rovescia (Ticket cd2): giorni grandi, meta e, se c'è, il prossimo volo. */
export function ContoAllaRovescia({ days, meta, next }: { days: number; meta: string; next?: { from: string; to: string; date: string } }) {
  const label = days <= 0 ? `Si parte oggi${meta ? ` per ${meta}` : ''}` : `${days} ${days === 1 ? 'giorno' : 'giorni'} alla partenza${meta ? ` per ${meta}` : ''}`
  return (
    <div className="k-Ticket">
      <div className="tk cd2">
        <div className={cx('a cd2-top', next && 'v-top')} style={{ position: 'relative', ...(next ? null : { borderRadius: 'var(--radius-xl)' }) }}>
          <SimboloPiatto style={{ right: 18, top: 18, width: 44 }} />
          <div aria-hidden="true" className="bar">
            <i />
            <i />
            <i />
          </div>
          <div className="cd2-in" role="text" aria-label={label}>
            <div aria-hidden="true" className="k1">
              {days <= 0 ? 'Il giorno è arrivato' : days === 1 ? 'Alla partenza manca' : 'Alla partenza mancano'}
            </div>
            <div aria-hidden="true" className="cdl">
              {days <= 0 ? (
                <span className="un">
                  <b style={{ fontSize: 40, lineHeight: '44px' }}>Si parte oggi</b>
                  {meta ? <span>per {meta}</span> : null}
                </span>
              ) : (
                <>
                  <span className="num">{days}</span>
                  <span className="un">
                    <b>{days === 1 ? 'giorno' : 'giorni'}</b>
                    {meta ? <span>per {meta}</span> : null}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {next ? (
          <div className="b cd2-bot">
            <div className="k1">Prossima partenza</div>
            <div className="rr3" aria-label={`Da ${next.from} a ${next.to}`}>
              <span>{next.from}</span>
              <span className="pl3">
                <svg aria-hidden="true" width="34" height="34" viewBox="0 0 576 512">
                  <path d={PLANE} fill="currentColor" />
                </svg>
              </span>
              <span>{next.to}</span>
            </div>
            <div className="dt">{next.date}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export interface VoceHome {
  id: string
  text: string
  tag: string
  tagAll: boolean
  done: boolean
}

/** «Le mie cose» (ChecklistHome, variante a tondo): anello, fino a 4 voci, stati quasi finita / tutto fatto / vuota. */
export function ChecklistHome({ done, total, items, rest, onToggle, onOpen, onCreate }: { done: number; total: number; items: VoceHome[]; rest: number; onToggle: (id: string) => void; onOpen: () => void; onCreate: () => void }) {
  const r = 18
  const circ = 2 * Math.PI * r
  if (total === 0)
    return (
      <div className="k-ChecklistHome">
        <div className="card">
          <div className="hd">
            <span className="t">Le mie cose</span>
          </div>
          <div className="em">
            <span className="eb">
              <G name="g-list" />
            </span>
            <b>Prepara il viaggio</b>
            <span>Segna cosa fare e cosa mettere in valigia, per tutti o solo per te.</span>
            <button type="button" className="btn pri" style={{ marginTop: 8 }} onClick={onCreate}>
              <G name="g-plus" />
              Crea la checklist
            </button>
          </div>
        </div>
      </div>
    )
  const left = total - done
  return (
    <div className="k-ChecklistHome">
      <div className="card">
        <div className="hd rh">
          <span className="rg" role="progressbar" aria-label="Checklist completata" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
            <svg viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={r} fill="none" stroke="var(--surface-high)" strokeWidth="5" />
              <circle cx="22" cy="22" r={r} fill="none" stroke="var(--azzurro-solid)" strokeWidth="5" strokeLinecap="round" strokeDasharray={circ.toFixed(1)} strokeDashoffset={(circ * (1 - done / total)).toFixed(1)} transform="rotate(-90 22 22)" />
            </svg>
            <b>
              {done}/{total}
            </b>
          </span>
          <div>
            <div className="t">Le mie cose</div>
            <div className="c">
              {done} {done === 1 ? 'fatta' : 'fatte'} su {total}
            </div>
          </div>
        </div>
        {left === 0 ? (
          <div className="em ok">
            <span className="eb">
              <G name="g-check" />
            </span>
            <b>Tutto pronto</b>
            <span>Hai spuntato tutte le tue cose: buon viaggio!</span>
          </div>
        ) : (
          <ul className="l">
            {items.map((i) => (
              <li className="it" key={i.id}>
                <button type="button" className="ck" role="checkbox" aria-checked={i.done} aria-label={i.text} onClick={() => onToggle(i.id)}>
                  <b>
                    <G name="g-check" />
                  </b>
                </button>
                <div className="tx">
                  <span className="n">{i.text}</span>
                  <div className="mt">
                    <span className={cx('tag', i.tagAll && 'all')}>
                      <G name={i.tagAll ? 'g-users' : 'g-user'} />
                      {i.tag}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="ft">
          <button type="button" className="btn lnk" onClick={onOpen}>
            {left === 0 ? 'Rivedi la checklist' : left === 1 ? 'Vai alla checklist' : 'Vedi tutta la checklist'}
            {left > 1 && rest > 0 ? (
              <span className="cnt" style={{ marginLeft: 6 }}>
                altre {rest}
              </span>
            ) : null}
            <G name="g-chev" cls="r" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Cifre separate dell'orologio. */
const Cifre = ({ hhmm }: { hhmm: string }) => (
  <span aria-hidden="true" className="fl m">
    <i>{hhmm[0]}</i>
    <i>{hhmm[1]}</i>
    <b>:</b>
    <i>{hhmm[3]}</i>
    <i>{hhmm[4]}</i>
  </span>
)

const SunIc = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <g stroke="currentColor" strokeLinecap="round" strokeWidth="2">
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
    </g>
  </svg>
)
const MoonIc = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
    <path d="M15 3A9 9 0 1 0 21 15A7.5 7.5 0 0 1 15 3Z" fill="currentColor" />
  </svg>
)

/** Orologio: ora del posto e ora di casa, con la fase del giorno. */
export function Orologio({ here, home }: { here: { label: string; time: string; night: boolean; sub: string }; home: { label: string; time: string; night: boolean } }) {
  return (
    <div className="k-Orologio">
      <div className="side fly">
        <div className="sd" role="text" aria-label={`${here.label}, ${here.time}, ${here.night ? 'notte' : 'giorno'}`}>
          <div aria-hidden="true" className="lb">
            <span className={cx('ph', here.night ? 'notte' : 'giorno')}>{here.night ? <MoonIc /> : <SunIc />}</span>
            {here.label}
          </div>
          <Cifre hhmm={here.time} />
          <div aria-hidden="true" className="sb">
            {here.sub}
          </div>
        </div>
        <span aria-hidden="true" className="vd" />
        <div className="sd dim" role="text" aria-label={`${home.label}, ${home.time}`}>
          <div aria-hidden="true" className="lb">
            <span className={cx('ph', home.night ? 'notte' : 'giorno')}>{home.night ? <MoonIc /> : <SunIc />}</span>
            {home.label}
          </div>
          <Cifre hhmm={home.time} />
          <div aria-hidden="true" className="sb">
            A casa
          </div>
        </div>
      </div>
    </div>
  )
}

export interface OraMeteo {
  label: string
  t: number
  code: number
  night: boolean
  rain: boolean
  now: boolean
}

const RiseIc = ({ down }: { down?: boolean }) => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 18a5 5 0 0 0-10 0" />
    <path d={down ? 'M12 2v7M8.5 5.5L12 9l3.5-3.5' : 'M12 9V2M8.5 5.5L12 2l3.5 3.5'} />
    <path d="M2 21h20" />
  </svg>
)

/** Card del meteo (componente Meteo, «Adesso, con alba e tramonto»). */
export function MeteoCard({ city, t, code, night, desc, hours, sun }: { city: string; t: number; code: number; night: boolean; desc: string; hours: OraMeteo[]; sun?: { first: { k: string; v: string; down: boolean }; second: { k: string; v: string; down: boolean }; next: string; inText: string; pct: number; moon: boolean } }) {
  return (
    <div className="k-Meteo">
      <div className="wc det" role="group" aria-label={`${city}, ${t} gradi, ${desc}`}>
        <div className="wc-top">
          <div>
            <div className="loc">{city}</div>
            <div className="deg">{t}°</div>
            <div className="dsc">{desc}</div>
          </div>
          <div className="big-ic">
            <Wx kind={wxKind(code, night)} size={72} />
          </div>
        </div>
        <div aria-hidden="true" className="rule" />
        <ul className="hours" role="list" tabIndex={0} aria-label="Previsione ora per ora, scorri in orizzontale">
          {hours.map((h, i) => (
            <li key={i} className={cx('hr', h.now && 'now', h.rain && !h.now && 'rn')}>
              <span className="t">{h.label}</span>
              <Wx kind={wxKind(h.code, h.night)} size={32} />
              <span className="d">{h.t}°</span>
            </li>
          ))}
        </ul>
        {sun ? (
          <div className="sunrow" role="group" aria-label={`${sun.next} tra ${sun.inText}`}>
            <div className="se">
              <span className="ic">
                <RiseIc down={sun.first.down} />
              </span>
              <div>
                <div className="k">{sun.first.k}</div>
                <div className="v">{sun.first.v}</div>
              </div>
            </div>
            <div className="sm">
              <div className="nxt">
                <span>{sun.next} tra</span>
                <b>{sun.inText}</b>
              </div>
              <div aria-hidden="true" className="tr2">
                <i style={{ width: `${sun.pct}%`, background: sun.moon ? 'var(--wx-moon)' : 'var(--meteo-sole)' }} />
                <span className="mk" style={{ left: `${sun.pct}%` }}>
                  <Wx kind={sun.moon ? 'moon' : 'sun'} size={sun.moon ? 16 : 18} />
                </span>
              </div>
            </div>
            <div className="se r">
              <div>
                <div className="k">{sun.second.k}</div>
                <div className="v">{sun.second.v}</div>
              </div>
              <span className="ic">
                <RiseIc down={sun.second.down} />
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Avviso di pioggia del componente Meteo. */
export function AvvisoPioggia({ title, text }: { title: string; text: string }) {
  return (
    <div className="k-Meteo">
      <div className="alert" role="status">
        <span className="ai">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 18 0z" />
            <path d="M12 12v6a2 2 0 0 1-4 0" />
          </svg>
        </span>
        <div>
          <div className="v">{title}</div>
          <div className="s">{text}</div>
        </div>
      </div>
    </div>
  )
}

/** Biglietto piccolo (componente Biglietto, «ct»): disco, titolo, sottotitolo; a destra ora e dettaglio. */
export function BigliettoPiccolo({ glyph, title, sub, right, rightSub, tint = 'rosa', onPress, label }: { glyph: string; title: string; sub?: string; right?: string; rightSub?: string; tint?: string; onPress?: () => void; label: string }) {
  const body = (
    <article className={cx('ct', `t-${tint}`)} aria-label={label}>
      <div className="cl">
        <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24">
          <rect width="24" height="24" rx="12" fill="var(--kd)" />
          <svg x="5.5" y="5.5" width="13" height="13" viewBox="0 0 24 24" style={{ color: '#333' }}>
            <use href={`#${glyph}`} />
          </svg>
        </svg>
        <div>
          <div className="rt">{title}</div>
          {sub ? <div className="m">{sub}</div> : null}
        </div>
      </div>
      {right || rightSub ? (
        <div className="cr">
          {right ? <b>{right}</b> : null}
          {rightSub ? <span>{rightSub}</span> : null}
        </div>
      ) : null}
    </article>
  )
  return (
    <div className="k-Biglietto">
      {onPress ? (
        <button type="button" onClick={onPress} style={{ all: 'unset', display: 'block', cursor: 'pointer', width: '100%' }}>
          {body}
        </button>
      ) : (
        body
      )}
    </div>
  )
}

/** Convertitore rapido (ValutaPiccola): si scrive in una valuta e si legge l'altra. */
export function ValutaPiccola({ base, local, rate, baseName, localName }: { base: string; local: string; rate: number; baseName: string; localName: string }) {
  const [side, setSide] = useState<'base' | 'local'>('base')
  const [text, setText] = useState('100')
  const n = Number(text.replace(/\./g, '').replace(',', '.'))
  const valid = Number.isFinite(n)
  const other = valid ? (side === 'base' ? n / rate : n * rate) : 0
  const fmt = (v: number, cur: string) => v.toLocaleString('it-IT', { maximumFractionDigits: decimalsOf(cur), minimumFractionDigits: 0 })
  const sym = (cur: string) => {
    try {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? cur
    } catch {
      return cur
    }
  }
  const perOne = 1 / rate
  const field = (which: 'base' | 'local', cur: string, name: string) =>
    side === which ? (
      <div className="fd act">
        <label className="fl2" htmlFor={`vp-${which}`}>
          {name} · {cur}
        </label>
        <div className="fv2">
          <input id={`vp-${which}`} className="n" inputMode="decimal" value={text} onChange={(e) => setText(e.currentTarget.value)} aria-label={`Importo in ${name}`} />
          <span className="u">{sym(cur)}</span>
        </div>
      </div>
    ) : (
      <button type="button" className="fd" onClick={() => (setText(fmt(other, cur)), setSide(which))} aria-label={`Scrivi in ${name}`}>
        <span className="fl2">
          {name} · {cur}
        </span>
        <div className="fv2">
          <span className="n">{valid ? fmt(other, cur) : '—'}</span>
          <span className="u">{sym(cur)}</span>
        </div>
      </button>
    )
  return (
    <div className="k-ValutaPiccola">
      <div className="vc sm">
        <div className="io" aria-live="polite">
          {field('base', base, baseName)}
          <span aria-hidden="true" className="eq">
            =
          </span>
          {field('local', local, localName)}
        </div>
        <div className="rr">
          1 {sym(base)} = {fmt(perOne, local)} {sym(local)}
        </div>
      </div>
    </div>
  )
}

/** Riepilogo spese (componente Riepilogo): «Speso in …» con budget, poi saldo e persone o le varianti. */
export function Riepilogo({ dove, speso, currency, limit, onSetBudget, onOpenBudget, second }: { dove: string; speso: number; currency: string; limit?: number; onSetBudget?: () => void; onOpenBudget?: () => void; second: ReactNode }) {
  const pct = limit ? Math.round((speso / limit) * 100) : 0
  const open = limit && onOpenBudget ? onOpenBudget : undefined
  return (
    <div className="k-Riepilogo" style={{ display: 'grid', gap: 15 }}>
      <div
        className={cx('hero', open && 'fa-tap')}
        {...(open
          ? {
              role: 'link',
              tabIndex: 0,
              'aria-label': `Speso ${formatMoney(speso, currency)}: apri il budget`,
              onClick: open,
              onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open()),
            }
          : {})}
      >
        <Simbolo />
        <span className="l">Speso in {dove}</span>
        <span className="big">{formatMoney(speso, currency)}</span>
        {limit ? (
          <>
            <span className="c">
              {pct}% del budget da {formatMoney(limit, currency)}
            </span>
            <div className="bar" role="progressbar" aria-label="Budget speso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, pct)}>
              <i style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          </>
        ) : (
          <>
            <span className="c">Nessun budget impostato</span>
            {onSetBudget ? (
              <a
                className="lk"
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  onSetBudget()
                }}
              >
                Imposta un budget
              </a>
            ) : null}
          </>
        )}
      </div>
      {second}
    </div>
  )
}

export function AvatarStack({ people, tint = 'var(--tinta-acqua)', max = 4 }: { people: { name: string; n: number }[]; tint?: string; max?: number }) {
  const shown = people.length > max ? people.slice(0, max - 1) : people
  const more = people.length - shown.length
  const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']
  return (
    <div aria-hidden="true" className="av">
      {shown.map((p, i) => (
        <span key={i} style={{ background: `var(--disco-${COL[(p.n - 1) % 5]})`, borderColor: tint }}>
          {initials(p.name)}
        </span>
      ))}
      {more > 0 ? (
        <span className="more" style={{ borderColor: tint }}>
          +{more}
        </span>
      ) : null}
    </div>
  )
}

/** Seconda riga del Riepilogo in gruppo: saldo + persone, oppure «Siete in pari». */
export function SaldoPersone({ saldo, currency, people, inPari }: { saldo: number | null; currency: string; people: { name: string; n: number }[]; inPari?: boolean }) {
  if (inPari ?? (saldo === null || Math.abs(saldo) < 0.005))
    return (
      <div className="card b wide">
        <span className="ok">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <div className="tx">
          <span className="v2">{saldo === null ? 'Saldo non disponibile' : 'Siete in pari'}</span>
          <span className="c2">{saldo === null ? 'Collega il tuo account a un viaggiatore' : 'Nessuno deve niente a nessuno'}</span>
        </div>
        <AvatarStack people={people} />
      </div>
    )
  const s = saldo ?? 0
  const pay = s < -0.004
  return (
    <div className="two">
      <div className="card a">
        <span className={cx('badge', pay && 'pay')}>{pay ? 'Da pagare' : Math.abs(s) < 0.005 ? 'In pari' : 'Da incassare'}</span>
        <span className="l" style={{ marginTop: 'var(--space-sm)' }}>
          Il tuo saldo
        </span>
        <span className="v">{`${pay ? '−' : Math.abs(s) < 0.005 ? '' : '+'}${formatMoney(Math.abs(s), currency)}`}</span>
      </div>
      <div className="card b">
        <span className="l">Persone</span>
        <span className="v">{people.length}</span>
        <AvatarStack people={people} />
      </div>
    </div>
  )
}

/** Seconda riga del Riepilogo da soli: due valori con nota. */
export function DueValori({ a, b }: { a: { l: string; v: string; c: string }; b?: { l: string; v: string; c: string } }) {
  return (
    <div className="two">
      <div className="card a">
        <span className="l">{a.l}</span>
        <span className="v">{a.v}</span>
        <span className="c2">{a.c}</span>
      </div>
      {b ? (
        <div className="card b">
          <span className="l">{b.l}</span>
          <span className="v">{b.v}</span>
          <span className="c2">{b.c}</span>
        </div>
      ) : null}
    </div>
  )
}

export { Ic }
