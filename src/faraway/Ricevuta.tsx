// Ricevuta del riepilogo spese (componente Ricevuta, mock Fa-23…Fa-26): per categoria (toccando una riga si
// imposta il previsto), totali, saldo a persona e «Per pareggiare», con il bordo dentellato in fondo.
import { useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { formatMoney, parseAmount } from '../lib/money'
import type { Ricevuta as Dati, PrevistoPersona, RigaCategoria } from '../lib/ricevuta'
import { discOf, initials } from '../state/me'
import type { Trip } from '../types'
import { Ic } from '../ui/Sprite'
import { Campo, Pulsante } from './base'
import { cx } from './cx'
import { soloLettura } from '../lib/ruolo'
import { nomeCategoria, t as tt } from '../i18n'

// Bordo a denti in fondo alla ricevuta: un solo disegno largo 3200 px (punte ogni 16 px), centrato e tagliato dalla
// ricevuta. Non una maschera né un motivo ripetuto: con la scala dello schermo non intera (2,625, 2,75, zoom…) Chrome
// lasciava una riga sottile, chiara in scuro e scura in chiaro, sotto le punte su tutta la larghezza.
const DENTI = `M0 0H3200V12${Array.from({ length: 200 }, (_, i) => `L${3192 - i * 16} 3.72L${3184 - i * 16} 12`).join('')}Z`

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']
const segno = (n: number, cur: string) => `${n > 0.004 ? '+' : n < -0.004 ? '−' : ''}${formatMoney(Math.abs(n), cur)}`

interface Props {
  trip: Trip
  dati: Dati
  sub: string
  /** `travelerId` = il previsto di quella persona (0056); senza, il previsto unico della categoria (prima della migrazione) */
  onPlanned: (c: RigaCategoria, planned: number | null, travelerId?: string) => Promise<string | null>
  onRename: (c: RigaCategoria, label: string) => Promise<string | null>
  onDelete: (c: RigaCategoria) => Promise<void>
  /** «Bilancia» accanto alle righe di «Per pareggiare» che mi riguardano: `con` = le persone per cui c'è qualcosa da chiudere */
  bilancia?: { me: string; con: ReadonlySet<string>; onPress: (otherId: string) => void }
  /** chi usa l'app: sotto «Già pagato» compare «La tua quota» (la sua parte delle spese, a prescindere da chi ha pagato) */
  io?: string
  /** solo la parte di `io` (pagina Spese, «La mia parte»): titolo suo, previsto non modificabile, solo il suo saldo */
  mia?: boolean
}

function RigaFissa({ c, cur }: { c: RigaCategoria; cur: string }) {
  return (
    <div className="fa-rcat">
      <div className="cat fisso">
        <Ic name={c.icon} size={32} />
        <div>
          <div className="ln">
            <span className="l">{nomeCategoria(c.label)}</span>
            <span className="d" />
            <span className="v">{formatMoney(c.spent, cur)}</span>
          </div>
          {c.sub ? <div className="sub">{c.sub}</div> : null}
          {c.previstoTesto ? <div className="sub">{c.previstoTesto}</div> : null}
        </div>
      </div>
    </div>
  )
}

function RigaCat({ c: riga, cur, open, onToggle, onPlanned, onRename, onDelete, nome, gruppo, scrive }: { c: RigaCategoria; cur: string; open: boolean; onToggle: () => void; nome: (id: string) => string; gruppo: boolean; scrive: boolean } & Pick<Props, 'onPlanned' | 'onRename' | 'onDelete'>) {
  // il previsto di chi non ha l'account solo se posso modificare il viaggio
  const c = scrive ? riga : { ...riga, altri: [] }
  const testo = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','))
  // con il previsto a persona (0056) si scrive il mio e, se posso, quello di chi non ha l'account; prima, quello della categoria
  const persone = c.mio ? [c.mio, ...(c.altri ?? [])] : []
  const [planned, setPlanned] = useState(c.mio ? testo(c.mio.valore) : c.plannedSet ? testo(c.planned) : '')
  const [altri, setAltri] = useState<Record<string, string>>(() => Object.fromEntries((c.altri ?? []).map((p) => [p.travelerId, testo(p.valore)])))
  const [label, setLabel] = useState(c.label)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    const valori = persone.length ? persone.map((p, i) => ({ p, v: i === 0 ? planned : (altri[p.travelerId] ?? '') })) : [{ p: undefined, v: planned }]
    const letti = valori.map(({ p, v }) => ({ p, n: v.trim() ? parseAmount(v) : null, bad: !!v.trim() && (parseAmount(v) === null || (parseAmount(v) ?? 0) < 0) }))
    if (letti.some((x) => x.bad)) return setError(tt('Il previsto non è chiaro: scrivi un importo, per esempio 600.'))
    setBusy(true)
    let m: string | null = null
    if (c.personale && label.trim() && label.trim() !== c.label) m = await onRename(c, label.trim())
    for (const { p, n } of letti) {
      if (m) break
      const prima = p ? (p.valore ?? null) : c.plannedSet ? c.planned : null
      if (n !== prima) m = await onPlanned(c, n, p?.travelerId)
    }
    setBusy(false)
    setError(m)
    if (!m) onToggle()
  }
  const suggerimento = (p: PrevistoPersona, mio: boolean) =>
    p.valore !== undefined
      ? undefined
      : p.stima > 0
        ? mio
          ? tt('Senza una cifra conta la tua quota, {v0}, calcolata dai costi inseriti.', { v0: formatMoney(p.stima, cur) })
          : tt('Senza una cifra conta la sua quota, {v0}, calcolata dai costi inseriti.', { v0: formatMoney(p.stima, cur) })
        : mio
          ? tt('Quanto pensi di spendere tu per questa categoria.')
          : tt('Quanto pensi che spenderà per questa categoria.')

  return (
    <div className={cx('fa-rcat', open && 'open')}>
      <button type="button" className="cat" aria-expanded={open} onClick={onToggle}>
        <Ic name={c.icon} size={32} />
        <div>
          <div className="ln">
            <span className="l">{nomeCategoria(c.label)}</span>
            <span className="d" />
            <span className="v">{formatMoney(c.spent, cur)}</span>
          </div>
          {c.sub ? <div className="sub">{c.sub}</div> : null}
          {c.previstoTesto ? <div className="sub">{c.previstoTesto}</div> : null}
        </div>
      </button>
      {open ? (
        <div className="fa-rcat-ed">
          {c.personale ? <Campo label={tt('Nome della categoria')} value={label} onChange={setLabel} maxLength={40} /> : null}
          {c.mio ? (
            <>
              <Campo
                label={gruppo ? tt('Il tuo previsto') : tt('Previsto')}
                icon="bag"
                inputMode="decimal"
                value={planned}
                onChange={setPlanned}
                placeholder={tt('Per esempio {v0}', { v0: formatMoney(c.mio.stima || 100, cur) })}
                hint={suggerimento(c.mio, true)}
                error={error}
              />
              {(c.altri ?? []).map((p) => (
                <Campo
                  key={p.travelerId}
                  label={tt('Previsto di {nome}', { nome: nome(p.travelerId) })}
                  icon="bag"
                  inputMode="decimal"
                  value={altri[p.travelerId] ?? ''}
                  onChange={(v) => setAltri((a) => ({ ...a, [p.travelerId]: v }))}
                  placeholder={tt('Per esempio {v0}', { v0: formatMoney(p.stima || 100, cur) })}
                  hint={suggerimento(p, false)}
                />
              ))}
            </>
          ) : (
            <Campo
              label={tt('Previsto')}
              icon="bag"
              inputMode="decimal"
              value={planned}
              onChange={setPlanned}
              placeholder={tt('Per esempio {v0}', { v0: formatMoney(c.planned || 100, cur) })}
              hint={c.plannedSet ? undefined : c.planned > 0 ? tt('Senza una cifra conta {v0}, calcolato dai costi inseriti.', { v0: formatMoney(c.planned, cur) }) : tt('Quanto pensi di spendere per questa categoria.')}
              error={error}
            />
          )}
          <div className="acts">
            <Pulsante size="sm" iconLeading="save" onPress={() => void save()} isLoading={busy}>
              {tt('Salva')}
            </Pulsante>
            {c.personale && c.id ? (
              <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={() => void onDelete(c)}>
                {tt('Elimina')}
              </Pulsante>
            ) : (
              <Pulsante size="sm" color="secondary" onPress={onToggle}>
                {tt('Annulla')}
              </Pulsante>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function Ricevuta({ trip, dati, sub, onPlanned, onRename, onDelete, bilancia, io, mia = false }: Props) {
  const cur = trip.baseCurrency
  const [open, setOpen] = useState<string | null>(null)
  const gruppo = trip.travelers.length > 1
  const mio = gruppo && io && !mia ? dati.persone.find((p) => p.travelerId === io) : undefined
  const nome = (id: string) => trip.travelers.find((t) => t.id === id)?.name.split(/\s+/)[0] ?? '—'
  return (
    <div className="k-Ricevuta">
      <div className="rc" role="group" aria-label={mia ? tt('Ricevuta con la tua parte delle spese') : tt('Ricevuta del riepilogo spese')}>
        <div className="rb">
          <div className="rh">
            <span className="br">{tt('Faraway')}</span>
            <span className="t">{mia ? tt('La mia parte') : tt('Riepilogo spese')}</span>
            <span className="s">{sub}</span>
          </div>
          <div className="sc">{tt('Per categoria')}</div>
          <div className="cats">
            {dati.categorie.map((c) =>
              mia ? (
                <RigaFissa key={c.key} c={c} cur={cur} />
              ) : (
              <RigaCat key={`${c.key}:${c.planned}:${c.label}:${c.mio?.valore ?? ''}:${(c.altri ?? []).map((p) => p.valore ?? '').join(',')}`} c={c} cur={cur} open={open === c.key} onToggle={() => setOpen(open === c.key ? null : c.key)} onPlanned={onPlanned} onRename={onRename} onDelete={onDelete} nome={nome} gruppo={gruppo} scrive={!soloLettura(trip)} />
              ),
            )}
          </div>
          <div className="tot">
            <div className="ln m">
              <span className="l">{tt('Previsto')}</span>
              <span className="d" />
              <span className="v">{formatMoney(dati.previsto, cur)}</span>
            </div>
            <div className="ln m">
              <span className="l">{tt('Già pagato')}</span>
              <span className="d" />
              <span className="v">{formatMoney(dati.pagato, cur)}</span>
            </div>
            {mio ? (
              <div className="ln m">
                <span className="l">{tt('La tua quota')}</span>
                <span className="d" />
                <span className="v">{formatMoney(mio.quota, cur)}</span>
              </div>
            ) : null}
            <div className="ln b">
              <span className="l">{tt('Da pagare')}</span>
              <span className="d" />
              <span className="v">{formatMoney(dati.daPagare, cur)}</span>
            </div>
          </div>
          {gruppo ? (
            <div className="per">
              <div className="sc">{mia ? tt('Il tuo saldo') : tt('Saldo a persona')}</div>
              {dati.persone.map((p) => {
                const t = trip.travelers.find((x) => x.id === p.travelerId)
                const tone = p.net > 0.004 ? 'pos' : p.net < -0.004 ? 'neg' : 'zero'
                return (
                  <div key={p.travelerId} className={cx('pp', tone)}>
                    <span aria-hidden="true" className="av" style={{ background: `var(--disco-${COL[(discOf(trip, p.travelerId) - 1) % 5]})` }}>
                      {initials(t?.name ?? '?')}
                    </span>
                    <b>{t?.name.split(/\s+/)[0]}</b>
                    <div className="sd">
                      <span className="v">{segno(p.net, cur)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
          {gruppo && dati.transfers.length > 0 ? (
            <div className="pr">
              <div className="sc">{tt('Per pareggiare')}</div>
              {dati.transfers.map((x, i) => {
                const altro = bilancia ? (x.from === bilancia.me ? x.to : x.to === bilancia.me ? x.from : null) : null
                return (
                  <div key={i} className="t">
                    <span>
                      {tt('{v0} deve {v1} a', { v0: nome(x.from), v1: formatMoney(x.amount, cur) })}{' '}<b>{nome(x.to)}</b>
                    </span>
                    {bilancia && altro && bilancia.con.has(altro) ? (
                      <button type="button" className="bil" aria-label={tt('Bilancia tutte le spese con {v0}', { v0: nome(altro) })} onClick={() => bilancia.onPress(altro)}>
                        {tt('Bilancia')}
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
          {dati.unconverted.length > 0 ? <div className="ft">{tt('Senza cambio, non contate nei totali: {v0}', { v0: dati.unconverted.join(', ') })}</div> : null}
        </div>
        <div className="rz" aria-hidden="true">
          <svg viewBox="0 0 3200 12" focusable="false">
            <path d={DENTI} />
          </svg>
        </div>
      </div>
    </div>
  )
}

/**
 * Due ricevute da sfogliare (pagina Spese): quella di tutti e «La mia parte». Si scorre di lato (si vede il bordo
 * dell'altra) o si tocca un puntino; l'altezza segue la ricevuta che si guarda. `vista` dice quale si mostra.
 */
export function DueRicevute({ tutti, mia, vista, onVista }: { tutti: ReactNode; mia: ReactNode; vista: 'tutti' | 'mia'; onVista: (v: 'tutti' | 'mia') => void }) {
  const box = useRef<HTMLDivElement>(null)
  const fogli = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const [alto, setAlto] = useState<number | undefined>(undefined)
  const attiva = vista === 'mia' ? 1 : 0
  const fine = (el: HTMLDivElement) => Math.max(0, el.scrollWidth - el.clientWidth)
  const lento = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') as ScrollBehavior

  // all'apertura, quando la scelta cambia da fuori e quando cambia la larghezza (pieghevole, rotazione, colonne che
  // si spostano) si torna alla ricevuta scelta, senza animazione
  const scelta = useRef(attiva)
  scelta.current = attiva
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const allinea = () => {
      const voluto = scelta.current ? fine(el) : 0
      if (Math.abs(el.scrollLeft - voluto) > 2 && !el.dataset.scorre) el.scrollLeft = voluto
    }
    allinea()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(allinea)
    ro.observe(el)
    return () => ro.disconnect()
  }, [attiva])

  // l'altezza si anima solo passando da una ricevuta all'altra (non quando cambia per i caratteri o una categoria aperta)
  const [anima, setAnima] = useState(false)
  const prima = useRef(attiva)
  useLayoutEffect(() => {
    if (prima.current === attiva) return
    prima.current = attiva
    setAnima(true)
    const id = window.setTimeout(() => setAnima(false), 300)
    return () => window.clearTimeout(id)
  }, [attiva])

  // l'altezza è quella della ricevuta che si guarda (aprendo una categoria cresce)
  useLayoutEffect(() => {
    const el = fogli[attiva].current
    if (!el) return
    const misura = () => setAlto(el.offsetHeight)
    misura()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(misura)
    ro.observe(el)
    return () => ro.disconnect()
  }, [attiva]) // eslint-disable-line react-hooks/exhaustive-deps

  // solo chi scorre cambia ricevuta: uno scorrimento fatto dal browser (la pagina che cambia larghezza) si annulla
  const tocco = useRef(0)
  const tocca = () => (tocco.current = performance.now())
  function onScroll() {
    const el = box.current
    if (!el) return
    if (performance.now() - tocco.current > 1200) {
      const voluto = attiva ? fine(el) : 0
      if (Math.abs(el.scrollLeft - voluto) > 2) el.scrollLeft = voluto
      return
    }
    tocca()
    el.dataset.scorre = '1'
    window.clearTimeout(Number(el.dataset.t))
    el.dataset.t = String(window.setTimeout(() => delete el.dataset.scorre, 150))
    const ora = el.scrollLeft > fine(el) / 2 ? 'mia' : 'tutti'
    if (ora !== vista) onVista(ora)
  }
  function vai(v: 'tutti' | 'mia') {
    const el = box.current
    tocca()
    if (el) el.scrollTo({ left: v === 'mia' ? fine(el) : 0, behavior: lento() })
    onVista(v)
  }

  // con il mouse (web) si trascina: il browser scorre da solo solo con la rotella e con il dito. Oltre 6 px il foglio
  // segue il puntatore senza scatti; al rilascio va alla ricevuta verso cui si è tirato e il clic che chiude il
  // trascinamento non apre la categoria sotto
  const tira = useRef<{ id: number; x: number; left: number; via: boolean } | null>(null)
  const appenaTirato = useRef(false)
  const [tirando, setTirando] = useState(false)
  function giu(e: ReactPointerEvent<HTMLDivElement>) {
    tocca()
    if (e.pointerType !== 'mouse' || e.button !== 0 || !box.current) return
    tira.current = { id: e.pointerId, x: e.clientX, left: box.current.scrollLeft, via: false }
  }
  function muovi(e: ReactPointerEvent<HTMLDivElement>) {
    const t = tira.current
    const el = box.current
    if (!t || !el || e.pointerId !== t.id) return
    const dx = e.clientX - t.x
    if (!t.via) {
      if (Math.abs(dx) < 6) return
      t.via = true
      el.setPointerCapture(e.pointerId)
      el.style.scrollSnapType = 'none' // subito: lo stato arriva al giro dopo
      setTirando(true)
    }
    tocca()
    el.scrollLeft = t.left - dx
  }
  function su(e: ReactPointerEvent<HTMLDivElement>) {
    const t = tira.current
    const el = box.current
    tira.current = null
    if (!t || !el || !t.via) return
    el.style.scrollSnapType = ''
    setTirando(false)
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    const dx = e.clientX - t.x
    appenaTirato.current = true
    window.setTimeout(() => (appenaTirato.current = false), 0)
    vai(dx < -40 ? 'mia' : dx > 40 ? 'tutti' : el.scrollLeft > fine(el) / 2 ? 'mia' : 'tutti')
  }
  function clic(e: ReactMouseEvent<HTMLDivElement>) {
    if (!appenaTirato.current) return
    e.preventDefault()
    e.stopPropagation()
  }

  const nomi = [tt('Ricevuta di tutti'), tt('La mia parte')]
  return (
    <div className="fa-ricevute">
      <div ref={box} className={cx('sf', anima && 'anima', tirando && 'tira')} onScroll={onScroll} onPointerDown={giu} onPointerMove={muovi} onPointerUp={su} onPointerCancel={su} onClickCapture={clic} onTouchStart={tocca} onTouchMove={tocca} onWheel={tocca} onKeyDown={tocca} style={alto ? { height: alto + 16 } : undefined}>
        {[tutti, mia].map((r, i) => (
          <div key={i} ref={fogli[i]} className="sl" role="group" aria-roledescription={tt('foglio')} aria-label={tt('{v0}, {n} di 2', { v0: nomi[i], n: i + 1 })} inert={i !== attiva ? true : undefined}>
            {r}
          </div>
        ))}
      </div>
      <div className="punti" role="group" aria-label={tt('Ricevuta da mostrare')}>
        {nomi.map((n, i) => (
          <button key={n} type="button" className={cx(i === attiva && 'on')} aria-label={n} aria-pressed={i === attiva} onClick={() => vai(i ? 'mia' : 'tutti')}>
            <i />
          </button>
        ))}
      </div>
    </div>
  )
}
