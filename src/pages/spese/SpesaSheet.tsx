// Fogli «Nuova spesa» e «Modifica spesa» (mock Fa-30, #34): nome, importo con il convertitore (si scrive in una
// valuta e si legge l'altra), «Pagata da» obbligatorio, «Per chi» a riquadri e «Come dividere», categoria a riquadri.
// Di base: pagata da me, divisa tra tutti, nella valuta del paese.
import { SceltaIcona } from '../../faraway/SceltaIcona'
import { glifoCategoria, iconaDalNome } from '../../lib/categoryIcon'
import { useEffect, useState } from 'react'
import { dateInZone } from '../../lib/flights'
import { removeBookingFile } from '../../lib/bookingFiles'
import { decimalsOf } from '../../lib/fx'
import { fetchFxQuote } from '../../lib/moneyApi'
import { checkPayers, checkSplit } from '../../lib/ripartizione'
import { currencyName, formatMoney, parseAmount, rateFor, round2, tripCurrencies } from '../../lib/money'
import type { ExpenseInput } from '../../lib/moneyData'
import { CATEGORIE_BASE, catKey } from '../../lib/ricevuta'
import { valutaDelGiorno } from '../../lib/paesi'
import { tripToday } from '../../lib/today'
import { useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { cx } from '../../faraway/cx'
import { useTrips } from '../../state/trip'
import type { Expense, ExpenseFile, SplitMode, Trip } from '../../types'
import { Campo, Chip, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Riquadri } from '../../faraway/Moduli'
import { Sv } from '../../faraway/icons'
import { inQuanti } from './testi'
import { CambioRiga, defaultVals, DivisioneEditor, PagantiEditor, payersFromRows, RicevuteEditor, sharesFrom, type PayRow } from './SpesaAvanzata'

const sym = (cur: string) => {
  try {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? cur
  } catch {
    return cur
  }
}
const nome = (cur: string) => {
  const n = currencyName(cur)
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : cur
}
const scrivi = (v: number, cur: string) => v.toLocaleString('it-IT', { maximumFractionDigits: decimalsOf(cur), minimumFractionDigits: 0 })
const leggi = (t: string) => parseAmount(t)
const NUOVA = '__nuova__'
/** Glifo della categoria di spesa: quello delle categorie base, altrimenti dall'icona scelta o dedotta dal nome. */
function glifoSpesa(label: string): string {
  const base = CATEGORIE_BASE.find((c) => catKey(c.label) === catKey(label))
  return base ? base.icon.replace(/^i-/, 'g-') : glifoCategoria(label)
}

/** Importo con il convertitore (ValutaPiccola): il campo attivo è quello in cui si scrive. */
function Importo({ base, other, rate, side, text, onSide, onText, label, cambioSotto }: { base: string; other: string | null; rate: number | undefined; side: string; text: string; onSide: (cur: string, text: string) => void; onText: (t: string) => void; label: string; /** sotto c'è già la riga del cambio con la fonte: qui non si ripete */ cambioSotto?: boolean }) {
  const n = leggi(text)
  // i due lati sono sempre campi veri: un tocco sul lato spento lo accende e apre subito la tastiera (prima era un
  // pulsante che diventava campo, e su iOS serviva un secondo tocco). Stessa struttura: React tiene lo stesso <input>.
  const field = (cur: string) => {
    const attivo = side === cur
    const conv = !attivo && n !== null && rate ? (cur === base ? n * rate : n / rate) : null
    const convTesto = conv !== null ? scrivi(conv, cur) : ''
    return (
      <div className={cx('fd', attivo && 'act')} onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}>
        <label className="fl2" htmlFor={`imp-${cur}`}>
          {nome(cur)} · {cur}
        </label>
        <div className="fv2">
          <input
            id={`imp-${cur}`}
            className="n"
            inputMode="decimal"
            value={attivo ? text : convTesto}
            placeholder={attivo ? '0' : '—'}
            onFocus={attivo ? undefined : () => onSide(cur, convTesto)}
            onChange={(e) => onText(e.currentTarget.value)}
            aria-label={attivo ? `${label} in ${nome(cur)}` : `Scrivi in ${nome(cur)}`}
          />
          <span className="u">{sym(cur)}</span>
        </div>
      </div>
    )
  }
  if (!other) return <div className="k-ValutaPiccola"><div className="vc sm"><div className="io">{field(base)}</div></div></div>
  return (
    <div className="k-ValutaPiccola">
      <div className="vc sm">
        <div className="io" aria-live="polite">
          {field(base)}
          <span aria-hidden="true" className="eq">
            =
          </span>
          {field(other)}
        </div>
        {rate && cambioSotto ? null : <div className="rr">{rate ? `1 ${sym(base)} = ${scrivi(1 / rate, other)} ${sym(other)}` : `Manca il cambio tra ${base} e ${other}: la spesa non conta nei totali finché non lo imposti.`}</div>}
      </div>
    </div>
  )
}

interface Props {
  trip: Trip
  /** Presente in modifica. */
  expense?: Expense
  open: boolean
  onClose: () => void
  /** Categoria proposta (es. dalla ricevuta). */
  category?: string
}

export function SpesaSheet({ trip, expense, open, onClose, category: cat0 }: Props) {
  const t = useTrips()
  const me = useMe(trip)
  const base = trip.baseCurrency
  // la valuta del paese di oggi sta davanti alle altre (più paesi, #35)
  const delGiorno = valutaDelGiorno(trip, expense ? dateInZone(expense.spentAt, trip.timezone) : tripToday(trip))
  const others = tripCurrencies(trip, expense?.currency).filter((c) => c !== base).sort((a, b) => Number(b === delGiorno) - Number(a === delGiorno))
  const [other, setOther] = useState<string | null>(expense && expense.currency !== base ? expense.currency : (others[0] ?? null))
  const [side, setSide] = useState(expense?.currency ?? other ?? base)
  const [text, setText] = useState(expense ? scrivi(expense.amount, expense.currency) : '')
  const [label, setLabel] = useState(expense?.label ?? '')
  const [paidBy, setPaidBy] = useState(expense ? (expense.paidBy ?? '') : (me?.id ?? (trip.travelers.length === 1 ? trip.travelers[0].id : '')))
  const all = trip.travelers.map((p) => p.id)
  const shared = expense ? expense.shares.filter((s) => s.weight > 0).map((s) => s.travelerId) : []
  const num = (n: number) => String(n).replace('.', ',')
  const [mode, setMode] = useState<SplitMode>(expense?.splitMode ?? 'equal')
  const [who, setWho] = useState<string[]>(shared.length > 0 ? shared : all)
  const [vals, setVals] = useState<Record<string, string>>(() =>
    expense && expense.splitMode && expense.splitMode !== 'equal'
      ? Object.fromEntries(expense.shares.map((x) => [x.travelerId, num(expense.splitMode === 'percent' ? (x.percent ?? 0) : (x.amount ?? 0))]))
      : {},
  )
  // più paganti: `null` = una persona sola (quella di «Pagata da»)
  const [payRows, setPayRows] = useState<PayRow[] | null>(() =>
    expense?.payers && expense.payers.length > 1 ? expense.payers.map((p) => ({ id: p.travelerId, text: num(p.amount) })) : null,
  )
  // cambio scritto sulla spesa: tasso, da dove viene, quando, se a mano
  const [fx, setFx] = useState<{ rate?: number; source?: string; at?: string; manual?: boolean; setBy?: string }>(() =>
    expense?.fxRate ? { rate: expense.fxRate, source: expense.fxSource, at: expense.fxAt, manual: expense.fxManual, setBy: expense.fxSetBy } : {},
  )
  const [fxBusy, setFxBusy] = useState(false)
  const [spesaId] = useState(() => expense?.id ?? crypto.randomUUID())
  const [added, setAdded] = useState<ExpenseFile[]>([])
  const [gone, setGone] = useState<string[]>([])
  const [category, setCategory] = useState(expense?.category?.trim() || cat0 || 'Cibo')
  const [newCat, setNewCat] = useState(false)
  /** Icona scelta a mano per la categoria nuova; finché non la si tocca segue il nome che si scrive. */
  const [icona, setIcona] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ label?: string; amount?: string; paidBy?: string; who?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  const tripRate = other ? rateFor(trip, other) : undefined
  const rate = fx.rate ?? tripRate
  const amount = leggi(text)
  const inBase = amount === null ? null : side === base ? amount : rate ? round2(amount * rate) : null
  const people = who
  const each = inBase !== null && people.length > 0 ? round2(inBase / people.length) : null

  // spesa nuova in valuta estera: leggo il cambio del giorno (BCE) e lo scrivo sulla spesa; senza rete vale quello del viaggio
  useEffect(() => {
    if (!open || !other || expense?.fxRate || !navigator.onLine) return
    let cancelled = false
    void fetchFxQuote(other, base)
      .then((q) => !cancelled && setFx((cur) => (cur.manual ? cur : { rate: Math.round(q.rate * 1e6) / 1e6, source: q.source, at: q.at })))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open, other, base, expense?.fxRate])

  async function refreshFx() {
    if (!other) return
    setFxBusy(true)
    try {
      const q = await fetchFxQuote(other, base)
      setFx({ rate: Math.round(q.rate * 1e6) / 1e6, source: q.source, at: q.at })
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Non riesco a leggere il cambio.')
    } finally {
      setFxBusy(false)
    }
  }

  async function removeFile(f: ExpenseFile) {
    if (added.some((a) => a.id === f.id)) {
      setAdded((cur) => cur.filter((a) => a.id !== f.id))
      await removeBookingFile(f.path).catch(() => undefined)
      return
    }
    const m = await t.removeExpenseFile(f.id, f.path)
    if (m) showToast(m)
    else setGone((cur) => [...cur, f.id])
  }
  const personali = trip.expenseCategories.filter((c) => !c.archived || catKey(c.label) === catKey(category)).map((c) => c.label).filter((l) => !CATEGORIE_BASE.some((b) => catKey(b.label) === catKey(l)))
  const scelte = ['Cibo', 'Trasporti', 'Alloggi', 'Attività', 'Voli', ...personali, 'Altro']
  // la categoria scritta sulla spesa resta tra le scelte anche se non è più proposta
  const opzioniCat = !newCat && category && !scelte.some((c) => catKey(c) === catKey(category)) ? [...scelte, category] : scelte

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!label.trim()) err.label = 'Scrivi il nome della spesa.'
    if (amount === null || !(amount > 0)) err.amount = "L'importo non è chiaro: scrivi per esempio 12,50."
    const payers = payRows ? payersFromRows(payRows) : []
    if (payRows) {
      if (payRows.some((r) => !r.id)) err.paidBy = 'Scegli chi è il pagante che hai aggiunto, oppure toglilo.'
      else if (amount !== null && !checkPayers(amount, payers, side).ok) err.paidBy = checkPayers(amount, payers, side).message
    } else if (!paidBy) err.paidBy = 'Manca chi ha pagato. Scegli una persona.'
    if (who.length === 0) err.who = 'Scegli almeno una persona.'
    else if (amount !== null && !checkSplit(mode, amount, sharesFrom(mode, who, vals), side).ok) err.who = checkSplit(mode, amount, sharesFrom(mode, who, vals), side).message
    setErrors(err)
    if (Object.keys(err).length > 0) return
    setBusy(true)
    const useRate = fx.rate ?? (expense && !expense.fxRate ? undefined : tripRate)
    const id = spesaId
    const input: ExpenseInput = {
      ...(expense ? {} : { id }),
      label: label.trim(),
      category: category.trim() || 'Altro',
      ...(newCat && category.trim() ? { categoryIcon: icona ?? iconaDalNome(category) } : {}),
      amount: amount as number,
      currency: side,
      // il cambio resta scritto sulla spesa: i totali di ieri non cambiano se domani il cambio si muove
      fxRate: side !== base && useRate ? useRate : null,
      ...(side !== base && useRate ? { fxSource: fx.rate ? fx.source : 'Cambio del viaggio', fxAt: fx.rate ? fx.at : undefined, fxManual: !!fx.manual, ...(fx.manual ? { fxSetBy: fx.setBy ?? me?.userId } : {}) } : {}),
      paidBy: payRows ? (payers[0]?.travelerId ?? paidBy) : paidBy,
      ...(payRows ? { payers } : {}),
      splitMode: mode,
      shares: sharesFrom(mode, who, vals),
      ...(added.length > 0 ? { newFiles: added } : {}),
      spentDate: expense ? dateInZone(expense.spentAt, trip.timezone) : tripToday(trip),
      notes: expense?.notes ?? '',
      travelerIds: people,
      ...(expense?.source ? { source: expense.source } : {}),
    }
    const message = expense ? await t.updateExpense(trip.id, expense, input) : await t.createExpense(trip.id, input)
    setBusy(false)
    if (message) return setErrors({ form: message })
    if (expense) showToast('Spesa aggiornata')
    else {
      const offline = !navigator.onLine || t.stale
      const quanti = people.length > 1 ? ` ${inQuanti(people.length)}` : ''
      showToast(offline ? 'Spesa registrata. La invio quando c’è rete.' : `Spesa registrata: ${formatMoney(amount as number, side)}${quanti}.`, { label: 'Annulla', run: () => void t.setExpenseDeleted(id, true) })
    }
    onClose()
  }

  return (
    <Foglio
      open={open}
      full
      title={expense ? 'Modifica spesa' : 'Nuova spesa'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="spesa-form" isLoading={busy}>
          {expense ? 'Salva le modifiche' : 'Salva la spesa'}
        </Pulsante>
      }
    >
      <form id="spesa-form" className="frm" onSubmit={submit} noValidate>
        <Campo label="Nome della spesa" value={label} onChange={setLabel} placeholder="es. Cena al ristorante" maxLength={120} error={errors.label} />
        <div className="fa-fld">
          <span>Importo</span>
          {others.length > 1 ? (
            <div className="fa-chips wrap" role="group" aria-label="Valuta">
              {others.map((c) => (
                <Chip key={c} on={other === c} onPress={() => (setOther(c), side !== base && setSide(c))}>
                  {c}
                </Chip>
              ))}
            </div>
          ) : null}
          <Importo base={base} other={other} rate={rate} side={side} text={text} label="Importo" cambioSotto={!!other && side !== base} onText={setText} onSide={(c, v) => (setSide(c), setText(v), mode === 'fixed' && setVals(defaultVals('fixed', who, leggi(v))))} />
          {errors.amount ? (
            <span className="fa-help bad" role="alert">
              <Sv name="err" size={16} />
              {errors.amount}
            </span>
          ) : null}
        </div>
        {other && side !== base && rate ? (
          <CambioRiga base={base} other={other} rate={rate} source={fx.rate ? fx.source : (expense?.fxRate ? expense.fxSource : 'Cambio del viaggio')} at={fx.at} manual={fx.manual} setBy={trip.travelers.find((p) => p.userId === fx.setBy)?.name} busy={fxBusy} onRefresh={() => void refreshFx()} onManual={(r) => setFx({ rate: r, source: 'A mano', at: new Date().toISOString(), manual: true, setBy: me?.userId })} />
        ) : null}
        <PagantiEditor trip={trip} total={amount} currency={side} rows={payRows} onRows={setPayRows} single={paidBy} onSingle={setPaidBy} error={errors.paidBy} />
        {trip.travelers.length > 1 ? (
          <DivisioneEditor
            trip={trip}
            meId={me?.id}
            mode={mode}
            onMode={setMode}
            who={who}
            onWho={setWho}
            vals={vals}
            onVals={setVals}
            total={amount}
            currency={side}
            hint={mode === 'equal' && each !== null && people.length > 0 ? (people.length === 1 ? `Solo ${people[0] === me?.id ? 'tua' : `di ${trip.travelers.find((p) => p.id === people[0])?.name.split(/\s+/)[0]}`}: ${formatMoney(each, base)}` : `Diviso ${inQuanti(people.length)}: ${formatMoney(each, base)} a testa`) : undefined}
          />
        ) : null}
        {errors.who && trip.travelers.length > 1 ? (
          <span className="fa-help bad" role="alert">
            <Sv name="err" size={16} />
            {errors.who}
          </span>
        ) : null}
        <Riquadri<string>
          label="Categoria"
          cols={4}
          value={newCat ? NUOVA : (opzioniCat.find((c) => catKey(c) === catKey(category)) ?? '')}
          onChange={(c) => {
            if (!c) return
            if (c === NUOVA) return (setNewCat(true), setCategory(''))
            setNewCat(false)
            setCategory(c)
          }}
          options={[...opzioniCat.map((c) => ({ value: c, label: c, glifo: glifoSpesa(c) })), { value: NUOVA, label: 'Nuova…', glifo: 'g-plus' }]}
        >
          {newCat ? <Campo label="Nuova categoria" hideLabel value={category} onChange={setCategory} placeholder="es. Souvenir" maxLength={40} autoFocus /> : null}
          {newCat ? <SceltaIcona value={icona ?? iconaDalNome(category)} onChange={setIcona} /> : null}
        </Riquadri>
        <RicevuteEditor trip={trip} expenseId={spesaId} files={(expense?.files ?? []).filter((f) => !gone.includes(f.id))} added={added} onAdded={setAdded} onRemove={(f) => void removeFile(f)} />
        {errors.form ? (
          <span className="fa-help bad" role="alert">
            <Sv name="err" size={16} />
            {errors.form}
          </span>
        ) : null}
      </form>
    </Foglio>
  )
}
