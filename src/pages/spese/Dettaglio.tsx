// Dettaglio spese (mock Fa-27, #34): Di tutti | Mie, pillole per categoria, gruppi per giorno con il totale,
// righe che si aprono in linea (pagata da, divisione, categoria, Modifica / Elimina). Le spese che non mi
// riguardano non compaiono in nessuna lista (ma contano nei totali della pagina Spese).
import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { dateInZone } from '../../lib/flights'
import { formatMoney, round2 } from '../../lib/money'
import { CATEGORIE_BASE, catKey, categoriaDi, iconaSpesa } from '../../lib/ricevuta'
import { beneficiari, expenseBase, riassunto, sezioneSpesa, type SpesaVista } from '../../lib/spese'
import { tripToday } from '../../lib/today'
import { useMe } from '../../state/me'
import { useOnline } from '../../state/online'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { Ic } from '../../ui/Sprite'
import { Campo, Chip, Segmenti } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { useUnaAperta } from '../../faraway/Righe'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { VuotoFiltro } from '../../faraway/Stati'
import { SpesaSheet } from './SpesaSheet'
import { giornoSpese, inQuanti, pagataDa, rigaSpesa, sorgente, tutteLePersone } from './testi'

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
    return keys.sort((a, b) => order(a) - order(b) || a.localeCompare(b, 'it')).map((k) => categoriaDi(inVista.find((e) => catKey(categoriaDi(e)) === k) as SpesaVista))
  }, [inVista])
  const q = text.trim().toLowerCase()
  const shown = inVista.filter((e) => (!cat || catKey(categoriaDi(e)) === catKey(cat)) && (!q || `${e.label} ${e.category ?? ''}`.toLowerCase().includes(q)))
  const giorni = useMemo(() => {
    const m = new Map<string, SpesaVista[]>()
    for (const e of shown) {
      const d = dateInZone(e.spentAt, trip.timezone)
      m.set(d, [...(m.get(d) ?? []), e])
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [shown, trip.timezone])

  async function elimina(e: SpesaVista) {
    const tappa = e.source?.kind === 'day_item'
    const ok = await ask({
      title: 'Eliminare la spesa?',
      message: `${e.label} sparisce dalle spese${tappa ? ' e dal costo della tappa' : ''}. Puoi annullare subito dopo.`,
      confirm: 'Elimina la spesa',
      cancel: 'Tieni la spesa',
      destructive: true,
    })
    if (!ok) return
    const m = await t.setExpenseDeleted(e.id, true)
    showToast(m ?? 'Spesa eliminata', m ? undefined : { label: 'Annulla', run: () => void t.setExpenseDeleted(e.id, false) })
  }

  return (
    <Schermata
      bar={
        <BarraIndietro
          title="Dettaglio spese"
          back="/spese"
          right={
            <button type="button" className="fa-ib" aria-label="Cerca una spesa" aria-pressed={searchOpen} onClick={() => (setSearchOpen(!searchOpen), setText(''))}>
              <Sv name="search" size={22} />
            </button>
          }
        />
      }
      fab={{ label: 'Spesa', aria: 'Aggiungi una spesa', onPress: () => setSheet({}) }}
      overlay={
        <>
          {sheet ? <SpesaSheet key={sheet.expense?.id ?? 'new'} trip={trip} expense={sheet.expense} open onClose={() => setSheet(null)} /> : null}
          {confirmNode}
        </>
      }
    >
      {searchOpen ? <Campo label="Cerca una spesa" hideLabel icon="search" type="search" value={text} onChange={setText} placeholder="Nome o categoria" autoFocus /> : null}
      {gruppo ? (
        <>
          <Segmenti
            label="Spese"
            value={vista}
            options={[
              { value: 'tutti', label: 'Di tutti' },
              { value: 'mie', label: 'Mie' },
            ]}
            onChange={(v) => (setVista(v), setCat(null), open.setOpen(null))}
          />
          <p className="fa-m" style={{ margin: 0 }}>
            {vista === 'tutti' ? tutteLePersone(trip.travelers.length) : 'Spese pagate da te o divise con te e solo alcune persone.'}
          </p>
        </>
      ) : null}
      {cats.length > 1 ? (
        <div className="fa-chips scroll" role="group" aria-label="Categoria">
          <Chip on={!cat} onPress={() => setCat(null)}>
            Tutte
          </Chip>
          {cats.map((c) => (
            <Chip key={c} on={cat !== null && catKey(cat) === catKey(c)} onPress={() => setCat(c)}>
              {c}
            </Chip>
          ))}
        </div>
      ) : null}
      {shown.length === 0 ? (
        inVista.length === 0 ? (
          <VuotoFiltro
            title={vista === 'mie' && gruppo ? 'Nessuna spesa tua' : 'Nessuna spesa'}
            text={vista === 'mie' && gruppo ? 'Qui trovi le spese pagate da te o divise con te e solo alcune persone.' : 'Registra la prima spesa: la trovi qui, divisa per giorno.'}
            action="Registra una spesa"
            onAction={() => setSheet({})}
          />
        ) : (
          <VuotoFiltro title="Nessuna spesa trovata" text="Prova con un'altra categoria o un altro nome." action="Mostra tutte le spese" onAction={() => (setCat(null), setText(''))} />
        )
      ) : null}
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
                      <span className="s" style={{ display: 'block' }}>
                        {coda ? `${attesa ? 'In attesa di invio' : 'Salvata'} · ${importo}` : rigaSpesa(e, trip, me?.id)}
                      </span>
                    </span>
                    <span className="end">
                      {coda ? (
                        attesa ? (
                          <span className="fa-wait">
                            <Sv name="clock" size={16} />
                            In attesa
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
                          {who.length > 1 ? (
                            <>
                              <div className="t">Diviso {inQuanti(who.length)}</div>
                              {amount !== null ? <div className="s">{formatMoney(round2(amount / who.length), cur)} a testa</div> : null}
                            </>
                          ) : (
                            <div className="t">{who[0] === me?.id ? 'Solo tua' : `Solo di ${trip.travelers.find((p) => p.id === who[0])?.name.split(/\s+/)[0] ?? '—'}`}</div>
                          )}
                        </div>
                      </div>
                      {e.currency !== cur ? (
                        <div className="kv">
                          <Sv name="globe" size={20} />
                          <div>
                            <div className="t">{formatMoney(e.amount, e.currency)}</div>
                            <div className="s">{amount === null ? 'Manca il cambio: non conta nei totali' : `= ${formatMoney(amount, cur)}`}</div>
                          </div>
                        </div>
                      ) : null}
                      <div className="kv">
                        <Sv name="info" size={20} />
                        <div>
                          <div className="t">Categoria</div>
                          <div className="s">{categoriaDi(e)}</div>
                        </div>
                      </div>
                      {day >= 0 ? (
                        <div className="kv">
                          <Sv name="cal" size={20} />
                          <div>
                            <div className="t">Tappa del Giorno {day + 1}</div>
                            <div className="s">Il costo si aggiorna anche nella tappa</div>
                          </div>
                        </div>
                      ) : null}
                      <div className="acts">
                        {e.derived && src ? (
                          <button type="button" className="fa-btn sm out" onClick={() => navigate(src.href)}>
                            <Sv name="pencil" size={18} />
                            {src.label}
                          </button>
                        ) : (
                          <>
                            <button type="button" className="fa-btn sm out" onClick={() => setSheet({ expense: e })}>
                              <Sv name="pencil" size={18} />
                              Modifica
                            </button>
                            <button type="button" className="fa-btn sm del" style={{ color: 'var(--danger)' }} onClick={() => void elimina(e)}>
                              <Sv name="trash" size={18} />
                              Elimina
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
      {gruppo ? (
        <p className="fa-m" style={{ margin: '4px 0 0', textAlign: 'center' }}>
          Le spese di altre persone che non ti riguardano non compaiono qui.
        </p>
      ) : null}
    </Schermata>
  )
}
