import { useState } from 'preact/hooks'
import '../fw-spese.css'
import { doneCount, progress, visibleItems } from '../lib/checklist'
import { daysBetween, formatShort } from '../lib/dates'
import { tripToday } from '../lib/today'
import { showToast } from '../state/toast'
import { useTrip, useTrips } from '../state/trip'
import type { ChecklistItem, ChecklistKind } from '../types'
import { ChecklistItemForm } from '../ui/ChecklistItemForm'
import { CheckG, CloseG, MinusG, PlusG, TrashG } from '../ui/glyphs'
import { EmptyState, PageHeader } from '../ui/PageHeader'
import { Sheet } from '../ui/Sheet'
import { useDeleter } from '../ui/useDeleter'
import { useHideNav } from '../ui/useHideNav'

/** Ordine delle sezioni nella pagina: «Da fare» sta sotto «Valigia». */
const SECTION_ORDER: ChecklistKind[] = ['docs', 'packing', 'todo']
const SECTION_TITLE: Record<ChecklistKind, string> = { docs: 'Prima di partire', packing: 'Valigia', todo: 'Da fare' }

type SheetState = { kind: 'new' } | { kind: 'edit'; item: ChecklistItem } | null

export function Checklist() {
  const trip = useTrip()
  const t = useTrips()
  const [del, delDialog] = useDeleter()
  const [who, setWho] = useState<'all' | string>('all')
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [sheet, setSheet] = useState<SheetState>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  useHideNav(selecting)

  const many = trip.travelers.length > 1
  const sections = SECTION_ORDER.map((k) => ({ k, list: visibleItems(trip.checklist, k, who) }))
  const items = sections.flatMap((s) => s.list)
  const total = progress(items)
  const person = new Map(trip.travelers.map((p) => [p.id, p]))
  const today = new Date().toISOString().slice(0, 10)
  const chosen = items.filter((i) => sel.has(i.id))
  const toStart = daysBetween(tripToday(trip), trip.startDate)

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

  async function busy(id: string, run: () => Promise<string | null>) {
    setPending((p) => new Set(p).add(id))
    const message = await run()
    setPending((p) => {
      const n = new Set(p)
      n.delete(id)
      return n
    })
    if (message) showToast(message)
  }
  // con una quantità, il segno di spunta mette tutti i pezzi a posto (o li azzera se erano già tutti)
  const toggle = (i: ChecklistItem) => busy(i.id, () => ((i.quantity ?? 1) > 1 ? t.setChecklistCount(i.id, i.done ? 0 : (i.quantity as number)) : t.setChecklistDone(i.id, !i.done)))
  const setCount = (i: ChecklistItem, count: number) => busy(i.id, () => t.setChecklistCount(i.id, count))

  async function addTemplate() {
    const message = await t.addChecklistTemplate(trip.id)
    showToast(message ?? 'Modello aggiunto: modifica o elimina le voci che non ti servono.')
  }

  const headline =
    total.done === total.total ? 'Tutto pronto' : total.done * 5 >= total.total * 4 ? 'Quasi pronti' : total.done * 2 >= total.total ? 'Metà strada' : total.done === 0 ? 'Si comincia' : 'Si parte'
  const allSelected = items.length > 0 && chosen.length === items.length

  function renderItem(i: ChecklistItem) {
    const owner = i.travelerId ? person.get(i.travelerId) : undefined
    const late = !i.done && !!i.dueDate && i.dueDate < today
    const multi = (i.quantity ?? 1) > 1
    const have = doneCount(i)
    const partial = multi && have > 0 && !i.done
    const picked = selecting && sel.has(i.id)
    const on = selecting ? picked : i.done
    return (
      <div class={`row${picked ? ' pick' : ''}${openId === i.id && !selecting ? ' open' : ''}`} key={i.id} style={{ minHeight: '56px', flexWrap: 'wrap' }}>
        <button
          type="button"
          class="hit"
          role="checkbox"
          aria-checked={selecting ? picked : partial ? 'mixed' : i.done}
          aria-label={selecting ? `Seleziona: ${i.text}` : `${i.done ? 'Da rifare' : multi ? 'Tutti a posto' : 'Fatto'}: ${i.text}`}
          disabled={!selecting && pending.has(i.id)}
          onClick={() => (selecting ? toggleSel(i.id) : void toggle(i))}
          style={{ border: 0, background: 'none', padding: 0 }}
        >
          <span class={`cb${on ? ' on' : ''}${partial && !on ? ' part' : ''}`}>{on ? <CheckG size={14} sw={3.2} /> : partial ? <MinusG size={14} sw={3.2} /> : null}</span>
        </button>
        <button type="button" class="grow edit" aria-expanded={selecting ? undefined : openId === i.id} onClick={() => (selecting ? toggleSel(i.id) : setOpenId(openId === i.id ? null : i.id))}>
          <span class="tt" style={i.done ? { textDecoration: 'line-through', color: 'var(--ink-muted)', fontWeight: 400 } : undefined}>
            {i.text}
          </span>
          {i.dueDate && (
            <span class="mm" style={{ display: 'block', color: late ? 'var(--danger)' : undefined }}>
              entro {formatShort(i.dueDate)}
            </span>
          )}
          {i.url && (
            <span class="mm" style={{ display: 'block' }}>
              Con link
            </span>
          )}
        </button>
        {multi && !selecting ? (
          <span class="stepper" role="group" aria-label={`Pezzi a posto: ${i.text}`}>
            <button type="button" class="rbtn sm" aria-label={`Meno: ${i.text}`} disabled={pending.has(i.id) || have <= 0} onClick={() => void setCount(i, have - 1)}>
              <MinusG size={16} sw={2.2} />
            </button>
            <b class="num" aria-live="polite">
              {have}/{i.quantity}
            </b>
            <button type="button" class="rbtn sm" aria-label={`Più: ${i.text}`} disabled={pending.has(i.id) || have >= (i.quantity as number)} onClick={() => void setCount(i, have + 1)}>
              <PlusG size={16} sw={2.2} />
            </button>
          </span>
        ) : owner ? (
          <span class="av" style={{ background: owner.color }} aria-hidden="true">
            {owner.name.slice(0, 1).toUpperCase()}
          </span>
        ) : (
          many && <span class="mm">Tutti</span>
        )}
        {openId === i.id && !selecting && (
          <div class="ckd">
            <dl>
              <div>
                <dt>Elenco</dt>
                <dd>{SECTION_TITLE[i.kind]}</dd>
              </div>
              <div>
                <dt>Per chi</dt>
                <dd>{owner ? owner.name : 'Per tutti'}</dd>
              </div>
              {multi && (
                <div>
                  <dt>Pezzi a posto</dt>
                  <dd class="num">
                    {have} su {i.quantity}
                  </dd>
                </div>
              )}
              <div>
                <dt>Entro il</dt>
                <dd style={late ? { color: 'var(--danger)' } : undefined}>{i.dueDate ? formatShort(i.dueDate) : 'Nessuna data'}</dd>
              </div>
              <div>
                <dt>Stato</dt>
                <dd>{i.done ? 'Fatto' : partial ? 'In parte' : 'Da fare'}</dd>
              </div>
            </dl>
            <div class="ckd-a">
              {i.url && (
                <a class="btn soft sm" href={i.url} target="_blank" rel="noopener noreferrer">
                  Apri il link
                </a>
              )}
              <button type="button" class="btn line sm" onClick={() => setSheet({ kind: 'edit', item: i })}>
                Modifica
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <main class="screen">
      <PageHeader
        title={selecting ? (chosen.length === 0 ? 'Tocca le voci' : chosen.length === 1 ? '1 selezionata' : `${chosen.length} selezionate`) : 'Checklist'}
        subtitle={selecting ? 'tocca le voci per sceglierle' : 'Documenti e valigia'}
        back={selecting ? undefined : { href: '/altro', label: 'Altro' }}
        actions={
          items.length > 0 || selecting ? (
            <button type="button" class="rbtn" aria-label={selecting ? 'Annulla la selezione' : 'Seleziona'} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
              {selecting ? <CloseG /> : <CheckG />}
            </button>
          ) : undefined
        }
      />

      {total.total > 0 && !selecting && (
        <section class="tinta t-lavanda cori" style={{ display: 'flex', gap: '20px', alignItems: 'center' }} aria-label="Avanzamento">
          <div class="pring" role="progressbar" aria-label={`${total.done} di ${total.total} fatte`} aria-valuemin={0} aria-valuemax={total.total} aria-valuenow={total.done}>
            <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
              <circle cx="48" cy="48" r="40" fill="none" style={{ stroke: 'var(--surface-card)' }} stroke-width="10" />
              <circle cx="48" cy="48" r="40" fill="none" style={{ stroke: 'var(--azzurro-solid)' }} stroke-width="10" stroke-linecap="round" stroke-dasharray={`${((total.done / total.total) * 251.3).toFixed(1)} 251.3`} transform="rotate(-90 48 48)" />
            </svg>
            <div class="c num">
              {total.done}/{total.total}
            </div>
          </div>
          <div>
            <h2 class="h-md">{headline}</h2>
            <p class="b-sm mut">
              {total.done} {total.done === 1 ? 'voce fatta' : 'voci fatte'} su {total.total}.
              {toStart > 0 && ` Mancano ${toStart} ${toStart === 1 ? 'giorno' : 'giorni'} alla partenza.`}
            </p>
          </div>
        </section>
      )}

      {many && !selecting && (
        <div class="chips fs-chips" role="group" aria-label="Per chi">
          <button type="button" class={`chip${who === 'all' ? ' on' : ''}`} aria-pressed={who === 'all'} onClick={() => setWho('all')}>
            Tutte
          </button>
          {trip.travelers.map((p) => (
            <button type="button" key={p.id} class={`chip${who === p.id ? ' on' : ''}`} aria-pressed={who === p.id} onClick={() => setWho(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        trip.checklist.length === 0 ? (
          <>
            <EmptyState title="Checklist vuota" text="Aggiungi la prima voce, oppure parti da un modello con le cose che di solito servono." />
            <button type="button" class="btn soft block" onClick={() => void addTemplate()}>
              Parti da un modello
            </button>
          </>
        ) : (
          <EmptyState title="Niente qui" text="Nessuna voce per la persona scelta." />
        )
      ) : (
        <>
          {selecting && (
            <div class="rows">
              <div class="row" style={{ minHeight: '56px' }}>
                <button
                  type="button"
                  class="hit"
                  role="checkbox"
                  aria-checked={allSelected ? true : chosen.length > 0 ? 'mixed' : false}
                  aria-label={allSelected ? `Deseleziona tutte le ${items.length} voci` : `Seleziona tutte le ${items.length} voci`}
                  onClick={() => setSel(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
                  style={{ border: 0, background: 'none', padding: 0 }}
                >
                  <span class={`cb${chosen.length > 0 ? ' on' : ''}`}>{allSelected ? <CheckG size={14} sw={3.2} /> : chosen.length > 0 ? <MinusG size={14} sw={3.2} /> : null}</span>
                </button>
                <span class="grow tt">{allSelected ? 'Deseleziona tutte' : 'Seleziona tutte'}</span>
                <span class="mm num">
                  {chosen.length} su {items.length}
                </span>
              </div>
            </div>
          )}
          {sections.map(
            ({ k, list }) =>
              list.length > 0 && (
                <section key={k} aria-labelledby={`sez-${k}`}>
                  <h2 class="h-sm" id={`sez-${k}`} style={{ marginBottom: '8px' }}>
                    {SECTION_TITLE[k]}
                  </h2>
                  <div class="rows">{list.map((i) => renderItem(i))}</div>
                </section>
              ),
          )}
        </>
      )}

      <div class="cta" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {selecting ? (
          <button type="button" class="btn danger block" disabled={chosen.length === 0} onClick={() => void deleteChosen()}>
            <TrashG />
            {chosen.length === 0 ? 'Elimina' : chosen.length === 1 ? 'Elimina 1 voce' : `Elimina ${chosen.length} voci`}
          </button>
        ) : (
          <>
            <button type="button" class="btn block" onClick={() => setSheet({ kind: 'new' })}>
              <PlusG />
              Aggiungi voce
            </button>
            {trip.checklist.length > 0 && (
              <button type="button" class="b-sm muted" style={{ border: 0, background: 'none', minHeight: '44px', fontWeight: 600 }} onClick={() => void addTemplate()}>
                Aggiungi le voci del modello mancanti
              </button>
            )}
          </>
        )}
      </div>

      {delDialog}
      <Sheet open={sheet !== null} title={sheet?.kind === 'new' ? 'Nuova voce' : 'Modifica voce'} onClose={() => setSheet(null)}>
        {sheet?.kind === 'new' && (
          <ChecklistItemForm trip={trip} defaults={{ travelerId: who === 'all' ? undefined : who }} onSubmit={(input) => t.createChecklistItem(trip.id, input)} onDone={() => setSheet(null)} />
        )}
        {sheet?.kind === 'edit' && (
          <ChecklistItemForm
            key={sheet.item.id}
            trip={trip}
            initial={sheet.item}
            onSubmit={(input) => t.updateChecklistItem(sheet.item.id, input)}
            onDelete={async () => {
              const id = sheet.item.id
              const message = await t.setChecklistDeleted(id, true)
              if (!message) showToast('Voce eliminata', { label: 'Annulla', run: () => void t.setChecklistDeleted(id, false) })
              return message
            }}
            onDone={() => setSheet(null)}
          />
        )}
      </Sheet>
    </main>
  )
}
