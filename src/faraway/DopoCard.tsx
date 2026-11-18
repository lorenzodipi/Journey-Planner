// «Com'è andata» (Oggi dopo il viaggio): le card. La scelta di quali mostrare e dove sta in `src/lib/dopoViaggio.ts`.
// Larghe: una per riga. Strette: sempre a coppie, in `.fa-dp-coppia`. Stile in app.css («Com'è andata»).
import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { distanza } from '../lib/formati'
import { LOCALE, t as tt, elenco, nomeCategoria } from '../i18n'
import type { CittaDati, Dati } from '../lib/dopoViaggio'
import { Ic } from '../ui/Sprite'

/** Colori dei dischi, in ordine: le città e le voci delle card prendono il successivo. */
export const DISCHI = ['viola', 'corallo', 'turchese', 'azzurro', 'menta', 'glicine', 'rosa', 'cielo'] as const
export const disco = (n: number) => `var(--disco-${DISCHI[n % DISCHI.length]})`

const nn = (n: number) => n.toLocaleString(LOCALE, { maximumFractionDigits: 1 })
const ore = (min: number) => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? tt('{h} h {m}', { h, m }) : tt('{h} h', { h })
}
const notti = (n: number) => `${n} ${n === 1 ? tt('notte') : tt('notti')}`

function Titolo({ children, destra, pill }: { children: ReactNode; destra?: ReactNode; pill?: boolean }) {
  return (
    <div className="dp-t">
      <h2>{children}</h2>
      {destra ? <span className={pill ? 'dp-pill' : 'dp-sub'}>{destra}</span> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ larghe */

/** Mappa con le sole città: i pin sono nei posti veri, l'etichetta si sposta di lato e in verticale per non coprirne un'altra. */
export function CardCitta({ dati }: { dati: NonNullable<Dati['larghe']['citta']> }) {
  const c = dati.citta
  const mediaLat = c.reduce((s, x) => s + x.lat, 0) / c.length
  const k = Math.cos((mediaLat * Math.PI) / 180)
  const xs = c.map((x) => x.lng * k)
  const ys = c.map((x) => -x.lat)
  const range = (v: number[]) => ({ min: Math.min(...v), span: Math.max(...v) - Math.min(...v) || 1 })
  const rx = range(xs)
  const ry = range(ys)
  // margine 14% (orizzontale e verticale): il pin e la sua etichetta restano dentro il riquadro
  const pos = c.map((_, i) => ({ x: 14 + ((xs[i] - rx.min) / rx.span) * 72, y: 16 + ((ys[i] - ry.min) / ry.span) * 66 }))
  // le etichette stanno a destra del pin, a sinistra se il pin è nella metà destra; in verticale distano almeno 14%
  const ordine = pos.map((_, i) => i).sort((a, b) => pos[a].y - pos[b].y)
  const yEtichetta: number[] = []
  let prec = -100
  for (const i of ordine) {
    const y = Math.max(pos[i].y, prec + 14)
    yEtichetta[i] = y
    prec = y
  }
  const numerati = c.length >= 3
  const soloNumeri = c.length >= 5
  const etichetta = (x: CittaDati) => `${x.nome}${x.notti > 0 ? ` · ${notti(x.notti)}` : ` · ${tt('in giornata')}`}`
  return (
    <section className="dp-c" aria-label={tt('Città toccate')}>
      <Titolo destra={c.length === 2 ? tt('{km} tra le due', { km: distanza(dati.metri) }) : tt('{n} città · {km}', { n: c.length, km: distanza(dati.metri) })}>{tt('Le città del viaggio')}</Titolo>
      <div className="dp-mappa" role="img" aria-label={tt('Mappa: {elenco}', { elenco: elenco(c.map((x, i) => (numerati ? `${i + 1} ${x.nome}` : x.nome))) })}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={pos.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="1 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {c.map((x, i) => (
          <span key={x.nome} className={`dp-pin${pos[i].x > 55 ? ' sx' : ''}`} style={{ left: `${pos[i].x}%`, top: `${pos[i].y}%` }}>
            <i style={{ background: disco(i) }} aria-hidden="true">{numerati ? i + 1 : null}</i>
            {soloNumeri ? null : <span style={{ transform: `translateY(${((yEtichetta[i] - pos[i].y) / 100) * 15.3846}em)` }}>{etichetta(x)}</span>}
          </span>
        ))}
      </div>
      {soloNumeri ? (
        <ol className="dp-giro">
          {c.map((x, i) => (
            <li key={x.nome}>
              <i style={{ background: disco(i) }} aria-hidden="true">{i + 1}</i>
              {etichetta(x)}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}

export function CardVisto({ dati }: { dati: NonNullable<Dati['larghe']['visto']> }) {
  return (
    <section className="dp-c acq" aria-label={tt('Cosa avete visto')}>
      <Titolo destra={`${dati.totale} ${dati.totale === 1 ? tt('tappa') : tt('tappe')}`}>{tt('Cosa avete visto')}</Titolo>
      <div className="dp-seg" aria-hidden="true">
        {dati.gruppi.map((g, i) => (
          <b key={g.nome || 'altro'} style={{ flex: g.n, background: disco(i + 1) }} />
        ))}
      </div>
      <ul className="dp-leg">
        {dati.gruppi.map((g, i) => (
          <li key={g.nome || 'altro'}>
            <i style={{ background: disco(i + 1) }} aria-hidden="true" />
            <span>{g.nome ? nomeCategoria(g.nome) : tt('Altro')}</span>
            <em>{g.n}</em>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CardDaVedere({ dati }: { dati: NonNullable<Dati['larghe']['davedere']> }) {
  const n = dati.nomi.length + dati.altri
  return (
    <section className="dp-c pie" aria-label={tt('Da vedere la prossima volta')}>
      <Titolo destra={`${n} ${n === 1 ? tt('luogo') : tt('luoghi')}`}>{tt('Da vedere la prossima volta')}</Titolo>
      <ul className="dp-chips">
        {dati.nomi.map((x) => (
          <li key={x}>{x}</li>
        ))}
        {dati.altri > 0 ? <li>{tt('e altri {n}', { n: dati.altri })}</li> : null}
      </ul>
      <Link href="/luoghi" className="dp-lnk">
        {tt('Vedili in Luoghi')}
      </Link>
    </section>
  )
}

/** Aereo pieno del sistema (`i-tra-plane`), girato sulla riga del ritorno. */
export function CardVolo({ dati, destinazione }: { dati: NonNullable<Dati['larghe']['volo']>; destinazione: string }) {
  const { voli, minuti, fusoOre } = dati
  const mostrati = voli.slice(0, 4)
  return (
    <section className="dp-c lav" aria-label={tt('In volo')}>
      <Titolo pill destra={`${voli.length} ${voli.length === 1 ? tt('volo') : tt('voli')}`}>{tt('In volo')}</Titolo>
      <ul className="dp-voli">
        {mostrati.map((v, i) => (
          <li key={i}>
            <span>{v.da}</span>
            <i aria-hidden="true" />
            <Ic name="i-tra-plane" size={20} className={i % 2 === 1 ? 'ritorno' : undefined} />
            <i aria-hidden="true" />
            <span>{v.a}</span>
          </li>
        ))}
      </ul>
      {voli.length > mostrati.length ? <span className="dp-sub">{tt('e altri {n}', { n: voli.length - mostrati.length })}</span> : null}
      <div className="dp-vl">
        <b>{ore(minuti)}</b>
        <span className="dp-sub">{voli.length === 1 ? tt('in aria') : tt('in aria, in tutto')}</span>
      </div>
      {Math.abs(fusoOre) >= 1 ? (
        <span className="dp-sub">
          {fusoOre > 0
            ? tt('Fuso di {destination}: {n} {v1} avanti rispetto a casa.', { destination: destinazione, n: nn(fusoOre), v1: fusoOre === 1 ? tt('ora') : tt('ore') })
            : tt('Fuso di {destination}: {n} {v1} indietro rispetto a casa.', { destination: destinazione, n: nn(-fusoOre), v1: fusoOre === -1 ? tt('ora') : tt('ore') })}
        </span>
      ) : null}
    </section>
  )
}

export function CardDormito({ dati, colore }: { dati: NonNullable<Dati['larghe']['dormito']>; colore: (citta: string, i: number) => string }) {
  return (
    <section className="dp-c" aria-label={tt('Dove avete dormito')}>
      <Titolo destra={`${notti(dati.notti)} · ${dati.alloggi.length + dati.altri} ${tt('alloggi')}`}>{tt('Dove avete dormito')}</Titolo>
      <ul className="dp-nott">
        {dati.alloggi.map((a, i) => (
          <li key={`${a.nome}-${i}`}>
            <span>{a.nome}</span>
            <b>{notti(a.notti)}</b>
            <span className="bar" aria-hidden="true">
              <i style={{ width: `${Math.max(4, (a.notti / dati.notti) * 100)}%`, background: colore(a.citta, i) }} />
            </span>
          </li>
        ))}
      </ul>
      {dati.altri > 0 ? <span className="dp-sub">{tt('e altri {n}', { n: dati.altri })}</span> : null}
    </section>
  )
}

const ICONA_MEZZO: Record<string, string> = { train: 'i-tra-train', metro: 'i-tra-metro', bus: 'i-tra-bus', taxi: 'i-tra-taxi', car: 'i-tra-car', ferry: 'i-tra-ferry', walk: 'i-tra-walk' }
/** Il nome del mezzo, al singolare con una corsa e al plurale con più. */
function nomeMezzo(mezzo: string, n: number): string {
  const uno = n === 1
  switch (mezzo) {
    case 'train': return uno ? tt('treno') : tt('treni')
    case 'metro': return tt('metro')
    case 'bus': return tt('autobus')
    case 'taxi': return tt('taxi')
    case 'car': return tt('auto')
    case 'ferry': return uno ? tt('traghetto') : tt('traghetti')
    default: return tt('a piedi')
  }
}

export function CardMossi({ dati }: { dati: NonNullable<Dati['larghe']['mossi']> }) {
  return (
    <section className="dp-c" aria-label={tt('Come vi siete mossi')}>
      <Titolo>{tt('Come vi siete mossi')}</Titolo>
      <ul className="dp-mezzi">
        {dati.mezzi.map((m) => (
          <li key={m.mezzo}>
            <Ic name={ICONA_MEZZO[m.mezzo]} size={36} />
            <b>{m.n}</b>
            <span>{nomeMezzo(m.mezzo, m.n)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ strette */

function Mini({ classe, nome, children }: { classe?: string; nome: string; children: ReactNode }) {
  return (
    <div className="dp-cella">
      <section className={`dp-mini${classe ? ` ${classe}` : ''}`} aria-label={nome}>
        {children}
      </section>
    </div>
  )
}

export function CardPaesi({ dati }: { dati: NonNullable<Dati['strette']['paesi']> }) {
  return (
    <Mini classe="azz" nome={tt('Paesi')}>
      <div className="dp-band" aria-hidden="true">
        {dati.codici.slice(0, 4).map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <b className="dp-v">{tt('{n} paesi', { n: dati.codici.length })}</b>
      {dati.valute > 0 ? <span className="dp-sub">{dati.valute === 1 ? tt('e 1 valuta usata') : tt('e {n} valute usate', { n: dati.valute })}</span> : null}
    </Mini>
  )
}

export function CardTappe({ dati }: { dati: NonNullable<Dati['strette']['tappe']> }) {
  const r = 24
  const c = 2 * Math.PI * r
  return (
    <Mini classe="acq" nome={tt('Tappe fatte')}>
      <div className="dp-anello" role="img" aria-label={`${dati.pct}%`}>
        <svg viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r={r} fill="none" stroke="var(--surface-card)" strokeWidth="6" />
          <circle cx="28" cy="28" r={r} fill="none" stroke="var(--azzurro-ink)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(dati.pct / 100) * c} ${c}`} transform="rotate(-90 28 28)" />
        </svg>
        <span>{dati.pct}%</span>
      </div>
      <b className="dp-v">{tt('{fatte} tappe su {pianificate}', { fatte: dati.fatte, pianificate: dati.pianificate })}</b>
      <span className="dp-sub">{tt('segnate come fatte')}</span>
    </Mini>
  )
}

export function CardPieno({ dati, giorno }: { dati: NonNullable<Dati['strette']['pieno']>; giorno: string }) {
  return (
    <Mini classe="ros" nome={tt('Giorno più pieno')}>
      <span className="dp-ic">
        <Ic name="i-nav-calendar" size={36} />
      </span>
      <b className="dp-vl">{tt('{n} tappe', { n: dati.n })}</b>
      <span className="dp-sub">{tt('il giorno più pieno, {giorno}', { giorno })}</span>
    </Mini>
  )
}

export function CardChecklist({ dati }: { dati: NonNullable<Dati['strette']['checklist']> }) {
  return (
    <Mini nome={tt('Checklist')}>
      <span className="dp-ic">
        <Ic name="i-sez-checklist" size={36} />
      </span>
      <b className="dp-vl">{tt('{fatte} su {totale}', { fatte: dati.fatte, totale: dati.totale })}</b>
      <span className="dp-sub">{tt('voci della checklist spuntate')}</span>
    </Mini>
  )
}
