// Fogli «Nuova spesa» e «Modifica spesa» (mock Fa-30, #34): nome, importo con il convertitore (si scrive in una
// valuta e si legge l'altra), «Pagata da» obbligatorio, «Dividi in parti uguali» o le persone, categoria a pillole.
// Di base: pagata da me, divisa tra tutti, nella valuta del paese.
import { useState } from 'react'
import { dateInZone } from '../../lib/flights'
import { decimalsOf } from '../../lib/fx'
import { currencyName, formatMoney, parseAmount, rateFor, round2, tripCurrencies } from '../../lib/money'
import type { ExpenseInput } from '../../lib/moneyData'
import { CATEGORIE_BASE, catKey } from '../../lib/ricevuta'
import { tripToday } from '../../lib/today'
import { useMe, discOf, initials } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Expense, Trip } from '../../types'
import { Campo, Chip, Interruttore, Pulsante } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { inQuanti } from './testi'

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

/** Importo con il convertitore (ValutaPiccola): il campo attivo è quello in cui si scrive. */
function Importo({ base, other, rate, side, text, onSide, onText, label }: { base: string; other: string | null; rate: number | undefined; side: string; text: string; onSide: (cur: string, text: string) => void; onText: (t: string) => void; label: string }) {
  const n = leggi(text)
  const field = (cur: string) => {
    if (side === cur)
      return (
        <div className="fd act">
          <label className="fl2" htmlFor={`imp-${cur}`}>
            {nome(cur)} · {cur}
          </label>
          <div className="fv2">
            <input id={`imp-${cur}`} className="n" inputMode="decimal" value={text} placeholder="0" onChange={(e) => onText(e.currentTarget.value)} aria-label={`${label} in ${nome(cur)}`} />
            <span className="u">{sym(cur)}</span>
          </div>
        </div>
      )
    const conv = n !== null && rate ? (cur === base ? n * rate : n / rate) : null
    return (
      <button type="button" className="fd" onClick={() => onSide(cur, conv !== null ? scrivi(conv, cur) : '')} aria-label={`Scrivi in ${nome(cur)}`}>
        <span className="fl2">
          {nome(cur)} · {cur}
        </span>
        <span className="fv2">
          <span className="n">{conv !== null ? scrivi(conv, cur) : '—'}</span>
          <span className="u">{sym(cur)}</span>
        </span>
      </button>
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
        <div className="rr">{rate ? `1 ${sym(base)} = ${scrivi(1 / rate, other)} ${sym(other)}` : `Manca il cambio tra ${base} e ${other}: la spesa non conta nei totali finché non lo imposti.`}</div>
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
  const others = tripCurrencies(trip, expense?.currency).filter((c) => c !== base)
  const [other, setOther] = useState<string | null>(expense && expense.currency !== base ? expense.currency : (others[0] ?? null))
  const [side, setSide] = useState(expense?.currency ?? other ?? base)
  const [text, setText] = useState(expense ? scrivi(expense.amount, expense.currency) : '')
  const [label, setLabel] = useState(expense?.label ?? '')
  const [paidBy, setPaidBy] = useState(expense ? (expense.paidBy ?? '') : (me?.id ?? (trip.travelers.length === 1 ? trip.travelers[0].id : '')))
  const all = trip.travelers.map((p) => p.id)
  const shared = expense ? expense.shares.filter((s) => s.weight > 0).map((s) => s.travelerId) : []
  const [equal, setEqual] = useState(!expense || shared.length === 0 || all.every((id) => shared.includes(id)))
  const [who, setWho] = useState<string[]>(shared.length > 0 ? shared : all)
  const [category, setCategory] = useState(expense?.category?.trim() || cat0 || 'Cibo')
  const [newCat, setNewCat] = useState(false)
  const [errors, setErrors] = useState<{ label?: string; amount?: string; paidBy?: string; who?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  const rate = other ? rateFor(trip, other) : undefined
  const amount = leggi(text)
  const inBase = amount === null ? null : side === base ? amount : rate ? round2(amount * rate) : null
  const people = equal ? all : who
  const each = inBase !== null && people.length > 0 ? round2(inBase / people.length) : null
  const personali = trip.expenseCategories.map((c) => c.label).filter((l) => !CATEGORIE_BASE.some((b) => catKey(b.label) === catKey(l)))
  const scelte = ['Cibo', 'Trasporti', 'Alloggi', 'Attività', 'Voli', ...personali, 'Altro']

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!label.trim()) err.label = 'Scrivi il nome della spesa.'
    if (amount === null || !(amount > 0)) err.amount = "L'importo non è chiaro: scrivi per esempio 12,50."
    if (!paidBy) err.paidBy = 'Manca chi ha pagato. Scegli una persona.'
    if (!equal && who.length === 0) err.who = 'Scegli almeno una persona.'
    setErrors(err)
    if (Object.keys(err).length > 0) return
    setBusy(true)
    const id = expense?.id ?? crypto.randomUUID()
    const input: ExpenseInput = {
      ...(expense ? {} : { id }),
      label: label.trim(),
      category: category.trim() || 'Altro',
      amount: amount as number,
      currency: side,
      fxRate: null,
      paidBy,
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

  const toggleWho = (id: string) => setWho((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <Foglio
      open={open}
      full
      title={expense ? 'Modifica spesa' : 'Nuova spesa'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="spesa-form" isLoading={busy}>
          {busy ? 'Salvataggio…' : expense ? 'Salva le modifiche' : 'Salva la spesa'}
        </Pulsante>
      }
    >
      <form id="spesa-form" className="frm" onSubmit={submit} noValidate>
        <Campo label="Nome della spesa" value={label} onChange={setLabel} placeholder="es. Cena a Gion Karyo" maxLength={120} error={errors.label} />
        <div className="fa-fld">
          <span>Importo</span>
          {others.length > 1 ? (
            <div className="fa-chips scroll" role="group" aria-label="Valuta">
              {others.map((c) => (
                <Chip key={c} on={other === c} onPress={() => (setOther(c), side !== base && setSide(c))}>
                  {c}
                </Chip>
              ))}
            </div>
          ) : null}
          <Importo base={base} other={other} rate={rate} side={side} text={text} label="Importo" onText={setText} onSide={(c, v) => (setSide(c), setText(v))} />
          {errors.amount ? (
            <span className="fa-help bad" role="alert">
              <Sv name="err" size={16} />
              {errors.amount}
            </span>
          ) : null}
        </div>
        <div className="fa-fld" role="group" aria-label="Pagata da">
          Pagata da
          <div className="fa-chips wrap">
            {trip.travelers.map((p) => (
              <Chip key={p.id} on={paidBy === p.id} onPress={() => setPaidBy(p.id)} icon={<span className={cx('fa-av', `r${discOf(trip, p.id)}`)} style={{ width: 24, height: 24, fontSize: 11 }} aria-hidden="true">{initials(p.name)}</span>}>
                {p.name.split(/\s+/)[0]}
              </Chip>
            ))}
          </div>
          {errors.paidBy ? (
            <span className="fa-help bad" role="alert">
              <Sv name="err" size={16} />
              {errors.paidBy}
            </span>
          ) : null}
        </div>
        {trip.travelers.length > 1 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <Interruttore label="Dividi in parti uguali" isSelected={equal} onChange={setEqual} />
            {!equal ? (
              <div className="fa-chips wrap" role="group" aria-label="Per chi">
                {trip.travelers.map((p) => (
                  <Chip key={p.id} on={who.includes(p.id)} onPress={() => toggleWho(p.id)}>
                    {p.name.split(/\s+/)[0]}
                  </Chip>
                ))}
              </div>
            ) : null}
            {errors.who ? (
              <span className="fa-help bad" role="alert">
                <Sv name="err" size={16} />
                {errors.who}
              </span>
            ) : each !== null && people.length > 0 ? (
              <span className="fa-help ok">{people.length === 1 ? `Solo ${people[0] === me?.id ? 'tua' : `di ${trip.travelers.find((p) => p.id === people[0])?.name.split(/\s+/)[0]}`}: ${formatMoney(each, base)}` : `Diviso ${inQuanti(people.length)}: ${formatMoney(each, base)} a testa`}</span>
            ) : null}
          </div>
        ) : null}
        <div className="fa-fld" role="group" aria-label="Categoria">
          Categoria
          <div className="fa-chips scroll">
            {scelte.map((c) => (
              <Chip key={c} on={!newCat && catKey(category) === catKey(c)} onPress={() => (setNewCat(false), setCategory(c))}>
                {c}
              </Chip>
            ))}
            {!newCat && !scelte.some((c) => catKey(c) === catKey(category)) && category ? (
              <Chip on onPress={() => undefined}>
                {category}
              </Chip>
            ) : null}
            <Chip on={newCat} onPress={() => (setNewCat(true), setCategory(''))}>
              Nuova…
            </Chip>
          </div>
          {newCat ? <Campo label="Nuova categoria" hideLabel value={category} onChange={setCategory} placeholder="es. Souvenir" maxLength={40} autoFocus /> : null}
        </div>
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
