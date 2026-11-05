// Foglio «Nuova voce» / «Modifica voce» (#41, Fa-51 adattato): testo, descrizione, quantità e unità, categoria a pillole
// (+ «Nuova categoria»), «Dove» (due riquadri come «Per chi» del design system: Tutti = lista comune · Solo io = lista privata), link e scadenza.
import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { categoriesFor, categoryOf, kindOfCategory, parseQuantity } from '../../lib/checklist'
import { cleanUrl, type ChecklistInput } from '../../lib/planningData'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { ChecklistItem, Trip } from '../../types'
import { Campo, Chip, Pulsante } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { discOf, initials } from '../../state/me'

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'

interface Props {
  trip: Trip
  item?: ChecklistItem
  /** Lista preselezionata per una voce nuova. */
  where?: 'all' | 'mine'
  open: boolean
  onClose: () => void
}

export function VoceSheet({ trip, item, where = 'all', open, onClose }: Props) {
  const tr = useTrips()
  const auth = useAuth()
  const userId = auth.session?.user.id
  const v2 = !!trip.checklistV2
  // «Dove» serve solo in gruppo; «Scegli» da tre persone in su
  const canPrivate = v2 && !!userId && trip.travelers.length > 1
  const canPick = trip.travelers.length >= 3
  const [text, setText] = useState(item?.text ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [quantity, setQuantity] = useState(item?.quantity ? String(item.quantity) : '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [category, setCategory] = useState(item ? categoryOf(item) : 'Valigia')
  const [creating, setCreating] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [dove, setDove] = useState<'all' | 'mine' | 'pick'>(item ? (item.private ? 'mine' : item.forTravelers?.length && canPick ? 'pick' : 'all') : canPrivate ? where : 'all')
  // «Scegli»: chi deve spuntare la voce comune (all'inizio io, o le persone già scelte)
  const [scelti, setScelti] = useState<Set<string>>(() => new Set(item?.forTravelers ?? (trip.myTravelerId ? [trip.myTravelerId] : [])))
  const [url, setUrl] = useState(item?.url ?? '')
  const [due, setDue] = useState(item?.dueDate ?? '')
  const [errors, setErrors] = useState<{ text?: string; url?: string; cat?: string; form?: string; chi?: string }>({})
  const [busy, setBusy] = useState(false)
  const cats = categoriesFor([...trip.checklist, ...(item ? [item] : [])])

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!text.trim()) err.text = 'Scrivi cosa serve, per esempio «Adattatore per le prese».'
    if (url.trim() && !cleanUrl(url)) err.url = 'Il link non è valido: scrivi un indirizzo che inizia con https://'
    const cat = creating ? newCat.trim() : category
    if (creating && !cat) err.cat = 'Scrivi il nome della categoria.'
    if (dove === 'pick' && scelti.size === 0) err.chi = 'Scegli almeno una persona.'
    setErrors(err)
    if (Object.keys(err).length > 0) return
    const q = quantity.trim() ? parseQuantity(quantity) : 1
    const input: ChecklistInput = {
      text, kind: kindOfCategory(cat), travelerId: null, dueDate: due, quantity: q, url,
      v2, description, unit: q > 1 ? unit : '', category: cat, ownerId: dove === 'mine' && userId ? userId : undefined,
      // tutti scelti = per tutti; si scrive solo se si usa «Scegli» o se prima c'era una scelta
      ...(dove === 'pick' && scelti.size < trip.travelers.length
        ? { forTravelers: trip.travelers.map((p) => p.id).filter((id) => scelti.has(id)) }
        : item?.forTravelers?.length ? { forTravelers: [] } : {}),
    }
    setBusy(true)
    const message = item ? await tr.updateChecklistItem(item.id, input) : await tr.createChecklistItem(trip.id, input)
    setBusy(false)
    if (message) return setErrors({ form: /for_travelers/.test(message) ? 'Per scegliere le persone serve la migrazione 0044 del database.' : message })
    showToast(item ? 'Voce aggiornata' : 'Voce aggiunta')
    onClose()
  }

  return (
    <Foglio
      open={open}
      full
      title={item ? 'Modifica voce' : 'Nuova voce'}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="voce-form" isLoading={busy}>
          {item ? 'Salva le modifiche' : 'Aggiungi alla checklist'}
        </Pulsante>
      }
    >
      <form id="voce-form" className="frm" onSubmit={submit} noValidate>
        <Campo label="Cosa serve" value={text} onChange={setText} placeholder="es. Adattatore per le prese" error={errors.text} autoFocus={!item} />
        <Campo label="Descrizione (facoltativa)" textarea value={description} onChange={setDescription} />
        <div className="fa-2c">
          <Campo label="Quantità" inputMode="numeric" value={quantity} onChange={setQuantity} placeholder="1" maxLength={3} />
          <Campo label="Unità" value={unit} onChange={setUnit} placeholder="es. magliette" maxLength={20} />
        </div>
        <div className="fa-fld" role="group" aria-label="Categoria">
          Categoria
          <div className="fa-chips wrap">
            {cats.map((c) => (
              <Chip key={c} on={!creating && category.toLowerCase() === c.toLowerCase()} onPress={() => (setCreating(false), setCategory(c))}>
                {c}
              </Chip>
            ))}
            <Chip on={creating} onPress={() => setCreating(true)} icon={<Sv name="plus" size={16} />}>
              Nuova categoria
            </Chip>
          </div>
          {creating ? <Campo label="Nome della categoria" value={newCat} onChange={setNewCat} maxLength={30} error={errors.cat} autoFocus /> : null}
        </div>
        {canPrivate ? (
          <div className="fa-fld k-ChecklistNuova" role="group" aria-label="Dove">
            Dove
            <div className="sg" style={{ gridTemplateColumns: `repeat(${canPick ? 3 : 2},minmax(0,1fr))` }}>
              {(
                [
                  { value: 'all', label: 'Tutti', icon: 'users' },
                  { value: 'mine', label: 'Solo io', icon: 'user' },
                  { value: 'pick', label: 'Scegli', icon: 'users' },
                ] as const
              ).filter((o) => canPick || o.value !== 'pick').map((o) => (
                <button key={o.value} type="button" className={cx('seg', dove === o.value && 'on')} aria-pressed={dove === o.value} onClick={() => setDove(o.value)}>
                  <Sv name={o.icon} size={20} className="ic" />
                  {o.label}
                </button>
              ))}
            </div>
            {dove === 'pick' ? (
              <div className="pk" role="group" aria-label="Persone">
                {trip.travelers.map((p) => {
                  const on = scelti.has(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="pr"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setScelti((s) => { const n = new Set(s); if (on) n.delete(p.id); else n.add(p.id); return n })}
                      style={{ all: 'unset', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, cursor: 'pointer' }}
                    >
                      <span className="av" aria-hidden="true" style={{ ['--c' as string]: `var(--disco-${COL[(discOf(trip, p.id) - 1) % 5]})` }}>{initials(p.name)}</span>
                      <b>{p.name}{p.id === trip.myTravelerId ? ' (io)' : ''}</b>
                      <span className={cx('cb', on && 'on')} aria-hidden="true">
                        <Sv name="check" size={14} className="ic" />
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}
            {errors.chi ? (
              <span className="fa-help bad" role="alert">
                <Sv name="err" size={16} />
                {errors.chi}
              </span>
            ) : null}
            <span className="fa-m">{dove === 'all' ? 'Lista comune: ognuno spunta la sua.' : dove === 'mine' ? 'Lista privata: la vedi solo tu.' : 'Lista comune: la spuntano solo le persone scelte.'}</span>
          </div>
        ) : null}
        <Campo label="Link (facoltativo)" type="url" value={url} onChange={setUrl} placeholder="https://…" error={errors.url} />
        <Campo label="Entro il (facoltativo)" type="date" icon="cal" value={due} onChange={setDue} />
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
