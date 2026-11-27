// Fogli «Aggiungi tappa» e «Modifica tappa» (mock Fa-14, issue #32): luogo o attività (luoghi salvati o
// testo libero), ora, durata, categoria a pillole, note; in modifica anche costo, «Pagato da» e per chi:
// il costo diventa la spesa collegata in Spese.
import { cercaPerRilevanza, normalizza } from '../../lib/cerca'
import { useConflitto } from '../../faraway/useConflitto'
import { useMemo, useState } from 'react'
import { Autocomplete, Input as AriaInput, Label as AriaLabel, ListBox, ListBoxItem, Text, TextField as AriaTextField } from 'react-aria-components'
import { formatDuration, parseDuration } from '../../lib/duration'
import { formatMoney, parseAmount, round2, tripCurrencies } from '../../lib/money'
import type { ItemInput } from '../../lib/tripApi'
import { categoriaDaTappa } from '../../lib/ricevuta'
import { checkSplit } from '../../lib/ripartizione'
import { DivisioneEditor, sharesFrom } from '../spese/SpesaAvanzata'
import { durata } from '../../lib/tappa'
import { useTrips } from '../../state/trip'
import { useMe } from '../../state/me'
import type { Day, DayItem, ItemKind, SplitMode, Trip } from '../../types'
import { schema } from '../../lib/schema'
import { disallineamenti, prenotazioniFisse } from '../../lib/vincoli'
import { Banner, Campo, Chip, Interruttore, Pulsante } from '../../faraway/base'
import { CampoDurata } from '../../faraway/CampoDurata'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { UltimaModifica } from '../../faraway/UltimaModifica'
import { nomeCategoria, t as tt } from '../../i18n'

const PARTS = ['', tt('da solo'), tt('in due'), tt('in tre'), tt('in quattro'), tt('in cinque'), tt('in sei'), tt('in sette'), tt('in otto')]
export const inQuanti = (n: number) => PARTS[n] ?? tt('in {n}', { n })

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
  // la tappa nuova ha già il suo id: vincolo dell'orario e costo si salvano subito dopo, come in modifica
  const [nuovoId] = useState(() => crypto.randomUUID())
  const id = item?.id ?? nuovoId
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
  // per chi e come si divide il costo, come in Spese (uguali, in %, a importi): `who` è l'elenco esplicito, tutti = nessuna scelta
  const tutti = trip.travelers.map((p) => p.id)
  const [who, setWho] = useState<string[]>(item?.participants?.length ? item.participants : tutti)
  const [mode, setMode] = useState<SplitMode>(linked?.splitMode ?? 'equal')
  const [vals, setVals] = useState<Record<string, string>>(() =>
    linked?.splitMode && linked.splitMode !== 'equal' ? Object.fromEntries(linked.shares.map((x) => [x.travelerId, String(linked.splitMode === 'percent' ? (x.percent ?? 0) : (x.amount ?? 0)).replace('.', ',')])) : {},
  )
  const partecipanti = who.length >= tutti.length && tutti.every((id) => who.includes(id)) ? [] : who
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

  const q = title.trim()
  const place = placeId ? trip.places.find((p) => p.id === placeId) : undefined
  // ogni parola, in qualsiasi punto, anche nella città, categoria e note («head» trova «Godzilla Head»); si nasconde solo il
  // luogo già scelto finché il campo ha ancora il suo nome
  const scelto = place && normalizza(place.name) === normalizza(title) ? place.id : ''
  // prima chi ha il testo nel nome (all'inizio meglio), poi chi lo ha solo in città, categoria o note
  const suggestions = focusTitle && q.length >= 1 ? cercaPerRilevanza(trip.places.filter((p) => p.id !== scelto), q, (p) => p.name, (p) => [p.nameLocal, p.city, p.category, p.note]).slice(0, 5) : []

  const amount = cost.trim() ? parseAmount(cost) : null
  const people = who.length > 0 ? who.length : trip.travelers.length
  const divisa = mode !== 'equal' && who.length > 1
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
    if (!title.trim()) return setError(tt('Scrivi il luogo o cosa fate in questa tappa.'))
    const minutes = parseDuration(duration)
    if (Number.isNaN(minutes)) return setError(tt('La durata non è chiara: scrivi per esempio 45min o 1h 30min.'))
    if (cost.trim() && (amount === null || amount < 0)) return setError(tt('Il costo non è chiaro: scrivi un importo, per esempio 12,50.'))
    if (amount && !paidBy) return setError(tt('Manca chi ha pagato. Scegli una persona.'))
    if (trip.travelers.length > 1 && who.length === 0) return setError(tt('Scegli almeno una persona.'))
    if (amount && divisa) {
      // il motivo è già scritto (in rosso) sotto le quote: non lo ripeto in fondo
      if (!checkSplit(mode, amount, sharesFrom(mode, who, vals), currency).ok) return setError(null)
    }
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
      ...(editing || partecipanti.length > 0 ? { participants: partecipanti } : {}),
    }
    let message = item ? await t.updateItem(item.id, input) : await t.createItem(trip.id, day.id, input, id)
    const cambiaVincolo = item ? vincolata !== (item.timeLock === 'locked') : vincolata && !!time
    if (!message && schema.timeLock && cambiaVincolo) message = await t.setItemLock(id, vincolata && time ? 'locked' : 'flexible', 'manual')
    if (!message && (amount || linked)) {
      const catLabel = linked?.category || categoriaDaTappa(trip.categories.find((c) => c.id === categoryId)?.label ?? '')
      message = await t.saveItemCost(trip.id, id, amount ? { amount, currency, paidBy, travelerIds: partecipanti, category: catLabel, notes: linked?.notes, splitMode: divisa ? mode : 'equal', ...(divisa ? { shares: sharesFrom(mode, who, vals) } : {}) } : null)
    }
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  return (
    <Foglio
      open={open}
      title={editing ? tt('Modifica tappa') : tt('Aggiungi tappa')}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="tappa-form" isLoading={busy}>
          {editing ? tt('Salva modifiche') : tt('Aggiungi al Giorno {dayNumber}', { dayNumber })}
        </Pulsante>
      }
    >
      <form id="tappa-form" className="frm" onSubmit={submit} noValidate style={{ overflow: 'visible' }}>
        <div style={{ position: 'relative', display: 'grid', gap: 8 }}>
          {/* Autocomplete della libreria: testo libero, e con le frecce si scorrono i luoghi salvati senza lasciare il campo.
              L'elenco resta sotto il campo (un pannello sopra la pagina finirebbe dietro il foglio). */}
          <Autocomplete
            inputValue={title}
            onInputChange={(v) => {
              setTitle(v)
              setFocusTitle(true)
              // campo svuotato: il luogo scelto prima (senza salvare) non vale più, si può riscegliere
              if (!v.trim()) setPlaceId('')
            }}
            disableAutoFocusFirst
          >
            <AriaTextField className="fa-fld" maxLength={120}>
              <AriaLabel>{tt('Luogo o attività')}</AriaLabel>
              <span className="fa-in">
                <Sv name="pin" size={20} />
                <AriaInput className="" placeholder={tt('Cerca tra i luoghi o scrivi')} autoComplete="off" />
              </span>
            </AriaTextField>
            {suggestions.length > 0 ? (
              <ListBox className="fa-list fa-sugg" aria-label={tt('Luoghi salvati')} onAction={(k) => pickPlace(String(k))}>
                {suggestions.map((p) => (
                  <ListBoxItem key={p.id} id={p.id} textValue={p.name} className="fa-row" style={{ minHeight: 52, gridTemplateColumns: '20px minmax(0,1fr) auto' }}>
                    <Sv name="pin" size={20} />
                    <span style={{ minWidth: 0 }}>
                      <Text slot="label" className="t" style={{ display: 'block' }}>
                        {p.name}
                      </Text>
                      <Text slot="description" className="s" style={{ display: 'block' }}>
                        {[p.city, p.category ? nomeCategoria(p.category) : ''].filter(Boolean).join(' · ')}
                      </Text>
                    </span>
                    <span />
                  </ListBoxItem>
                ))}
              </ListBox>
            ) : null}
          </Autocomplete>
        </div>
        {kind === 'visit' || kind === 'meal' || kind === 'free' || kind === 'note' ? (
          <div className="fa-fld" role="group" aria-label={tt('Tipo di tappa')}>
            {tt('Tipo')}
            <div className="fa-chips wrap">
              {([['visit', tt('Luogo')], ['meal', tt('Pasto')], ['free', tt('Attività libera')], ['note', tt('Nota')]] as [ItemKind, string][]).map(([k, l]) => (
                <Chip key={k} on={kind === k} onPress={() => setKind(k)}>{l}</Chip>
              ))}
            </div>
            {kind === 'free' || kind === 'note' ? <span className="fa-help">{tt('Senza posizione: pause, pasti e note stanno nella lista ma non sulla mappa.')}</span> : null}
          </div>
        ) : null}
        <div className="fa-2c">
          <Campo da00 label={tt('Ora')} icon="clock" type="time" value={time} onChange={setTime} />
          <CampoDurata label={tt('Durata')} value={duration} onChange={setDuration} placeholder={place?.visitMinutes ? durata(place.visitMinutes) : '1h 30min'} />
        </div>
        {time && schema.timeLock ? (
          <Interruttore
            label={tt('Orario vincolato')}
            hint={vincolata ? tt('Riordino e «Ottimizza percorso» non spostano questa tappa.') : tt('Flessibile: può essere spostata dall’ottimizzazione.')}
            isSelected={vincolata}
            onChange={async (v) => {
              if (!v && fisse.length) {
                const ok = await ask({ title: tt('Sbloccare l’orario?'), message: tt('«{title}» è a ora fissa: sbloccando la tappa può andare in conflitto. La prenotazione non cambia.', { title: fisse[0].title }), confirm: tt('Sblocca'), cancel: tt('Lascia vincolato'), destructive: false })
                if (!ok) return
              }
              setVincolata(v)
            }}
          />
        ) : null}
        {diversi.map((d) => (
          <Banner key={d.booking.id} tone="ac" icon="warn" title={tt('Orari diversi')} action={<Pulsante size="sm" color="secondary" onPress={() => setTime(d.oraPrenotazione)}>{tt('Verifica')}</Pulsante>}>
            {tt('Tappa {oraTappa}, prenotazione «{title}» {oraPrenotazione}. «Verifica» porta qui l’ora della prenotazione: l’orario cambia solo se salvi.', { oraTappa: d.oraTappa, title: d.booking.title, oraPrenotazione: d.oraPrenotazione })}
          </Banner>
        ))}
        {cats.length > 0 ? (
          <div className="fa-fld" role="group" aria-label={tt('Categoria')}>
            {tt('Categoria')}
            <div className="fa-chips scroll" style={{ overflowX: 'auto' }}>
              {cats.map((c) => (
                <Chip key={c.id} on={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)}>
                  {nomeCategoria(c.label)}
                </Chip>
              ))}
              <Chip on={!categoryId} onPress={() => setCategoryId('')}>
                {tt('Altro')}
              </Chip>
            </div>
          </div>
        ) : null}
        {/* costo, chi ha pagato e come dividere: uguali in «Aggiungi tappa» e in «Modifica tappa» */}
        <>
          <div className="fa-2c">
            <Campo
              label={tt('Costo')}
              icon="bag"
              importo
              value={cost}
              onChange={setCost}
              placeholder="0,00"
              trailing={
                <select aria-label={tt('Valuta')} value={currency} onChange={(e) => setCurrency(e.currentTarget.value)} style={{ flex: 'none', width: 'auto', fontWeight: 600 }}>
                  {tripCurrencies(trip, currency).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              }
            />
            <div className="fa-fld">
              <label htmlFor="pagato-da">{tt('Pagato da')}</label>
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
            <DivisioneEditor trip={trip} meId={me?.id} mode={mode} onMode={setMode} who={who} onWho={setWho} vals={vals} onVals={setVals} total={amount} currency={currency} />
          ) : null}
          {each !== null && amount ? (
            <span className="fa-m" style={{ color: 'var(--ink-muted)' }}>
              {tt(editing ? '{v0}La spesa si aggiorna anche in Spese.' : '{v0}La spesa compare anche in Spese.', { v0: people > 1 && !divisa ? tt('Diviso {v0}: {v1} a testa. ', { v0: inQuanti(people), v1: formatMoney(each, currency) }) : '' })}
            </span>
          ) : null}
        </>
        <Campo label={tt('Note')} value={notes} onChange={setNotes} placeholder={tt('es. Scarpe comode')} />
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
