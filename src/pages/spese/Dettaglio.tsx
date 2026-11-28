// Dettaglio spese (mock Fa-27, #34): Di tutti | Mie, pillole per categoria, gruppi per giorno d'acquisto con il totale,
// righe che si aprono in linea (pagata da, divisione, categoria, Modifica / Elimina). Le spese che non mi
// riguardano non compaiono in nessuna lista (ma contano nei totali della pagina Spese).
import { corrispondeSpesa, importiDellaSpesa } from '../../lib/cercaImporto'
import { poiInseritaPrima } from '../../lib/ordineSpese'
import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { formatMoney, round2 } from '../../lib/money'
import { expenseBalance, payersOf, puoModificareSpesa, SPLIT_LABEL } from '../../lib/ripartizione'
import { expenseOwed, expensePaid } from '../../lib/budget'
import { CATEGORIE_BASE, catKey, categoriaDi, iconaSpesa } from '../../lib/ricevuta'
import { beneficiari, expenseBase, giornoAcquisto, riassunto, sezioneSpesa, type SpesaVista } from '../../lib/spese'
import { tripToday } from '../../lib/today'
import { useMe } from '../../state/me'
import { useOnline } from '../../state/online'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { Ic } from '../../ui/Sprite'
import { Campo, Chip, Segmenti } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { CalendarioIntervallo, type Intervallo } from '../../faraway/CalendarioIntervallo'
import { rangeText } from '../../lib/dayGroups'
import { Sv } from '../../faraway/icons'
import { TestoConLink } from '../../faraway/TestoConLink'
import { useUnaAperta } from '../../faraway/Righe'
import { Affianca, BarraIndietro, Schermata } from '../../faraway/shell'
import { VuotoFiltro } from '../../faraway/Stati'
import { SpesaSheet } from './SpesaSheet'
import { giornoSpese, inQuanti, pagataDa, righeSpesa, sorgente } from './testi'
import { LINGUA, nomeCategoria, t as tt } from '../../i18n'

type Vista = 'tutti' | 'mie'

export function Dettaglio() {
  const trip = useTrip()
  const t = useTrips()
  const me = useMe(trip)
  const [, navigate] = useLocation()
  const [ask, confirmNode] = useConferma()
  const gruppo = trip.travelers.length > 1
  const [vista, setVista] = useState<Vista>('tutti')
  const [cat, setCat] = useState<string | null>(null)
  /** Filtro per data (dal … al …, estremi compresi), nel fuso del viaggio. */
  const [date, setDate] = useState<Intervallo | null>(null)
  const [calendario, setCalendario] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [text, setText] = useState('')
  const [sheet, setSheet] = useState<{ expense?: SpesaVista } | null>(null)
  const open = useUnaAperta()
  const r = riassunto(trip, me?.id)
  const today = tripToday(trip)
  const cur = trip.baseCurrency
  const online = useOnline()
  // senza rete e con modifiche in coda: «In attesa di invio» o «Salvata» (#49, Fa-50)
  const coda = t.pending > 0 && (!online || t.stale)

  const inVista = useMemo(() => r.spese.filter((e) => (gruppo ? sezioneSpesa(e, trip.travelers, me?.id) === vista : true)), [r.spese, gruppo, vista, trip.travelers, me?.id])
  const cats = useMemo(() => {
    const keys = [...new Set(inVista.map((e) => catKey(categoriaDi(e))))]
    const order = (k: string) => {
      const i = CATEGORIE_BASE.findIndex((b) => catKey(b.label) === k)
      return k === 'altro' ? 1000 : i >= 0 ? i : 100
    }
    return keys.sort((a, b) => order(a) - order(b) || a.localeCompare(b, LINGUA)).map((k) => categoriaDi(inVista.find((e) => catKey(categoriaDi(e)) === k) as SpesaVista))
  }, [inVista])
  const nelleDate = (e: SpesaVista) => {
    if (!date) return true
    const d = giornoAcquisto(e, trip.timezone)
    return d >= date.dal && d <= date.al
  }
  const shown = inVista.filter((e) => (!cat || catKey(categoriaDi(e)) === catKey(cat)) && nelleDate(e) && corrispondeSpesa(text, [e.label, e.category, e.notes], importiDellaSpesa(e, r.fx)))
  const testoDate = date ? rangeText(date.dal, date.al) : ''
  const giorni = useMemo(() => {
    const m = new Map<string, SpesaVista[]>()
    // un giorno per acquisto (non per utilizzo); dentro il giorno, le più recenti in alto
    for (const e of [...shown].sort((a, b) => (b.acquistoAt ?? b.spentAt).localeCompare(a.acquistoAt ?? a.spentAt) || poiInseritaPrima(a, b))) {
      const d = giornoAcquisto(e, trip.timezone)
      m.set(d, [...(m.get(d) ?? []), e])
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [shown, trip.timezone])

  async function elimina(e: SpesaVista) {
    const tappa = e.source?.kind === 'day_item'
    // i pagamenti registrati su questa spesa smettono di contare (rimborsiValidi): meglio dirlo prima
    const pagati = round2((trip.settlements ?? []).filter((r) => r.expenseId === e.id && r.status === 'confermato').reduce((n, r) => n + (r.compensation ? 0 : r.amount), 0))
    const ok = await ask({
      title: tt('Eliminare la spesa?'),
      message: tt('{label} sparisce dalle spese{v1}.{v2} Puoi annullare subito dopo.', { label: e.label, v1: tappa ? tt(' e dal costo della tappa') : '', v2: pagati > 0 ? tt(' Anche i pagamenti già registrati su questa spesa ({v0}) non contano più.', { v0: formatMoney(pagati, trip.baseCurrency) }) : '' }),
      confirm: tt('Elimina la spesa'),
      cancel: tt('Tieni la spesa'),
      destructive: true,
    })
    if (!ok) return
    const m = await t.setExpenseDeleted(e.id, true)
    showToast(m ?? tt('Spesa eliminata'), m ? undefined : { label: tt('Annulla'), run: () => void t.setExpenseDeleted(e.id, false) })
  }

  return (
    <Schermata
      bar={
        <BarraIndietro
          title={tt('Dettaglio spese')}
          back="/spese"
          right={
            <button type="button" className="fa-ib" aria-label={tt('Cerca una spesa')} aria-pressed={searchOpen} onClick={() => (setSearchOpen(!searchOpen), setText(''))}>
              <Sv name="search" size={22} />
            </button>
          }
        />
      }
      fab={{ label: tt('Spesa'), aria: tt('Aggiungi una spesa'), onPress: () => setSheet({}) }}
      // nella testa: ricerca, «Di tutti | Mie» e filtri, così si nascondono e tornano con la barra
      fissa={
        <>
          {searchOpen ? <Campo label={tt('Cerca una spesa')} hideLabel icon="search" type="search" value={text} onChange={setText} placeholder={tt('Nome, categoria o importo')} autoFocus /> : null}
          {gruppo ? (
            <Segmenti
              label={tt('Spese')}
              value={vista}
              options={[
                { value: 'tutti', label: tt('Di tutti') },
                { value: 'mie', label: tt('Mie') },
              ]}
              onChange={(v) => (setVista(v), setCat(null), open.setOpen(null))}
            />
          ) : null}
          {inVista.length > 0 ? (
            <div className="fa-chips scroll" role="group" aria-label={tt('Filtri')}>
              <Chip on={!!date} icon={<Sv name="cal" size={18} />} label={date ? tt('Date: {testoDate}. Cambia le date', { testoDate }) : tt('Filtra per data')} onPress={() => setCalendario(true)}>
                {date ? testoDate : null}
              </Chip>
              {cats.length > 1 ? (
                <>
                  <Chip on={!cat} onPress={() => setCat(null)}>
                    {tt('Tutte')}
                  </Chip>
                  {cats.map((c) => (
                    <Chip key={c} on={cat !== null && catKey(cat) === catKey(c)} onPress={() => setCat(c)}>
                      {nomeCategoria(c)}
                    </Chip>
                  ))}
                </>
              ) : null}
            </div>
          ) : null}
        </>
      }
      overlay={
        <>
          {sheet ? <SpesaSheet key={sheet.expense?.id ?? 'new'} trip={trip} expense={sheet.expense} open onClose={() => setSheet(null)} /> : null}
          {confirmNode}
          {calendario ? (
            <Foglio
              open
              title={tt('Filtra per data')}
              onClose={() => setCalendario(false)}
              headStart={
                date ? (
                  <button type="button" className="fa-hdtxt" onClick={() => (setDate(null), setCalendario(false))}>
                    {tt('Azzera')}
                  </button>
                ) : (
                  <span />
                )
              }
            >
              <p className="fa-m" style={{ margin: 0 }}>{tt('Tocca il primo e l’ultimo giorno. Per un giorno solo, toccalo due volte.')}</p>
              <CalendarioIntervallo value={date} mese={trip.days[0]?.date ?? today} onChange={(v) => (setDate(v), setCalendario(false), open.setOpen(null))} />
            </Foglio>
          ) : null}
        </>
      }
    >
      {gruppo && vista === 'mie' ? <p className="fa-m" style={{ margin: 0 }}>{tt('Spese pagate da te o divise con te e solo alcune persone.')}</p> : null}
      {shown.length === 0 ? (
        inVista.length === 0 ? (
          <VuotoFiltro
            title={vista === 'mie' && gruppo ? tt('Nessuna spesa tua') : tt('Nessuna spesa')}
            text={vista === 'mie' && gruppo ? tt('Qui trovi le spese pagate da te o divise con te e solo alcune persone.') : tt('Registra la prima spesa: la trovi qui, divisa per giorno.')}
            action={tt('Registra una spesa')}
            onAction={() => setSheet({})}
          />
        ) : (
          <VuotoFiltro title={tt('Nessuna spesa trovata')} text={date ? tt('Prova con altre date, un\'altra categoria o un altro nome.') : tt('Prova con un\'altra categoria o un altro nome.')} action={tt('Mostra tutte le spese')} onAction={() => (setCat(null), setText(''), setDate(null))} />
        )
      ) : null}
      <Affianca>
      {giorni.map(([ymd, list]) => (
        <section key={ymd} aria-label={giornoSpese(ymd, today)} style={{ display: 'grid', gap: 8 }}>
          <div className="fa-sech">
            <h2 className="fa-h3">{giornoSpese(ymd, today)}</h2>
            <span className="fa-c">{formatMoney(round2(list.reduce((s, e) => s + (expenseBase(e, r.fx) ?? 0), 0)), cur)}</span>
          </div>
          <div className="fa-list">
            {list.map((e) => {
              const isOpen = open.isOpen(e.id)
              const amount = expenseBase(e, r.fx)
              const who = beneficiari(e, trip.travelers)
              const src = sorgente(e, trip)
              const day = e.source?.kind === 'day_item' ? trip.days.findIndex((d) => d.items.some((i) => i.id === e.source?.id)) : -1
              const payer = pagataDa(e, trip.travelers, me?.id)
              const mio = puoModificareSpesa(e, me?.userId, me?.id)
              const owed = e.splitMode && e.splitMode !== 'equal' ? expenseOwed(e, trip.travelers, r.fx) : null
              const multi = (e.payers?.length ?? 0) > 1
              const paid = multi ? expensePaid(e, r.fx) : null
              const pays = paid ?? (amount !== null ? payersOf(e).slice(0, 1).map((x) => ({ travelerId: x.travelerId, amount })) : [])
              const saldo = me && amount !== null && pays.length > 0 ? expenseBalance(pays, owed ?? expenseOwed(e, trip.travelers, r.fx) ?? []).find((b) => b.travelerId === me.id) : undefined
              const nm = (id: string) => (id === me?.id ? tt('Tu') : (trip.travelers.find((p) => p.id === id)?.name.split(/\s+/)[0] ?? '—'))
              const attesa = coda && t.pendingIds.has(e.id)
              const importo = amount === null ? formatMoney(e.amount, e.currency) : formatMoney(amount, cur)
              return (
                <div key={e.id} className={cx('fa-xr', isOpen && 'open')}>
                  <button type="button" className="fa-row" aria-expanded={isOpen} onClick={() => open.toggle(e.id)}>
                    <Ic name={iconaSpesa(e)} size={44} />
                    <span style={{ minWidth: 0 }}>
                      <span className="t" style={{ display: 'block' }}>
                        {e.label}
                      </span>
                      {(coda ? [`${attesa ? tt('In attesa di invio') : tt('Salvata')} · ${importo}`] : righeSpesa(e, trip, me?.id)).map((riga) => (
                        <span key={riga} className="s" style={{ display: 'block' }}>
                          {riga}
                        </span>
                      ))}
                    </span>
                    <span className="end">
                      {coda ? (
                        attesa ? (
                          <span className="fa-wait">
                            <Sv name="clock" size={16} />
                            {tt('In attesa')}
                          </span>
                        ) : null
                      ) : (
                        <span className="amt">{importo}</span>
                      )}
                      <Sv name="chev" size={20} className="chev" />
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="fa-xd">
                      {payer ? (
                        <div className="kv">
                          <Sv name="user" size={20} />
                          <div>
                            <div className="t">{payer}</div>
                          </div>
                        </div>
                      ) : null}
                      <div className="kv">
                        <Sv name="user" size={20} />
                        <div>
                          {who.length > 1 && owed ? (
                            <>
                              <div className="t">{tt('Diviso {v0} · {v1}', { v0: inQuanti(who.length), v1: SPLIT_LABEL[e.splitMode ?? 'equal'].toLowerCase() })}</div>
                              {owed.map((o, k) => (
                                <div key={o.travelerId} className="s">
                                  {nm(o.travelerId)}: {formatMoney(o.amount, cur)}
                                  {e.splitMode === 'percent' && e.shares[k]?.percent !== undefined ? ` (${String(e.shares[k].percent).replace('.', ',')}%)` : ''}
                                </div>
                              ))}
                            </>
                          ) : who.length > 1 ? (
                            <>
                              <div className="t">{tt('Diviso {v0}', { v0: inQuanti(who.length) })}</div>
                              {amount !== null ? <div className="s">{tt('{v0} a testa', { v0: formatMoney(round2(amount / who.length), cur) })}</div> : null}
                            </>
                          ) : (
                            <div className="t">{who[0] === me?.id ? tt('Solo tua') : tt('Solo di {v0}', { v0: trip.travelers.find((p) => p.id === who[0])?.name.split(/\s+/)[0] ?? '—' })}</div>
                          )}
                        </div>
                      </div>
                      {e.notes?.trim() ? (
                        <div className="kv">
                          <Sv name="righe" size={20} />
                          <div>
                            <div className="s" style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                              <TestoConLink testo={e.notes.trim()} />
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {multi && paid ? (
                        <div className="kv">
                          <Sv name="user" size={20} />
                          <div>
                            <div className="t">{tt('Chi ha pagato')}</div>
                            {paid.map((p) => (
                              <div key={p.travelerId} className="s">
                                {nm(p.travelerId)}: {formatMoney(p.amount, cur)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {saldo && Math.abs(saldo.net) >= 0.005 ? (
                        <div className="kv">
                          <Sv name="info" size={20} />
                          <div>
                            <div className="t">{saldo.net > 0 ? tt('Devi ricevere {v0}', { v0: formatMoney(saldo.net, cur) }) : tt('Devi dare {v0}', { v0: formatMoney(-saldo.net, cur) })}</div>
                            <div className="s">
                              {tt('Hai versato {v0}, la tua parte è {v1}', { v0: formatMoney(saldo.paid, cur), v1: formatMoney(saldo.owed, cur) })}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {e.currency !== cur ? (
                        <div className="kv">
                          <Sv name="globe" size={20} />
                          <div>
                            <div className="t">{formatMoney(e.amount, e.currency)}</div>
                            <div className="s">{amount === null ? tt('Manca il cambio: non conta nei totali') : `= ${formatMoney(amount, cur)}`}</div>
                          </div>
                        </div>
                      ) : null}
                      <div className="kv">
                        <Sv name="info" size={20} />
                        <div>
                          <div className="t">{tt('Categoria')}</div>
                          <div className="s">{nomeCategoria(categoriaDi(e))}</div>
                        </div>
                      </div>
                      {day >= 0 ? (
                        <div className="kv">
                          <Sv name="cal" size={20} />
                          <div>
                            <div className="t">{tt('Tappa del Giorno {v0}', { v0: day + 1 })}</div>
                            <div className="s">{tt('Il costo si aggiorna anche nella tappa')}</div>
                          </div>
                        </div>
                      ) : null}
                      <div className="acts">
                        {e.derived && src ? (
                          <button type="button" className="fa-btn sm out" onClick={() => navigate(src.href)}>
                            <Sv name="pencil" size={18} />
                            {src.label}
                          </button>
                        ) : !mio ? (
                          <span className="fa-help" style={{ flex: 1 }}>{tt('Solo chi l\'ha creata o pagata può modificarla.')}</span>
                        ) : (
                          <>
                            <button type="button" className="fa-btn sm out" onClick={() => setSheet({ expense: e })}>
                              <Sv name="pencil" size={18} />
                              {tt('Modifica')}
                            </button>
                            <button type="button" className="fa-btn sm del" style={{ color: 'var(--danger)' }} onClick={() => void elimina(e)}>
                              <Sv name="trash" size={18} />
                              {tt('Elimina')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      </Affianca>
    </Schermata>
  )
}
