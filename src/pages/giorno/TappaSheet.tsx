// Fogli «Aggiungi tappa» e «Modifica tappa» (mock Fa-14, issue #32): luogo o attività (luoghi salvati o
// testo libero), ora, durata, categoria a pillole, note; in modifica anche costo, «Pagato da» e per chi:
// il costo diventa la spesa collegata in Spese.
import { useConflitto } from '../../faraway/useConflitto'
import { useMemo, useState } from 'react'
import { formatDuration, parseDuration } from '../../lib/duration'
import { formatMoney, parseAmount, round2, tripCurrencies } from '../../lib/money'
import type { ItemInput } from '../../lib/tripApi'
import { categoriaDaTappa } from '../../lib/ricevuta'
import { durata } from '../../lib/tappa'
import { useTrips } from '../../state/trip'
import { useMe } from '../../state/me'
import type { Day, DayItem, ItemKind, Trip } from '../../types'
import { schema } from '../../lib/schema'
import { disallineamenti, prenotazioniFisse } from '../../lib/vincoli'
import { Banner, Campo, Chip, Interruttore, Pulsante } from '../../faraway/base'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { UltimaModifica } from '../../faraway/UltimaModifica'

const PARTS = ['', 'da solo', 'in due', 'in tre', 'in quattro', 'in cinque', 'in sei', 'in sette', 'in otto']
export const inQuanti = (n: number) => PARTS[n] ?? `in ${n}`

interface Props {
  trip: Trip
  day: Day
  /** Presente in modifica. */
  item?: DayItem
  open: boolean
  onClose: () => void
  /** Numero del giorno nel viaggio (per «Aggiungi al Giorno 6»). */
  dayNumber: number
}

export function TappaSheet({ trip, day, item, open, onClose, dayNumber }: Props) {
  const [procediConflitto, nodoConflitto] = useConflitto(trip, 'day_items', item?.id)
  const t = useTrips()
  const editing = Boolean(item)
  const place0 = item?.placeId ? trip.places.find((p) => p.id === item.placeId) : undefined
  const linked = item ? trip.expenses.find((e) => e.source?.kind === 'day_item' && e.source.id === item.id) : undefined
  const me = useMe(trip)

  const [title, setTitle] = useState(item?.title ?? '')
  const [placeId, setPlaceId] = useState(item?.placeId ?? '')
  const [time, setTime] = useState(item?.time ?? '')
  const [duration, setDuration] = useState(item?.durationMinutes ? formatDuration(item.durationMinutes) : '')
  const [categoryId, setCategoryId] = useState<string>(item?.categoryId ?? place0?.categoryId ?? '')
  const [notes, setNotes] = useState(item?.note ?? '')
  const [cost, setCost] = useState(linked ? String(linked.amount).replace('.', ',') : '')
  const [currency, setCurrency] = useState(linked?.currency ?? trip.localCurrency ?? trip.baseCurrency)
  const [paidBy, setPaidBy] = useState(linked?.paidBy ?? me?.id ?? trip.travelers[0]?.id ?? '')
  const [who, setWho] = useState<string[]>(item?.participants ?? [])
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<ItemKind>(item?.kind ?? 'visit')
  const [vincolata, setVincolata] = useState(item?.timeLock === 'locked')
  const [ask, confirmNode] = useConferma()
  const fisse = item ? prenotazioniFisse(trip, item.id) : []
  const diversi = item ? disallineamenti(trip, { id: item.id, time }) : []
  const [busy, setBusy] = useState(false)
  const [focusTitle, setFocusTitle] = useState(false)

  const cats = useMemo(() => {
    const used = new Map<string, number>()
    for (const p of trip.places) if (p.categoryId) used.set(p.categoryId, (used.get(p.categoryId) ?? 0) + 1)
    return [...trip.categories].sort((a, b) => (used.get(b.id) ?? 0) - (used.get(a.id) ?? 0)).slice(0, 8)
  }, [trip.places, trip.categories])

  const q = title.trim().toLowerCase()
  const suggestions = focusTitle && q.length >= 1 ? trip.places.filter((p) => p.name.toLowerCase().includes(q) && p.id !== placeId).slice(0, 5) : []
  const place = placeId ? trip.places.find((p) => p.id === placeId) : undefined

  const amount = cost.trim() ? parseAmount(cost) : null
  const people = who.length > 0 ? who.length : trip.travelers.length
  const each = amount && people > 0 ? round2(amount / people) : null

  function pickPlace(id: string) {
    const p = trip.places.find((x) => x.id === id)
    if (!p) return
    setPlaceId(id)
    setTitle(p.name)
    if (!categoryId && p.categoryId) setCategoryId(p.categoryId)
    setFocusTitle(false)
  }

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!title.trim()) return setError('Scrivi il luogo o cosa fate in questa tappa.')
    const minutes = parseDuration(duration)
    if (Number.isNaN(minutes)) return setError('La durata non è chiara: scrivi per esempio 45 min o 1 h 30.')
    if (cost.trim() && (amount === null || amount < 0)) return setError("Il costo non è chiaro: scrivi un importo, per esempio 12,50.")
    if (amount && !paidBy) return setError('Manca chi ha pagato. Scegli una persona.')
    if (!(await procediConflitto())) return
    setBusy(true)
    setError(null)
    // il luogo resta collegato solo se il titolo è ancora il suo
    const keepPlace = place && place.name.trim().toLowerCase() === title.trim().toLowerCase() ? place.id : null
    const input: ItemInput = {
      title,
      kind,
      startTime: time,
      endTime: item?.endTime ?? '',
      notes,
      placeId: keepPlace,
      durationMinutes: minutes === null && !item?.durationMinutes ? undefined : minutes,
      categoryId: categoryId || null,
      ...(editing ? { participants: who } : {}),
    }
    let message = item ? await t.updateItem(item.id, input) : await t.createItem(trip.id, day.id, input)
    if (!message && item && schema.timeLock && vincolata !== (item.timeLock === 'locked')) message = await t.setItemLock(item.id, vincolata && time ? 'locked' : 'flexible', 'manual')
    if (!message && item && (amount || linked)) {
      const catLabel = linked?.category || categoriaDaTappa(trip.categories.find((c) => c.id === categoryId)?.label ?? '')
      message = await t.saveItemCost(trip.id, item.id, amount ? { amount, currency, paidBy, travelerIds: who, category: catLabel, notes: linked?.notes } : null)
    }
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  const toggleWho = (id: string) => setWho((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <Foglio
      open={open}
      title={editing ? 'Modifica tappa' : 'Aggiungi tappa'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="tappa-form" isLoading={busy}>
          {busy ? 'Salvataggio…' : editing ? 'Salva modifiche' : `Aggiungi al Giorno ${dayNumber}`}
        </Pulsante>
      }
    >
      <form id="tappa-form" className="frm" onSubmit={submit} noValidate style={{ overflow: 'visible' }}>
        <div style={{ position: 'relative', display: 'grid', gap: 8 }}>
          <Campo
            label="Luogo o attività"
            icon="pin"
            value={title}
            onChange={(v) => {
              setTitle(v)
              setFocusTitle(true)
            }}
            placeholder="Cerca tra i luoghi salvati o scrivi"
            maxLength={120}
            autoComplete="off"
          />
          {suggestions.length > 0 ? (
            <ul className="fa-list" role="listbox" aria-label="Luoghi salvati">
              {suggestions.map((p) => (
                <li key={p.id} role="option" aria-selected={false}>
                  <button type="button" className="fa-row" style={{ minHeight: 52, gridTemplateColumns: '20px minmax(0,1fr) auto' }} onClick={() => pickPlace(p.id)}>
                    <Sv name="pin" size={20} />
                    <span style={{ minWidth: 0 }}>
                      <span className="t" style={{ display: 'block' }}>
                        {p.name}
                      </span>
                      <span className="s" style={{ display: 'block' }}>
                        {[p.city, p.category].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {kind === 'visit' || kind === 'meal' || kind === 'free' || kind === 'note' ? (
          <div className="fa-fld" role="group" aria-label="Tipo di tappa">
            Tipo
            <div className="fa-chips wrap">
              {([['visit', 'Luogo'], ['meal', 'Pasto'], ['free', 'Attività libera'], ['note', 'Nota']] as [ItemKind, string][]).map(([k, l]) => (
                <Chip key={k} on={kind === k} onPress={() => setKind(k)}>{l}</Chip>
              ))}
            </div>
            {kind === 'free' || kind === 'note' ? <span className="fa-help">Senza posizione: pause, pasti e note stanno nella lista ma non sulla mappa.</span> : null}
          </div>
        ) : null}
        <div className="fa-2c">
          <Campo label="Ora" icon="clock" type="time" value={time} onChange={setTime} />
          <Campo label="Durata" value={duration} onChange={setDuration} placeholder={place?.visitMinutes ? durata(place.visitMinutes) : 'es. 1 h 30'} />
        </div>
        {editing && time && schema.timeLock ? (
          <Interruttore
            label="Orario vincolato"
            hint={vincolata ? 'Riordino e «Ottimizza percorso» non spostano questa tappa.' : 'Flessibile: può essere spostata dall’ottimizzazione.'}
            isSelected={vincolata}
            onChange={async (v) => {
              if (!v && fisse.length) {
                const ok = await ask({ title: 'Sbloccare l’orario?', message: `«${fisse[0].title}» è a ora fissa: sbloccando la tappa può andare in conflitto. La prenotazione non cambia.`, confirm: 'Sblocca', cancel: 'Lascia vincolato', destructive: false })
                if (!ok) return
              }
              setVincolata(v)
            }}
          />
        ) : null}
        {diversi.map((d) => (
          <Banner key={d.booking.id} tone="ac" icon="warn" title="Orari diversi" action={<Pulsante size="sm" color="secondary" onPress={() => setTime(d.oraPrenotazione)}>Verifica</Pulsante>}>
            Tappa {d.oraTappa}, prenotazione «{d.booking.title}» {d.oraPrenotazione}. «Verifica» porta qui l’ora della prenotazione: l’orario cambia solo se salvi.
          </Banner>
        ))}
        {cats.length > 0 ? (
          <div className="fa-fld" role="group" aria-label="Categoria">
            Categoria
            <div className="fa-chips scroll" style={{ overflowX: 'auto' }}>
              {cats.map((c) => (
                <Chip key={c.id} on={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)}>
                  {c.label}
                </Chip>
              ))}
              <Chip on={!categoryId} onPress={() => setCategoryId('')}>
                Altro
              </Chip>
            </div>
          </div>
        ) : null}
        {editing ? (
          <>
            <div className="fa-2c">
              <Campo
                label="Costo"
                icon="bag"
                inputMode="decimal"
                value={cost}
                onChange={setCost}
                placeholder="0,00"
                trailing={
                  <select aria-label="Valuta" value={currency} onChange={(e) => setCurrency(e.currentTarget.value)} style={{ flex: 'none', width: 'auto', fontWeight: 600 }}>
                    {tripCurrencies(trip, currency).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                }
              />
              <div className="fa-fld">
                <label htmlFor="pagato-da">Pagato da</label>
                <span className="fa-in">
                  <Sv name="user" size={20} />
                  <select id="pagato-da" value={paidBy} onChange={(e) => setPaidBy(e.currentTarget.value)}>
                    {trip.travelers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
            </div>
            {trip.travelers.length > 1 ? (
              <div className="fa-fld" role="group" aria-label="Per chi">
                Per chi
                <div className="fa-chips wrap">
                  <Chip on={who.length === 0} onPress={() => setWho([])}>
                    Tutti
                  </Chip>
                  {trip.travelers.map((p) => (
                    <Chip key={p.id} on={who.includes(p.id)} onPress={() => toggleWho(p.id)}>
                      {p.name}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
            {each !== null && amount ? (
              <span className="fa-m" style={{ color: 'var(--ink-muted)' }}>
                {people > 1 ? `Diviso ${inQuanti(people)}: ${formatMoney(each, currency)} a testa. ` : ''}La spesa si aggiorna anche in Spese.
              </span>
            ) : null}
          </>
        ) : null}
        <Campo label="Note" value={notes} onChange={setNotes} placeholder="Scarpe comode, ingresso dal lato nord…" />
        {item ? <UltimaModifica trip={trip} table="day_items" rowId={item.id} /> : null}
        {error ? (
          <span className="fa-help bad" role="alert">
            <Sv name="err" size={16} />
            {error}
          </span>
        ) : null}
      </form>
      {confirmNode}
    {nodoConflitto}
    </Foglio>
  )
}
