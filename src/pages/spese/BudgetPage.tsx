// Budget del viaggio (mock Fa-34 e Fa-35, #34): stato vuoto con «Imposta il budget», poi il totale con la barra,
// «Cambia il budget», l'avviso quando è superato e le categorie con speso e previsto.
import { useMemo, useState } from 'react'
import { formatMoney, parseAmount, round2 } from '../../lib/money'
import { iconaSezione, ricevuta } from '../../lib/ricevuta'
import { riassunto } from '../../lib/spese'
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

export function BudgetPage() {
  const trip = useTrip()
  const t = useTrips()
  const me = useMe(trip)
  const r = riassunto(trip, me?.id)
  const dati = useMemo(() => ricevuta(trip, r.spese, r.fx), [trip, r.spese, r.fx])
  const cur = trip.baseCurrency
  const limit = trip.budgetLimit
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(limit ? String(limit).replace('.', ',') : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const [fx, setFx] = useState(false)

  async function save(value: number | null) {
    setBusy(true)
    const m = await t.setTripBudgetLimit(trip.id, value)
    setBusy(false)
    if (m) return setError(m)
    setError(null)
    setEditing(false)
    showToast(value === null ? 'Budget tolto' : `Budget: ${formatMoney(value, cur)}`)
  }
  function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const n = parseAmount(text)
    if (n === null || !(n > 0)) return setError('Il budget non è chiaro: scrivi un importo, per esempio 5.000.')
    void save(n)
  }

  const pct = limit ? Math.round((r.speso / limit) * 100) : 0
  const over = limit ? round2(r.speso - limit) : 0
  const cats = dati.categorie.filter((c) => c.spent > 0 || c.planned > 0)

  const form = (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
      <Campo label="Budget del viaggio" icon="bag" inputMode="decimal" value={text} onChange={setText} placeholder={`Per esempio ${formatMoney(5000, cur)}`} error={error} autoFocus={editing} />
      <Pulsante type="submit" isLoading={busy}>
        {limit ? 'Salva il budget' : 'Imposta il budget'}
      </Pulsante>
      {editing ? (
        <Pulsante color="secondary" onPress={() => (setEditing(false), setError(null))}>
          Annulla
        </Pulsante>
      ) : null}
    </form>
  )

  return (
    <Schermata
      bar={<BarraIndietro title="Budget" back="/spese" right={<PulsanteIcona icon="dots" label="Altre azioni" onPress={() => setMenu(true)} />} />}
      overlay={
        <>
          <Foglio open={menu} title="Budget" onClose={() => setMenu(false)} plain>
            <div className="fa-list">
              {limit ? <Riga icon={<Sv name="trash" size={22} />} title="Togli il budget" sub="La pagina Spese mostra solo quanto hai speso" onPress={() => (setMenu(false), void save(null))} /> : null}
              <Riga icon={<Sv name="globe" size={22} />} title="Cambio delle valute" sub="Quanto vale la valuta del paese in quella di casa" onPress={() => (setMenu(false), setFx(true))} />
            </div>
          </Foglio>
          {fx ? (
            <Foglio open title="Cambio delle valute" onClose={() => setFx(false)}>
              <div className="legacy">
                <FxForm
                  trip={trip}
                  onSubmit={(rate, extra) => (Object.keys(extra).length === 0 && !trip.fxRates ? t.setFxRate(trip.id, rate) : t.setFxRates(trip.id, rate, extra))}
                  onDone={() => setFx(false)}
                />
              </div>
            </Foglio>
          ) : null}
        </>
      }
    >
      {!limit ? (
        <section className="fa-card xl pad" style={{ display: 'grid', gap: 12 }}>
          <h2 className="fa-h2">Nessun budget impostato</h2>
          <p className="fa-lead" style={{ color: 'var(--ink-muted)' }}>
            Con un budget vedi quanto manca e ricevi un avviso prima di superarlo.
          </p>
          {form}
        </section>
      ) : (
        <>
          {over > 0 ? (
            <div className="fa-banner cor" role="status">
              <Sv name="err" size={20} />
              <span>
                <b>Budget superato.</b> Hai speso {formatMoney(over, cur)} in più del previsto.
              </span>
            </div>
          ) : null}
          <section className="fa-card xl pad" style={{ display: 'grid', gap: 12 }}>
            {editing ? (
              form
            ) : (
              <>
                <span className="fa-m">Budget del viaggio</span>
                <span style={{ font: '600 40px/44px var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(limit, cur)}</span>
                <div className="fa-pbar" role="progressbar" aria-label={over > 0 ? 'Budget superato' : `Budget usato, ${pct}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, pct)}>
                  <i style={{ width: `${Math.min(100, pct)}%`, background: over > 0 ? 'var(--danger)' : undefined }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span className="fa-m">Speso {formatMoney(r.speso, cur)}</span>
                  {over > 0 ? (
                    <span className="fa-st ba">
                      <Sv name="err" size={16} />
                      Superato di {formatMoney(over, cur)}
                    </span>
                  ) : (
                    <span className="fa-m">{pct}%</span>
                  )}
                </div>
                <Pulsante color="secondary" iconLeading="pencil" onPress={() => setEditing(true)}>
                  Cambia il budget
                </Pulsante>
              </>
            )}
          </section>
          {cats.length > 0 ? (
            <>
              <div className="fa-sech">
                <h2 className="fa-h3">Per categoria</h2>
              </div>
              <section className="fa-card xl" style={{ overflow: 'hidden', padding: '4px 0' }}>
                {cats.map((c, i) => {
                  const ratio = c.planned > 0 ? c.spent / c.planned : c.spent > 0 ? 2 : 0
                  const oltre = round2(c.spent - c.planned)
                  const pagati = c.voci.tot > 0 && c.voci.paid === c.voci.tot && c.unpaid === 0 && oltre <= 0
                  const stato = ratio > 1.05 ? 'over' : ratio >= 0.9 && !pagati ? 'warn' : pagati ? 'paid' : 'ok'
                  const color = stato === 'over' ? 'var(--danger)' : stato === 'warn' ? 'var(--warning)' : 'var(--azzurro)'
                  return (
                    <div key={c.key}>
                      {i > 0 ? <div className="fa-hr" /> : null}
                      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 12, alignItems: 'center', padding: '12px 16px' }}>
                        <Ic name={iconaSezione(c.label)} size={44} />
                        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span className="fa-b">{c.label}</span>
                            <span className="fa-amt">{formatMoney(c.spent, cur)}</span>
                          </div>
                          <div className="fa-pbar" role="progressbar" aria-label={`${c.label}, ${Math.round(ratio * 100)}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(ratio * 100))}>
                            <i style={{ width: `${Math.min(100, Math.round(ratio * 100))}%`, background: color }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span className="fa-c">{c.planned > 0 ? `Previsto ${formatMoney(c.planned, cur)}` : 'Nessun previsto'}</span>
                            {stato === 'paid' ? (
                              <span className="fa-st ok">
                                <Sv name="check" size={16} />
                                Pagati
                              </span>
                            ) : stato === 'over' ? (
                              <span className="fa-st ba">
                                <Sv name="err" size={16} />
                                Oltre di {formatMoney(oltre, cur)}
                              </span>
                            ) : stato === 'warn' ? (
                              <span className="fa-st wa">
                                <Sv name="warn" size={16} />
                                Quasi al limite
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </section>
              <p className="fa-m" style={{ textAlign: 'center' }}>
                Il previsto di ogni categoria si cambia toccandola nella ricevuta della pagina Spese.
              </p>
            </>
          ) : null}
        </>
      )}
    </Schermata>
  )
}
