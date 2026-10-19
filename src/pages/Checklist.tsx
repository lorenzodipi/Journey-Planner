import { useEffect, useRef, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { doneCount, KIND_LABEL, KINDS, parseQuantity, progress, visibleItems } from '../lib/checklist'
import { formatShort } from '../lib/dates'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { ChecklistItem, ChecklistKind } from '../types'
import { ChecklistItemForm } from '../ui/ChecklistItemForm'
import { TrashButton } from '../ui/ConfirmDialog'
import { MinusIcon, PlusIcon, TickIcon, TrashIcon } from '../ui/Icons'
import { EmptyState } from '../ui/PageHeader'
import { Avatar, Fab, Ticket } from '../ui/Ticket'
import { Sheet } from '../ui/Sheet'
import { useDeleter } from '../ui/useDeleter'

export function Checklist() {
  const trip = useTrip()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
  const [kind, setKind] = useState<ChecklistKind>('todo')
  const [who, setWho] = useState<'all' | string>('all')
  const [text, setText] = useState('')
  const [qty, setQty] = useState('1')
  const [adding, setAdding] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const textRef = useRef<HTMLInputElement>(null)
  const addRef = useRef<HTMLFormElement>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [edit, setEdit] = useState<ChecklistItem | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())

  const many = trip.travelers.length > 1
  const items = visibleItems(trip.checklist, kind, who)
  const total = progress(items)
  const person = new Map(trip.travelers.map((p) => [p.id, p]))
  const today = new Date().toISOString().slice(0, 10)
  // si agisce solo sulle voci che si vedono nell'elenco corrente
  const chosen = items.filter((i) => sel.has(i.id))

  // la barra «aggiungi una voce» si richiude toccando qualsiasi altro punto dello schermo; il testo e la quantità
  // già scritti restano in memoria (sono stati del componente) e ricompaiono riaprendola con il +
  useEffect(() => {
    if (!addOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [addOpen])

  function stopSelecting() {
    setSelecting(false)
    setSel(new Set())
  }

  function toggleSel(id: string) {
    setSel((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function setAllDeleted(list: ChecklistItem[], deleted: boolean): Promise<string | null> {
    let failure: string | null = null
    for (const i of list) {
      const message = await t.setChecklistDeleted(i.id, deleted)
      if (message) failure = message
    }
    return failure
  }

  async function deleteChosen() {
    const list = chosen
    if (list.length === 0) return
    const ok = await del({
      title: list.length === 1 ? `Eliminare «${list[0].text}»?` : `Eliminare ${list.length} voci?`,
      done: list.length === 1 ? 'Voce eliminata' : `${list.length} voci eliminate`,
      confirmLabel: list.length === 1 ? 'Elimina' : `Elimina ${list.length} voci`,
      run: () => setAllDeleted(list, true),
      undo: () => setAllDeleted(list, false),
    })
    if (ok) stopSelecting()
  }

  async function toggle(i: ChecklistItem) {
    setPending((p) => new Set(p).add(i.id))
    // con una quantità, il segno di spunta mette tutti i pezzi a posto (o li azzera se erano già tutti)
    const message =
      (i.quantity ?? 1) > 1
        ? await t.setChecklistCount(i.id, i.done ? 0 : (i.quantity as number))
        : await t.setChecklistDone(i.id, !i.done)
    setPending((p) => {
      const n = new Set(p)
      n.delete(i.id)
      return n
    })
    if (message) showToast(message)
  }

  async function add(e: Event) {
    e.preventDefault()
    if (!text.trim() || adding) return
    setAdding(true)
    const message = await t.createChecklistItem(trip.id, { text, kind, travelerId: who === 'all' ? null : who, dueDate: '', quantity: parseQuantity(qty) })
    setAdding(false)
    if (message) showToast(message)
    else {
      setText('')
      setQty('1')
      textRef.current?.focus()
    }
  }

  async function setCount(i: ChecklistItem, count: number) {
    setPending((p) => new Set(p).add(i.id))
    const message = await t.setChecklistCount(i.id, count)
    setPending((p) => {
      const n = new Set(p)
      n.delete(i.id)
      return n
    })
    if (message) showToast(message)
  }

  async function addTemplate() {
    const message = await t.addChecklistTemplate(trip.id)
    showToast(message ?? 'Modello aggiunto: modifica o elimina le voci che non ti servono.')
  }

  const count = (i: ChecklistItem) => (i.quantity ?? 1) > 1
  const allSelected = items.length > 0 && chosen.length === items.length
  const chip = (on: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3.5 text-sm font-extrabold ${on ? 'border-accent bg-accent text-white' : 'border-line text-ink'}`

  return (
    <>
      <header class="px-5 pb-1" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        {selecting ? (
          <>
            <div class="flex min-h-11 items-center justify-between">
              <button type="button" onClick={stopSelecting} class="inline-flex min-h-11 items-center gap-2 text-[15px] font-extrabold text-pale">
                <span aria-hidden="true">‹</span>
                Annulla
              </button>
            </div>
            <h1 class="font-display text-[28px] font-extrabold leading-tight" aria-live="polite">
              {chosen.length === 0 ? 'Tocca le voci' : chosen.length === 1 ? '1 selezionata' : `${chosen.length} selezionate`}
            </h1>
            <p class="mt-0.5 text-sm text-muted">in {KIND_LABEL[kind]} · tocca le voci per sceglierle</p>
          </>
        ) : (
          <>
            <Link href="/altro" class="-ml-0.5 inline-flex min-h-11 items-center text-[15px] font-extrabold text-pale">
              ‹ Altro
            </Link>
            <div class="flex items-center justify-between gap-3">
              <h1 class="font-display text-[28px] font-extrabold leading-tight">Checklist</h1>
              {items.length > 0 && (
                <button type="button" onClick={() => setSelecting(true)} class="min-h-11 text-sm font-extrabold text-pale">
                  Seleziona
                </button>
              )}
            </div>
            <p class="mt-0.5 text-sm text-muted">{trip.checklist.length === 0 ? 'Cose da fare e da portare' : `${progress(trip.checklist).done} di ${trip.checklist.length} fatte`}</p>
          </>
        )}
      </header>

      <div class="px-5" style={{ paddingBottom: selecting ? '6rem' : '11rem' }}>
        {many && (
          <div class="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="group" aria-label="Per chi">
            <button type="button" aria-pressed={who === 'all'} onClick={() => setWho('all')} class={chip(who === 'all')}>
              Tutti
            </button>
            {trip.travelers.map((p) => (
              <button type="button" key={p.id} aria-pressed={who === p.id} onClick={() => setWho(p.id)} class={chip(who === p.id)}>
                <span aria-hidden="true" class="size-2.5 rounded-full" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div role="tablist" aria-label="Elenco" class="mt-3 flex gap-0.5 rounded-[14px] border-2 border-line bg-surface p-[3px]">
          {KINDS.map((k) => (
            <button
              type="button"
              role="tab"
              key={k}
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              class={`min-h-10 flex-1 rounded-[10px] text-sm font-extrabold ${kind === k ? 'bg-accent text-white' : 'text-muted'}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        {total.total > 0 && (
          <div
            role="progressbar"
            aria-label={`${total.done} di ${total.total} fatte`}
            aria-valuemin={0}
            aria-valuemax={total.total}
            aria-valuenow={total.done}
            class="mt-3.5 h-2.5 overflow-hidden rounded-[5px] border-2 border-line bg-surface"
          >
            <i class="block h-full bg-accent transition-all" style={{ width: `${(total.done / total.total) * 100}%` }} />
          </div>
        )}

        {items.length === 0 ? (
          <div class="mt-4">
            {trip.checklist.length === 0 ? (
              <EmptyState title="Checklist vuota" text="Scrivi la prima voce qui sotto, oppure parti da un modello con le cose che di solito servono." />
            ) : (
              <EmptyState title="Niente qui" text="Nessuna voce in questo elenco per la persona scelta." />
            )}
          </div>
        ) : (
          <>
          {selecting && (
            <button
              type="button"
              role="checkbox"
              aria-checked={allSelected ? true : chosen.length > 0 ? 'mixed' : false}
              aria-label={allSelected ? `Deseleziona tutte le ${items.length} voci` : `Seleziona tutte le ${items.length} voci`}
              onClick={() => setSel(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
              class="mt-4 flex min-h-14 w-full items-center gap-3.5 rounded-[14px] border-2 border-line bg-surface-2 px-4 text-left"
            >
              <span class={`grid size-7 shrink-0 place-items-center rounded-lg border-2 text-white ${chosen.length > 0 ? 'border-accent bg-accent' : 'border-line'}`}>
                {allSelected ? <TickIcon size={16} /> : chosen.length > 0 ? <MinusIcon size={16} /> : null}
              </span>
              <span class="flex-1 text-base font-extrabold">{allSelected ? 'Deseleziona tutte' : 'Seleziona tutte'}</span>
              <span class="text-sm font-extrabold text-pale">
                {chosen.length} su {items.length}
              </span>
            </button>
          )}
          <ul class="mt-4 space-y-3.5">
            {items.map((i) => {
              const owner = i.travelerId ? person.get(i.travelerId) : undefined
              const late = !i.done && !!i.dueDate && i.dueDate < today
              const multi = count(i)
              const have = doneCount(i)
              const partial = multi && have > 0 && !i.done
              const picked = selecting && sel.has(i.id)
              return (
                <li key={i.id}>
                  <Ticket
                    stubWidth={64}
                    tone={picked ? 'accent' : 'line'}
                    stub={
                      selecting ? (
                        <button type="button" role="checkbox" aria-checked={picked} aria-label={`Seleziona: ${i.text}`} onClick={() => toggleSel(i.id)} class="grid size-11 place-items-center">
                          <span class={`grid size-7 place-items-center rounded-lg border-2 text-white ${picked ? 'border-accent bg-accent' : 'border-line'}`}>{picked && <TickIcon size={16} />}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={partial ? 'mixed' : i.done}
                          aria-label={`${i.done ? 'Da rifare' : multi ? 'Tutti a posto' : 'Fatto'}: ${i.text}`}
                          disabled={pending.has(i.id)}
                          onClick={() => void toggle(i)}
                          class="grid size-11 place-items-center"
                        >
                          <span
                            class={`grid size-7 place-items-center rounded-full border-2 ${i.done ? 'border-ok bg-ok text-bg' : partial ? 'border-accent text-pale' : 'border-line'}`}
                          >
                            {i.done ? <TickIcon size={16} /> : partial ? <MinusIcon size={16} /> : null}
                          </span>
                        </button>
                      )
                    }
                  >
                    <div class="min-w-0 flex-1">
                      <button type="button" onClick={() => (selecting ? toggleSel(i.id) : setEdit(i))} class="block w-full text-left">
                        <span class={`block text-base leading-tight font-extrabold ${i.done ? 'text-muted line-through' : ''}`}>
                          {multi && (
                            <span class={`mr-1.5 inline-block rounded-xl px-2 align-middle text-sm font-extrabold tabular-nums no-underline ${i.done ? 'bg-line text-muted' : 'bg-accent-soft text-pale'}`}>
                              {have}/{i.quantity}
                            </span>
                          )}
                          {i.text}
                        </span>
                        {i.dueDate && <span class={`mt-0.5 block text-xs ${late ? 'text-danger' : 'text-muted'}`}>entro {formatShort(i.dueDate)}</span>}
                      </button>
                      <div class="mt-1 flex items-center">
                        <span class="inline-flex items-center gap-1.5">
                          {owner ? (
                            <Avatar name={owner.name} color={owner.color} size={20} />
                          ) : (
                            trip.travelers.length > 1 && (
                              <span class="inline-flex">
                                {trip.travelers.slice(0, 2).map((p, n) => (
                                  <span class={n ? '-ml-1.5' : ''}>
                                    <Avatar name={p.name} color={p.color} size={20} />
                                  </span>
                                ))}
                              </span>
                            )
                          )}
                          {(owner || trip.travelers.length > 1) && <span class="text-xs text-muted">{owner ? owner.name : 'Tutti'}</span>}
                        </span>
                        {multi && !selecting && (
                          <div class="ml-auto flex gap-1.5" role="group" aria-label={`Pezzi a posto: ${i.text}`}>
                            <button
                              type="button"
                              aria-label="Un pezzo in meno"
                              disabled={pending.has(i.id) || have <= 0}
                              onClick={() => void setCount(i, have - 1)}
                              class="grid size-[34px] place-items-center rounded-full border-2 border-line text-muted disabled:text-line"
                            >
                              <MinusIcon size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label="Un pezzo in più"
                              disabled={pending.has(i.id) || have >= (i.quantity as number)}
                              onClick={() => void setCount(i, have + 1)}
                              class="grid size-[34px] place-items-center rounded-full bg-accent-soft text-pale disabled:text-line"
                            >
                              <PlusIcon size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {!selecting && (
                      <TrashButton
                        label={`Elimina ${i.text}`}
                        onClick={() =>
                          void del({
                            title: `Eliminare «${i.text}»?`,
                            done: 'Voce eliminata',
                            run: () => t.setChecklistDeleted(i.id, true),
                            undo: () => t.setChecklistDeleted(i.id, false),
                          })
                        }
                      />
                    )}
                  </Ticket>
                </li>
              )
            })}
          </ul>
          </>
        )}

        <button type="button" onClick={() => void addTemplate()} class="mx-auto mt-4 block min-h-11 px-3 text-sm font-extrabold text-muted">
          {trip.checklist.length === 0 ? 'Parti da un modello' : 'Aggiungi le voci del modello mancanti'}
        </button>
      </div>

      {/* barra per aggiungere una voce (nome, quantità, +) o, in selezione, il pulsante per eliminare */}
      {selecting ? (
        <div class="fixed inset-x-5 z-30" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            disabled={chosen.length === 0}
            onClick={() => void deleteChosen()}
            class="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-danger text-base font-extrabold text-bg shadow-[0_8px_20px_rgb(0_0_0/0.45)] disabled:opacity-40"
          >
            <TrashIcon size={22} />
            {chosen.length === 0 ? 'Elimina' : chosen.length === 1 ? 'Elimina 1 voce' : `Elimina ${chosen.length} voci`}
          </button>
        </div>
      ) : (
        !addOpen ? (
          <Fab label="Voce" onClick={() => setAddOpen(true)} />
        ) : (
        <form
          ref={addRef}
          onSubmit={add}
          onKeyDown={(e) => e.key === 'Escape' && setAddOpen(false)}
          class="fixed inset-x-5 z-10 flex h-14 items-center gap-2.5 rounded-full border-2 border-line bg-surface pl-5 pr-1.5 focus-within:border-accent"
          style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
        >
          <input
            ref={textRef}
            autoFocus
            type="text"
            value={text}
            maxLength={200}
            placeholder="Aggiungi una voce"
            aria-label={`Nuova voce in «${KIND_LABEL[kind]}»${who !== 'all' ? ` per ${person.get(who)?.name}` : ''}`}
            onInput={(e) => setText(e.currentTarget.value)}
            style={{ outline: 'none' }}
            class="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted"
          />
          <input
            type="text"
            inputMode="numeric"
            value={qty}
            maxLength={3}
            aria-label="Quantità"
            title="Quantità"
            onInput={(e) => setQty(e.currentTarget.value.replace(/\D/g, ''))}
            onBlur={() => setQty(String(parseQuantity(qty)))}
            onFocus={(e) => e.currentTarget.select()}
            class="h-9 w-11 rounded-xl border-2 border-line bg-bg text-center text-[15px] font-extrabold tabular-nums"
          />
          <button
            type="submit"
            disabled={adding || !text.trim()}
            aria-label="Aggiungi la voce"
            class="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white disabled:opacity-50"
          >
            <PlusIcon size={22} />
          </button>
        </form>
        )
      )}

      {delDialog}
      <Sheet open={edit !== null} title="Modifica voce" onClose={() => setEdit(null)}>
        {edit && (
          <ChecklistItemForm
            key={edit.id}
            trip={trip}
            initial={edit}
            onSubmit={(input) => t.updateChecklistItem(edit.id, input)}
            onDelete={async () => {
              const id = edit.id
              const message = await t.setChecklistDeleted(id, true)
              if (!message) showToast('Voce eliminata', { label: 'Annulla', run: () => void t.setChecklistDeleted(id, false) })
              return message
            }}
            onDone={() => setEdit(null)}
          />
        )}
      </Sheet>
    </>
  )
}
