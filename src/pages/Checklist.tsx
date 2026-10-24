import { useEffect, useRef, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { doneCount, parseQuantity, progress, visibleItems } from '../lib/checklist'
import { formatShort } from '../lib/dates'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { ChecklistItem, ChecklistKind } from '../types'
import { ChecklistItemForm } from '../ui/ChecklistItemForm'
import { MinusIcon, PlusIcon, TickIcon, TrashIcon } from '../ui/Icons'
import { EmptyState } from '../ui/PageHeader'
import { QuantityStepper } from '../ui/QuantityStepper'
import { Avatar, Fab, TINT_SCOPE } from '../ui/Ticket'
import { Sheet } from '../ui/Sheet'
import { useDeleter } from '../ui/useDeleter'
import { useHideNav } from '../ui/useHideNav'

/** Anello di avanzamento: giro azzurro su fondo bianco, con «fatte/totali» al centro. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 40
  const c = 2 * Math.PI * r
  return (
    <div class="relative size-24 shrink-0" role="progressbar" aria-label={`${done} di ${total} fatte`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#ffffff" stroke-width="10" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#0b79cc" stroke-width="10" stroke-linecap="round" stroke-dasharray={`${(done / total) * c} ${c}`} transform="rotate(-90 48 48)" />
      </svg>
      <span class="font-display absolute inset-0 grid place-items-center text-2xl leading-none tabular-nums">
        {done}/{total}
      </span>
    </div>
  )
}

/** Ordine delle sezioni nella pagina: «Da fare» sta sotto «Valigia». */
const SECTION_ORDER: ChecklistKind[] = ['docs', 'packing', 'todo']
const SECTION_TITLE: Record<ChecklistKind, string> = { docs: 'Documenti', packing: 'Valigia', todo: 'Da fare' }

export function Checklist() {
  const trip = useTrip()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
  // sezione in cui finisce la prossima voce aggiunta
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
  useHideNav(selecting)

  const many = trip.travelers.length > 1
  // le tre liste (documenti, valigia, da fare) stanno una sotto l'altra: «Da fare» è una sezione, non un filtro
  const sections = SECTION_ORDER.map((k) => ({ k, list: visibleItems(trip.checklist, k, who) }))
  const items = sections.flatMap((s) => s.list)
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

  async function deleteChosen() {
    const list = chosen
    if (list.length === 0) return
    const ok = await del({
      title: list.length === 1 ? `Eliminare «${list[0].text}»?` : `Eliminare ${list.length} voci?`,
      done: list.length === 1 ? 'Voce eliminata' : `${list.length} voci eliminate`,
      confirmLabel: list.length === 1 ? 'Elimina' : `Elimina ${list.length} voci`,
      run: () => t.setChecklistManyDeleted(list.map((i) => i.id), true), // una sola richiesta per tutte
      undo: () => t.setChecklistManyDeleted(list.map((i) => i.id), false),
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
    `inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold ${on ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink'}`

  function renderItem(i: ChecklistItem) {
    const owner = i.travelerId ? person.get(i.travelerId) : undefined
    const late = !i.done && !!i.dueDate && i.dueDate < today
    const multi = count(i)
    const have = doneCount(i)
    const partial = multi && have > 0 && !i.done
    const picked = selecting && sel.has(i.id)
    const box = selecting ? picked : i.done
    return (
      <li key={i.id} class={`flex min-h-16 items-center gap-1 pl-1 pr-3 ${picked ? 'bg-accent-soft' : ''}`}>
        <button
          type="button"
          role="checkbox"
          aria-checked={selecting ? picked : partial ? 'mixed' : i.done}
          aria-label={selecting ? `Seleziona: ${i.text}` : `${i.done ? 'Da rifare' : multi ? 'Tutti a posto' : 'Fatto'}: ${i.text}`}
          disabled={!selecting && pending.has(i.id)}
          onClick={() => (selecting ? toggleSel(i.id) : void toggle(i))}
          class="grid size-11 shrink-0 touch-manipulation place-items-center"
        >
          <span class={`grid size-6 place-items-center rounded-lg border-2 text-accent-ink ${box ? 'border-accent bg-accent' : partial ? 'border-accent text-pale' : 'border-line'}`}>
            {box ? <TickIcon size={14} stroke-width={3.4} /> : partial ? <MinusIcon size={14} /> : null}
          </span>
        </button>
        <button type="button" onClick={() => (selecting ? toggleSel(i.id) : setEdit(i))} class="min-h-14 min-w-0 flex-1 touch-manipulation py-2 pl-1 text-left">
          <span class={`block text-base font-semibold leading-snug ${i.done ? 'text-muted line-through' : ''}`}>
            {multi && selecting && (
              <span class={`mr-1.5 inline-block rounded-xl px-2 align-middle text-sm font-bold tabular-nums no-underline ${i.done ? 'bg-surface-high text-muted' : 'bg-accent-soft text-pale'}`}>
                {have}/{i.quantity}
              </span>
            )}
            {i.text}
          </span>
          {i.dueDate && <span class={`block text-xs ${late ? 'text-danger' : 'text-muted'}`}>entro {formatShort(i.dueDate)}</span>}
        </button>
        {multi && !selecting && <QuantityStepper label={i.text} have={have} total={i.quantity as number} disabled={pending.has(i.id)} onChange={(n) => void setCount(i, n)} />}
        {!multi || selecting ? (
          owner ? (
            <Avatar name={owner.name} color={owner.color} size={28} />
          ) : (
            trip.travelers.length > 1 && <span class="shrink-0 text-xs font-semibold text-muted">Tutti</span>
          )
        ) : null}
      </li>
    )
  }

  return (
    <>
      <header class="px-5 pb-1" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        {selecting ? (
          <>
            {/* «Annulla» sta a destra, dove prima c'era «Seleziona»: a sinistra sembrava un comando per tornare indietro di pagina */}
            <div class="min-h-11" aria-hidden="true" />
            <div class="flex items-center justify-between gap-3">
              <h1 class="font-display text-[32px] leading-[38px]" aria-live="polite">
                {chosen.length === 0 ? 'Tocca le voci' : chosen.length === 1 ? '1 selezionata' : `${chosen.length} selezionate`}
              </h1>
              <button type="button" onClick={stopSelecting} class="min-h-11 text-sm font-extrabold text-pale">
                Annulla
              </button>
            </div>
            <p class="mt-0.5 text-sm text-muted">tocca le voci per sceglierle</p>
          </>
        ) : (
          <>
            <Link href="/altro" class="-ml-2 inline-flex min-h-11 items-center px-2 text-base font-semibold text-pale">
              ‹ Altro
            </Link>
            <div class="flex items-center justify-between gap-3">
              <h1 class="font-display text-[32px] leading-[38px]">Checklist</h1>
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

        {total.total > 0 && (
          <section
            class="mt-4 flex items-center gap-5 rounded-[28px] p-5 text-on-tinta"
            style={{ ...TINT_SCOPE, background: 'var(--tinta-lavanda)' }}
            aria-label="Avanzamento"
          >
            <ProgressRing done={total.done} total={total.total} />
            <div class="min-w-0">
              <h2 class="font-display text-2xl leading-[30px]">{total.done === total.total ? 'Tutto pronto' : total.done * 2 >= total.total ? 'Quasi pronti' : total.done === 0 ? 'Si comincia' : 'Si parte'}</h2>
              <p class="text-sm text-muted">
                {total.done} {total.done === 1 ? 'voce fatta' : 'voci fatte'} su {total.total}.
              </p>
            </div>
          </section>
        )}

        {items.length === 0 ? (
          <div class="mt-4">
            {trip.checklist.length === 0 ? (
              <EmptyState title="Checklist vuota" text="Scrivi la prima voce qui sotto, oppure parti da un modello con le cose che di solito servono." />
            ) : (
              <EmptyState title="Niente qui" text="Nessuna voce per la persona scelta." />
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
                class="mt-4 flex min-h-14 w-full items-center gap-3.5 rounded-[20px] bg-surface-2 px-4 text-left"
              >
                <span class={`grid size-6 shrink-0 place-items-center rounded-lg border-2 text-accent-ink ${chosen.length > 0 ? 'border-accent bg-accent' : 'border-line'}`}>
                  {allSelected ? <TickIcon size={14} /> : chosen.length > 0 ? <MinusIcon size={14} /> : null}
                </span>
                <span class="flex-1 text-base font-semibold">{allSelected ? 'Deseleziona tutte' : 'Seleziona tutte'}</span>
                <span class="text-sm font-semibold text-pale">
                  {chosen.length} su {items.length}
                </span>
              </button>
            )}
            {sections.map(({ k, list }) => (
              <section class="mt-6" aria-labelledby={`sez-${k}`}>
                <div class="mb-2 flex items-center justify-between gap-3">
                  <h2 id={`sez-${k}`} class="font-display text-xl">
                    {SECTION_TITLE[k]}
                  </h2>
                  {!selecting && (
                    <button
                      type="button"
                      class="inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-pale"
                      aria-label={`Aggiungi una voce in «${SECTION_TITLE[k]}»`}
                      onClick={() => {
                        setKind(k)
                        setAddOpen(true)
                      }}
                    >
                      <PlusIcon size={14} /> Aggiungi
                    </button>
                  )}
                </div>
                {list.length === 0 ? (
                  <p class="rounded-[20px] border-2 border-dashed border-line px-4 py-4 text-center text-sm text-muted">Nessuna voce.</p>
                ) : (
                  <ul class="divide-y divide-hairline overflow-hidden rounded-[20px] border border-hairline bg-surface">
                    {list.map((i) => renderItem(i))}
                  </ul>
                )}
              </section>
            ))}
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
            class="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full border-2 border-transparent bg-danger text-base font-extrabold text-white shadow-[0_8px_20px_rgb(20_25_48/0.3)] disabled:cursor-not-allowed disabled:border-danger disabled:bg-surface-high disabled:text-muted disabled:shadow-none"
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
          class="fixed inset-x-5 z-10 flex h-14 items-center gap-2.5 rounded-full border-2 border-line bg-surface pl-5 pr-1.5 shadow-[0_6px_16px_rgb(20_25_48/0.2)] focus-within:border-accent"
          style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom))' }}
        >
          <input
            ref={textRef}
            autoFocus
            type="text"
            value={text}
            maxLength={200}
            placeholder="Aggiungi una voce"
            aria-label={`Nuova voce in «${SECTION_TITLE[kind]}»${who !== 'all' ? ` per ${person.get(who)?.name}` : ''}`}
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
            class="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-50"
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
