import { useState } from 'preact/hooks'
import { useConfirm } from './ConfirmDialog'
import { formatMoney, parseAmount, amountToText, tripCurrencies } from '../lib/money'
import { shareAmounts } from '../lib/budget'
import type { BudgetInput } from '../lib/moneyData'
import type { BudgetItem, Trip } from '../types'
import { CategorySelect } from './CategorySelect'
import { CheckField, CostFields, FormError, PrimaryButton, SecondaryButton, TextArea, TextField } from './Field'
import { TravelerChips } from './TravelerChips'

const SUGGESTED = ['Voli', 'Alloggi', 'Trasporti', 'Cibo', 'Biglietti e ingressi', 'Shopping', 'Assicurazione', 'Altro']

interface Props {
  trip: Trip
  initial?: BudgetItem
  /** Categoria di partenza per una voce nuova. */
  defaultCategory?: string
  onSubmit: (input: BudgetInput) => Promise<string | null>
  onDelete?: () => Promise<string | null>
  onDone: () => void
}

export function BudgetItemForm({ trip, initial, defaultCategory, onSubmit, onDelete, onDone }: Props) {
  const everyone = trip.travelers.map((t) => t.id)
  const [label, setLabel] = useState(initial?.label ?? '')
  const [category, setCategory] = useState(initial?.category ?? defaultCategory ?? '')
  const [amount, setAmount] = useState(amountToText(initial?.amount))
  const [currency, setCurrency] = useState(initial?.currency ?? trip.baseCurrency)
  const [scope, setScope] = useState<'per_person' | 'total'>(initial?.scope ?? 'per_person')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [payers, setPayers] = useState<string[]>(initial ? initial.shares.map((s) => s.travelerId) : everyone)
  const [paid, setPaid] = useState<string[]>(initial ? initial.shares.filter((s) => s.paid).map((s) => s.travelerId) : [])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const value = parseAmount(amount)
  const each = value !== null && payers.length > 0 ? shareAmounts({ amount: value, scope }, payers.length)[0] : null

  function setPayerList(ids: string[]) {
    setPayers(ids)
    setPaid((p) => p.filter((id) => ids.includes(id)))
  }
  const togglePaid = (id: string) => setPaid((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  async function submit(e: Event) {
    e.preventDefault()
    if (!label.trim()) return setError('Scrivi cosa è questo costo (es. Treno per Nikko).')
    if (value === null) return setError("Inserisci l'importo (es. 30 o 12,50).")
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) return setError('La valuta è un codice di 3 lettere (es. EUR).')
    if (trip.travelers.length > 0 && payers.length === 0) return setError('Scegli almeno una persona che paga.')
    setBusy(true)
    setError(null)
    const message = await onSubmit({
      label, category, amount: value, currency, scope, dueDate, notes, travelerIds: payers, paidIds: paid,
    })
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  const [confirm, confirmDialog] = useConfirm()

  async function remove() {
    if (!onDelete) return
    if (!(await confirm({ title: 'Eliminare questo costo previsto?', text: 'Puoi annullare subito dopo.' }))) return
    setBusy(true)
    const message = await onDelete()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <TextField label="Voce" value={label} onInput={setLabel} maxLength={120} />
      <CategorySelect value={category} onChange={setCategory} categories={trip.expenseCategories} suggestions={SUGGESTED} />

      <CostFields amountLabel="Importo" amount={amount} currency={currency} currencies={tripCurrencies(trip, initial?.currency)} scope={scope} onAmount={setAmount} onCurrency={setCurrency} onScope={setScope} />

      {trip.travelers.length > 0 && (
        <>
          <TravelerChips
            label="Chi paga"
            travelers={trip.travelers}
            selected={payers}
            onChange={setPayerList}
            hint={
              each !== null
                ? scope === 'per_person'
                  ? `Ognuno paga ${formatMoney(each, currency.toUpperCase())}.`
                  : `Diviso in parti uguali: ${formatMoney(each, currency.toUpperCase())} a testa.`
                : undefined
            }
          />
          {payers.length > 0 && (
            <div class="rounded-2xl border-2 border-line px-4 py-1">
              <p class="pt-2 text-sm font-extrabold">Ha già pagato</p>
              {trip.travelers
                .filter((t) => payers.includes(t.id))
                .map((t) => (
                  <CheckField label={t.name} checked={paid.includes(t.id)} onChange={() => togglePaid(t.id)} />
                ))}
            </div>
          )}
        </>
      )}

      <TextField label="Da pagare entro (facoltativo)" type="date" value={dueDate} onInput={setDueDate} />
      <TextArea label="Note" value={notes} onInput={setNotes} />
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : initial ? 'Salva costo' : 'Aggiungi costo'}</PrimaryButton>
      {onDelete && <SecondaryButton danger onClick={() => void remove()}>Elimina costo</SecondaryButton>}
    {confirmDialog}
    </form>
  )
}
