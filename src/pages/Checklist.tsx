import { useState } from 'preact/hooks'
import { KIND_LABEL, KINDS, parseQuantity, progress, visibleItems } from '../lib/checklist'
import { formatShort } from '../lib/dates'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { ChecklistItem, ChecklistKind } from '../types'
import { ChecklistItemForm } from '../ui/ChecklistItemForm'
import { Card, EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'

export function Checklist() {
  const trip = useTrip()
  const t = useTrips()
  const [kind, setKind] = useState<ChecklistKind>('todo')
  const [who, setWho] = useState<'all' | string>('all')
  const [text, setText] = useState('')
  const [qty, setQty] = useState('1')
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [edit, setEdit] = useState<ChecklistItem | null>(null)

  const many = trip.travelers.length > 1
  const items = visibleItems(trip.checklist, kind, who)
  const total = progress(items)
  const person = new Map(trip.travelers.map((p) => [p.id, p]))
  const today = new Date().toISOString().slice(0, 10)

  async function toggle(i: ChecklistItem) {
    setPending((p) => new Set(p).add(i.id))
    const message = await t.setChecklistDone(i.id, !i.done)
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
    }
  }

  async function addTemplate() {
    const message = await t.addChecklistTemplate(trip.id)
    showToast(message ?? 'Modello aggiunto: modifica o elimina le voci che non ti servono.')
  }

  return (
    <>
      <PageHeader title="Checklist" subtitle="Cose da fare e da portare" back={{ href: '/altro', label: 'Altro' }} />
      <div class="space-y-3 px-4" style={{ paddingBottom: '5rem' }}>
        <div role="tablist" aria-label="Elenco" class="grid grid-cols-3 gap-1 rounded-full bg-line/60 p-1">
          {KINDS.map((k) => {
            const p = progress(visibleItems(trip.checklist, k, who))
            return (
              <button
                type="button"
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                class={`min-h-11 rounded-full px-2 text-sm font-medium ${kind === k ? 'bg-surface text-accent shadow-card' : 'text-muted'}`}
              >
                {KIND_LABEL[k]}
                {p.total > 0 && <span class="ml-1 text-xs opacity-70">{p.done}/{p.total}</span>}
              </button>
            )
          })}
        </div>

        {many && (
          <div class="flex flex-wrap gap-2" role="group" aria-label="Per chi">
            <button
              type="button"
              aria-pressed={who === 'all'}
              onClick={() => setWho('all')}
              class={`min-h-11 rounded-full border px-4 text-sm font-medium ${who === 'all' ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}`}
            >
              Tutti
            </button>
            {trip.travelers.map((p) => (
              <button
                type="button"
                aria-pressed={who === p.id}
                onClick={() => setWho(p.id)}
                class={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium ${who === p.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted'}`}
              >
                <span aria-hidden="true" class="h-3 w-3 rounded-full" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        )}

        {total.total > 0 && (
          <div>
            <div class="mb-1 flex justify-between text-xs text-muted">
              <span>{total.done} di {total.total} fatte</span>
              <span>{Math.round((total.done / total.total) * 100)}%</span>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={total.total} aria-valuenow={total.done} class="h-2 overflow-hidden rounded-full bg-line">
              <div class="h-full rounded-full bg-accent transition-all" style={{ width: `${(total.done / total.total) * 100}%` }} />
            </div>
          </div>
        )}

        <form onSubmit={add} class="flex gap-2">
          <input
            type="text"
            value={text}
            maxLength={200}
            placeholder={`Aggiungi a «${KIND_LABEL[kind]}»${who !== 'all' ? ` per ${person.get(who)?.name}` : ''}`}
            aria-label="Nuova voce"
            onInput={(e) => setText(e.currentTarget.value)}
            class="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4"
          />
          <label class="relative shrink-0">
            <span aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">×</span>
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
              class="min-h-12 w-16 rounded-2xl border border-line bg-surface pl-6 pr-2 text-center tabular-nums"
            />
          </label>
          <button
            type="submit"
            disabled={adding || !text.trim()}
            class="min-h-12 shrink-0 rounded-full bg-accent px-5 font-semibold text-accent-ink disabled:opacity-50"
          >
            {adding ? '…' : 'Aggiungi'}
          </button>
        </form>

        {items.length === 0 ? (
          trip.checklist.length === 0 ? (
            <EmptyState title="Checklist vuota" text="Scrivi la prima voce qui sopra, oppure parti da un modello con le cose che di solito servono." />
          ) : (
            <EmptyState title="Niente qui" text="Nessuna voce in questo elenco per la persona scelta." />
          )
        ) : (
          <Card class="!p-0">
            <ul class="divide-y divide-line">
              {items.map((i) => {
                const owner = i.travelerId ? person.get(i.travelerId) : undefined
                const late = !i.done && !!i.dueDate && i.dueDate < today
                return (
                  <li class="flex items-center">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={i.done}
                      aria-label={`${i.done ? 'Da rifare' : 'Fatto'}: ${i.text}`}
                      disabled={pending.has(i.id)}
                      onClick={() => void toggle(i)}
                      class="grid min-h-14 w-14 shrink-0 place-items-center disabled:opacity-50"
                    >
                      <span class={`grid h-6 w-6 place-items-center rounded-md border-2 text-sm ${i.done ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}>
                        {i.done ? '✓' : ''}
                      </span>
                    </button>
                    <button type="button" onClick={() => setEdit(i)} class="min-h-14 min-w-0 flex-1 py-2 pr-4 text-left">
                      <span class={`block ${i.done ? 'text-muted line-through' : ''}`}>
                        {i.quantity && i.quantity > 1 && (
                          <span class={`mr-1.5 inline-block rounded-full px-2 text-sm font-semibold tabular-nums ${i.done ? 'bg-line text-muted' : 'bg-accent-soft text-accent'}`}>
                            {i.quantity}×
                          </span>
                        )}
                        {i.text}
                      </span>
                      {(owner || i.dueDate) && (
                        <span class={`mt-0.5 flex items-center gap-2 text-xs ${late ? 'text-danger' : 'text-muted'}`}>
                          {owner && (
                            <span class="inline-flex items-center gap-1">
                              <span aria-hidden="true" class="h-2.5 w-2.5 rounded-full" style={{ background: owner.color }} />
                              {owner.name}
                            </span>
                          )}
                          {i.dueDate && <span>entro {formatShort(i.dueDate)}</span>}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        <button type="button" onClick={() => void addTemplate()} class="min-h-12 w-full rounded-full border border-line px-6 text-sm font-medium">
          {trip.checklist.length === 0 ? 'Parti da un modello' : 'Aggiungi le voci del modello mancanti'}
        </button>
      </div>

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
