// Budget (mock Fa-34 e Fa-35, #34): stato vuoto con «Imposta il budget», poi il totale con la barra,
// «Cambia il budget», l'avviso quando è superato e le categorie con speso e previsto: toccandone una si cambia il
// previsto (il mio e, se posso, quello di chi non ha l'account), il nome e l'eliminazione delle categorie create a mano.
// Budget a persona (0055): segue la ricevuta scelta nella pagina Spese. Con quella di tutti si vede il budget del
// viaggio (la somma di quelli messi, «2 persone su 3»), con «La mia parte» il mio budget e la mia parte delle spese.
// Chi può modificare il viaggio scrive anche il budget di chi non ha l'account.
import { useMemo, useState } from 'react'
import { formatMoney, parseAmount, round2 } from '../../lib/money'
import { iconaSezione, ricevuta, statoBudget } from '../../lib/ricevuta'
import { riassunto } from '../../lib/spese'
import { budgetAltrui, budgetAPersona, budgetDi, budgetTotale } from '../../lib/budgetPersona'
import { soloLettura } from '../../lib/ruolo'
import { useVistaRicevuta } from '../../lib/vistaRicevuta'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { FxForm } from '../../ui/FxForm'
import { Ic } from '../../ui/Sprite'
import { Campo, PulsanteIcona, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { Riga } from '../../faraway/Righe'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { EditorPrevisto } from '../../faraway/PrevistoCategoria'
import { useAzioniCategoria } from './azioniCategoria'
import { nomeCategoria, t as tt } from '../../i18n'

export function BudgetPage() {
  const trip = useTrip()
  const t = useTrips()
  const me = useMe(trip)
  const r = riassunto(trip, me?.id)
  const gruppo = trip.travelers.length > 1 && !!me?.id
  const [vistaScelta] = useVistaRicevuta(trip.id)
  const mia = gruppo && vistaScelta === 'mia'
  const dati = useMemo(() => ricevuta(trip, r.spese, r.fx, mia ? me?.id : undefined, me?.id), [trip, r.spese, r.fx, mia, me?.id])
  const cur = trip.baseCurrency
  const aPersona = budgetAPersona(trip)
  const totale = budgetTotale(trip)
  const mio = budgetDi(trip, me?.id)
  // il budget che si guarda: il mio (da soli o con «La mia parte») oppure quello del viaggio
  const limit = mia || !gruppo ? mio : totale.importo
  const speso = mia ? dati.pagato : r.speso
  const titolo = mia || (!gruppo && aPersona) ? tt('Il mio budget') : tt('Budget del viaggio')
  const quanti = gruppo && !mia && totale.persone !== undefined && totale.viaggiatori !== undefined ? tt('Budget messo da {v0} su {v1}', { v0: totale.persone === 1 ? tt('1 persona') : tt('{n} persone', { n: totale.persone }), v1: totale.viaggiatori }) : null
  const altri = aPersona && !soloLettura(trip) ? budgetAltrui(trip, me?.id, true) : []
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(mio ? String(mio).replace('.', ',') : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const [fx, setFx] = useState(false)

  async function save(value: number | null) {
    setBusy(true)
    // senza il budget a persona (prima della 0055) si scrive il budget unico del viaggio, come prima
    const m = aPersona && me?.id ? await t.setTravelerBudget(trip.id, me.id, value) : await t.setTripBudgetLimit(trip.id, value)
    setBusy(false)
    if (m) return setError(m)
    setError(null)
    setEditing(false)
    showToast(value === null ? tt('Budget tolto') : tt('Budget: {v0}', { v0: formatMoney(value, cur) }))
  }
  function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const n = parseAmount(text)
    if (n === null || !(n > 0)) return setError(tt('Il budget non è chiaro: scrivi un importo, per esempio 5.000.'))
    void save(n)
  }

  const pct = limit ? Math.round((speso / limit) * 100) : 0
  const over = limit ? round2(speso - limit) : 0
  // tutte le categorie, anche vuote: il previsto si mette qui (anche prima di spendere)
  const cats = dati.categorie
  const scrive = !soloLettura(trip)
  const [aperto, setAperto] = useState<string | null>(null)
  const azioni = useAzioniCategoria(trip, me?.id)
  const nome = (id: string) => trip.travelers.find((x) => x.id === id)?.name.split(/\s+/)[0] ?? '—'

  const form = (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
      <Campo label={aPersona || !gruppo ? tt('Il mio budget') : tt('Budget del viaggio')} icon="bag" inputMode="decimal" value={text} onChange={setText} placeholder={tt('Per esempio {v0}', { v0: formatMoney(5000, cur) })} error={error} autoFocus={editing} />
      <Pulsante type="submit" isLoading={busy}>
        {mio || (!aPersona && trip.budgetLimit) ? tt('Salva il budget') : tt('Imposta il budget')}
      </Pulsante>
      {editing ? (
        <Pulsante color="secondary" onPress={() => (setEditing(false), setError(null))}>
          {tt('Annulla')}
        </Pulsante>
      ) : null}
    </form>
  )

  return (
    <Schermata
      bar={<BarraIndietro title={tt('Budget')} back="/spese" right={<PulsanteIcona icon="dots" label={tt('Altre azioni')} onPress={() => setMenu(true)} />} />}
      overlay={
        <>
          <Foglio open={menu} title={tt('Budget')} onClose={() => setMenu(false)} plain>
            <div className="fa-list">
              {mio || (!aPersona && trip.budgetLimit) ? <Riga icon={<Sv name="trash" size={22} />} title={aPersona ? tt('Togli il mio budget') : tt('Togli il budget')} sub={tt('La pagina Spese mostra solo quanto hai speso')} onPress={() => (setMenu(false), void save(null))} /> : null}
              <Riga icon={<Sv name="globe" size={22} />} title={tt('Cambio delle valute')} sub={tt('Quanto vale la valuta del paese in quella di casa')} onPress={() => (setMenu(false), setFx(true))} />
            </div>
          </Foglio>
          {fx ? (
            <Foglio open title={tt('Cambio delle valute')} onClose={() => setFx(false)}>
              <FxForm
                  trip={trip}
                  onSubmit={(rate, extra) => (Object.keys(extra).length === 0 && !trip.fxRates ? t.setFxRate(trip.id, rate) : t.setFxRates(trip.id, rate, extra))}
                  onDone={() => setFx(false)}
                />
            </Foglio>
          ) : null}
          {azioni.confirmNode}
        </>
      }
    >
      {!limit ? (
        <section className="fa-card xl pad" style={{ display: 'grid', gap: 16 }}>
          <h2 className="fa-h2">{tt('Nessun budget impostato')}</h2>
          {gruppo && aPersona ? <p className="fa-m" style={{ margin: 0 }}>{tt('Ognuno mette il suo budget: quello del viaggio è la somma.')}</p> : null}
          <p className="fa-lead" style={{ color: 'var(--ink-muted)' }}>
            {tt('Con un budget vedi quanto manca e ricevi un avviso prima di superarlo.')}
          </p>
          {form}
        </section>
      ) : (
        <>
          {over > 0 ? (
            <div className="fa-banner cor" role="status">
              <Sv name="err" size={20} />
              <span>
                <b>{tt('Budget superato.')}</b>{' '}{tt('Hai speso {v0} in più del previsto.', { v0: formatMoney(over, cur) })}
              </span>
            </div>
          ) : null}
          <section className="fa-card xl pad" style={{ display: 'grid', gap: 16 }}>
            {editing ? (
              form
            ) : (
              <>
                <span className="fa-m">{titolo}</span>
                <span style={{ font: '600 40px/44px var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(limit, cur)}</span>
                <div className="fa-pbar" role="progressbar" aria-label={over > 0 ? tt('Budget superato') : tt('Budget usato, {pct}%', { pct })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, pct)}>
                  <i style={{ width: `${Math.min(100, pct)}%`, background: over > 0 ? 'var(--danger)' : undefined }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span className="fa-m">{tt('Speso {v0}', { v0: formatMoney(speso, cur) })}</span>
                  {over > 0 ? (
                    <span className="fa-st ba">
                      <Sv name="err" size={16} />
                      {tt('Superato di {v0}', { v0: formatMoney(over, cur) })}
                    </span>
                  ) : (
                    <span className="fa-m">{pct}%</span>
                  )}
                </div>
                {quanti ? <span className="fa-m">{quanti}{mio ? ` · ${tt('il tuo {v0}', { v0: formatMoney(mio, cur) })}` : ''}</span> : null}
                <Pulsante color="secondary" iconLeading="pencil" onPress={() => setEditing(true)}>
                  {gruppo && !mia && aPersona ? (mio ? tt('Cambia il mio budget') : tt('Metti il mio budget')) : tt('Cambia il budget')}
                </Pulsante>
              </>
            )}
          </section>
        </>
      )}
      {cats.length > 0 ? (
        <>
          <div className="fa-sech">
            <h2 className="fa-h3">{tt('Per categoria')}</h2>
          </div>
          <section className="fa-card xl k-BudgetCat" style={{ overflow: 'hidden', padding: '8px 0' }}>
            {cats.map((c, i) => {
              const ratio = c.planned > 0 ? c.spent / c.planned : 0
              const stato = statoBudget(c)
              const color = stato === 'over' ? 'var(--danger)' : 'var(--azzurro)'
              const aperta = aperto === c.key
              const contenuto = (
                <>
                  <Ic name={iconaSezione(c.label)} size={44} />
                  <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span className="fa-b">{nomeCategoria(c.label)}</span>
                      <span className="fa-amt">{formatMoney(c.spent, cur)}</span>
                    </div>
                    <div className="fa-pbar" role="progressbar" aria-label={`${nomeCategoria(c.label)}, ${Math.round(ratio * 100)}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(ratio * 100))}>
                      <i style={{ width: `${Math.min(100, Math.round(ratio * 100))}%`, background: color }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span className="fa-c">{c.planned > 0 ? tt('Previsto {v0}', { v0: formatMoney(c.planned, cur) }) : tt('Nessun previsto')}</span>
                      {stato === 'paid' ? (
                        <span className="fa-st ok">
                          <Sv name="check" size={16} />
                          {tt('Pagati')}
                        </span>
                      ) : stato === 'over' ? (
                        <span className="fa-st ba">
                          <Sv name="err" size={16} />
                          {tt('Oltre il limite')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </>
              )
              return (
                <div key={c.key}>
                  {i > 0 ? <div className="fa-hr" /> : null}
                  {scrive ? (
                    <div className={aperta ? 'riga open' : 'riga'}>
                      <button type="button" className="cat" aria-expanded={aperta} onClick={() => setAperto(aperta ? null : c.key)}>
                        {contenuto}
                      </button>
                      {aperta ? (
                        <EditorPrevisto
                          key={`${c.key}:${c.planned}:${c.label}:${c.mio?.valore ?? ''}:${(c.altri ?? []).map((p) => p.valore ?? '').join(',')}`}
                          c={c}
                          cur={cur}
                          onClose={() => setAperto(null)}
                          onPlanned={azioni.onPlanned}
                          onRename={azioni.onRename}
                          onDelete={azioni.onDelete}
                          nome={nome}
                          gruppo={gruppo}
                          scrive={scrive}
                          soloMio={mia}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div className="riga">
                      <div className="cat fisso">{contenuto}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
          {scrive ? (
            <p className="fa-m" style={{ textAlign: 'center' }}>
              {tt('Tocca una categoria per cambiarne il previsto.')}
            </p>
          ) : null}
        </>
      ) : null}
      {altri.length > 0 ? (
        <>
          <div className="fa-sech">
            <h2 className="fa-h3">{tt('Chi non ha l’account')}</h2>
          </div>
          <section className="fa-card xl pad" style={{ display: 'grid', gap: 16 }}>
            <p className="fa-m" style={{ margin: 0 }}>{tt('Il loro budget lo scrive chi organizza: conta nel budget del viaggio.')}</p>
            {altri.map((p) => (
              <BudgetAltrui key={p.id} tripId={trip.id} travelerId={p.id} nome={p.name} valore={budgetDi(trip, p.id)} cur={cur} />
            ))}
          </section>
        </>
      ) : null}
    </Schermata>
  )
}

/** Budget di un viaggiatore senza account: campo e «Salva» (vuoto = lo toglie). */
function BudgetAltrui({ tripId, travelerId, nome, valore, cur }: { tripId: string; travelerId: string; nome: string; valore?: number; cur: string }) {
  const t = useTrips()
  const [text, setText] = useState(valore ? String(valore).replace('.', ',') : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function salva(e: { preventDefault(): void }) {
    e.preventDefault()
    const n = text.trim() ? parseAmount(text) : null
    if (text.trim() && (n === null || !(n > 0))) return setError(tt('Il budget non è chiaro: scrivi un importo, per esempio 5.000.'))
    if ((n ?? undefined) === valore) return setError(null)
    setBusy(true)
    const m = await t.setTravelerBudget(tripId, travelerId, n)
    setBusy(false)
    setError(m)
    if (!m) showToast(n === null ? tt('Budget di {nome} tolto', { nome }) : tt('Budget di {nome}: {v1}', { nome, v1: formatMoney(n, cur) }))
  }
  return (
    <form onSubmit={salva} noValidate style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
      <div style={{ width: '100%' }}><Campo label={tt('Budget di {nome}', { nome })} icon="bag" inputMode="decimal" value={text} onChange={setText} placeholder={tt('Per esempio {v0}', { v0: formatMoney(1500, cur) })} error={error} /></div>
      <Pulsante type="submit" size="sm" color="secondary" isLoading={busy}>
        {tt('Salva')}
      </Pulsante>
    </form>
  )
}
