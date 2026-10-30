// Pagina Checklist (mock Fa-51, #41, FRD LIST-001…012): «Tutti» (lista comune, spunte personali) | «Solo mie» (lista privata),
// avanzamento mio, sezioni per categoria, avatar con «2 di 4», apertura in linea, «Seleziona» e «Duplica da un viaggio».
import { useMemo, useState } from 'react'
import { useSearch } from 'wouter'
import { doneCount, inLista, mioAvanzamento, sezioni, spunteDi, type ListaChecklist } from '../../lib/checklist'
import { formatShort } from '../../lib/dates'
import { discOf, initials } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import type { ChecklistItem, Trip } from '../../types'
import { Pulsante, PulsanteIcona, Segmenti } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { useUnaAperta } from '../../faraway/Righe'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { Vuoto } from '../../faraway/Stati'
import { VoceSheet } from './VoceSheet'

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']

export function ChecklistPage() {
  const trip = useTrip()
  const t = useTrips()
  const search = useSearch()
  const [ask, confirmNode] = useConferma()
  const open = useUnaAperta()
  const v2 = !!trip.checklistV2
  const [lista, setLista] = useState<ListaChecklist>('all')
  const [sheet, setSheet] = useState<{ item?: ChecklistItem } | null>(() => (new URLSearchParams(search).get('nuova') ? {} : null))
  const [dup, setDup] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const gruppo = trip.travelers.length > 1

  const visibili = useMemo(() => (v2 ? trip.checklist.filter((i) => inLista(i, lista)) : trip.checklist), [trip.checklist, lista, v2])
  const gruppi = useMemo(() => sezioni(visibili), [visibili])
  const mio = mioAvanzamento(trip.checklist)
  const altri = t.trips.filter((x) => x.id !== trip.id && x.checklist.length > 0)

  async function busy(id: string, run: () => Promise<string | null>) {
    setPending((p) => new Set(p).add(id))
    const m = await run()
    setPending((p) => {
      const n = new Set(p)
      n.delete(id)
      return n
    })
    if (m) showToast(m)
  }
  // con una quantità, la casella mette tutti i pezzi a posto (o li azzera se erano già tutti)
  const toggle = (i: ChecklistItem) => busy(i.id, () => ((i.quantity ?? 1) > 1 ? t.setChecklistCount(i.id, i.done ? 0 : (i.quantity as number)) : t.setChecklistDone(i.id, !i.done)))
  const setCount = (i: ChecklistItem, n: number) => busy(i.id, () => t.setChecklistCount(i.id, n))

  async function elimina(list: ChecklistItem[]) {
    if (list.length === 0) return
    const ok = await ask({
      title: list.length === 1 ? `Eliminare «${list[0].text}»?` : `Eliminare ${list.length} voci?`,
      message: list.some((i) => !i.private) && gruppo ? 'Le voci comuni spariscono per tutti. Puoi annullare subito dopo.' : 'Puoi annullare subito dopo.',
      confirm: list.length === 1 ? 'Elimina la voce' : `Elimina ${list.length} voci`,
      cancel: 'Tieni le voci',
      destructive: true,
    })
    if (!ok) return
    const ids = list.map((i) => i.id)
    const m = await t.setChecklistManyDeleted(ids, true)
    showToast(m ?? (list.length === 1 ? 'Voce eliminata' : `${list.length} voci eliminate`), m ? undefined : { label: 'Annulla', run: () => void t.setChecklistManyDeleted(ids, false) })
    setSelecting(false)
    setSel(new Set())
  }

  async function modello() {
    const m = await t.addChecklistTemplate(trip.id)
    showToast(m ?? 'Modello aggiunto: modifica o elimina le voci che non ti servono.')
  }
  async function duplica(from: Trip) {
    setDup(false)
    const m = await t.duplicateChecklist(trip.id, from.id)
    showToast(m ?? `Voci copiate da «${from.title}»`)
  }

  const chosen = visibili.filter((i) => sel.has(i.id))
  const today = new Date().toISOString().slice(0, 10)

  function riga(i: ChecklistItem) {
    const multi = (i.quantity ?? 1) > 1
    const have = doneCount(i)
    const partial = multi && have > 0 && !i.done
    const isOpen = open.isOpen(i.id) && !selecting
    const picked = selecting && sel.has(i.id)
    const late = !i.done && !!i.dueDate && i.dueDate < today
    const s = spunteDi(i, trip.travelers.length)
    const mostraPersone = gruppo && !i.private && v2
    return (
      <li key={i.id} className={cx('it', i.done && 'done')} style={{ flexWrap: 'wrap' }}>
        <button
          type="button"
          className={cx('ck', (selecting ? picked : i.done) ? 'd' : partial ? 'p' : undefined)}
          role="checkbox"
          aria-checked={selecting ? picked : partial ? 'mixed' : i.done}
          aria-label={selecting ? `Seleziona: ${i.text}` : `${i.done ? 'Da rifare' : multi ? 'Tutti a posto' : 'Fatto'}: ${i.text}`}
          disabled={!selecting && pending.has(i.id)}
          onClick={() => (selecting ? setSel((p) => (p.has(i.id) ? new Set([...p].filter((x) => x !== i.id)) : new Set(p).add(i.id))) : void toggle(i))}
        >
          <b>
            <Sv name={partial && !i.done ? 'minus' : 'check'} size={16} className="ic" />
          </b>
        </button>
        <div className="tx">
          <button type="button" aria-expanded={selecting ? undefined : isOpen} onClick={() => (selecting ? setSel((p) => (p.has(i.id) ? new Set([...p].filter((x) => x !== i.id)) : new Set(p).add(i.id))) : open.toggle(i.id))} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
            <span className="n">
              {i.text}
              {multi ? ` · ${i.quantity}${i.unit ? ` ${i.unit}` : ''}` : ''}
            </span>
          </button>
          <div className="mt">
            {i.private ? (
              <span className="tag">
                <Sv name="lock" size={12} className="ic" />
                Solo io
              </span>
            ) : null}
            {i.dueDate ? <span className="tag" style={late ? { color: 'var(--danger)' } : undefined}>entro {formatShort(i.dueDate)}</span> : null}
            {multi ? <span className="cnt">{have}/{i.quantity}</span> : null}
            {mostraPersone ? (
              <>
                <span className="pp" aria-hidden="true">
                  {trip.travelers.map((p) => {
                    const on = p.id === trip.myTravelerId ? i.done : !!i.others?.find((o) => o.travelerId === p.id)?.done
                    return (
                      <span key={p.id} className={cx('pe', on ? 'y' : 'o')} style={{ ['--c' as string]: `var(--disco-${COL[(discOf(trip, p.id) - 1) % 5]})` }}>
                        {initials(p.name)}
                        {on ? (
                          <em>
                            <Sv name="check" size={10} className="ic" />
                          </em>
                        ) : null}
                      </span>
                    )
                  })}
                </span>
                <span className="cnt">{s.done} di {s.total}</span>
              </>
            ) : null}
          </div>
          {isOpen ? (
            <div style={{ display: 'grid', gap: 10, paddingBottom: 8 }}>
              {i.description ? <span className="fa-m" style={{ whiteSpace: 'pre-line' }}>{i.description}</span> : null}
              {multi ? (
                <span role="group" aria-label={`Pezzi a posto: ${i.text}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                  <PulsanteIcona icon="minus" label={`Meno: ${i.text}`} onPress={() => void setCount(i, have - 1)} />
                  <b aria-live="polite">{have}/{i.quantity}</b>
                  <PulsanteIcona icon="plus" label={`Più: ${i.text}`} onPress={() => void setCount(i, have + 1)} />
                </span>
              ) : null}
              {i.url ? (
                <a className="fa-lnk" href={i.url} target="_blank" rel="noopener noreferrer">
                  Apri il link
                </a>
              ) : null}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={() => setSheet({ item: i })}>
                  Modifica
                </Pulsante>
                <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={() => void elimina([i])}>
                  Elimina
                </Pulsante>
              </div>
            </div>
          ) : null}
        </div>
      </li>
    )
  }

  const vuota = trip.checklist.length === 0
  return (
    <Schermata
      bar={
        <BarraIndietro
          title={selecting ? (chosen.length === 0 ? 'Tocca le voci' : chosen.length === 1 ? '1 selezionata' : `${chosen.length} selezionate`) : 'Checklist'}
          back="/altro"
          right={
            vuota ? undefined : (
              <PulsanteIcona icon={selecting ? 'close' : 'check'} label={selecting ? 'Annulla la selezione' : 'Seleziona'} onPress={() => (selecting ? (setSelecting(false), setSel(new Set())) : setSelecting(true))} />
            )
          }
        />
      }
      fab={vuota || selecting ? null : { label: 'Voce', aria: 'Aggiungi una voce', onPress: () => setSheet({}) }}
      overlay={
        <>
          {sheet ? <VoceSheet key={sheet.item?.id ?? 'new'} trip={trip} item={sheet.item} where={lista} open onClose={() => setSheet(null)} /> : null}
          <Foglio open={dup} title="Duplica da un viaggio" onClose={() => setDup(false)}>
            <div style={{ display: 'grid', gap: 8 }}>
              <p className="fa-m" style={{ margin: 0 }}>Copio le voci comuni e la tua lista privata, senza spunte.</p>
              {altri.map((x) => (
                <Pulsante key={x.id} color="secondary" onPress={() => void duplica(x)}>
                  {x.title}
                </Pulsante>
              ))}
            </div>
          </Foglio>
          {confirmNode}
        </>
      }
    >
      {vuota ? (
        <>
          <Vuoto title="Nessuna voce ancora" text="Aggiungi cosa fare prima di partire e cosa mettere in valigia, per tutti o solo per te." action="Aggiungi la prima voce" onAction={() => setSheet({})} />
          <Pulsante color="secondary" onPress={() => void modello()}>
            Parti da un modello
          </Pulsante>
          {altri.length > 0 ? (
            <Pulsante color="secondary" onPress={() => setDup(true)}>
              Duplica da un viaggio
            </Pulsante>
          ) : null}
        </>
      ) : (
        <div className="k-Checklist" style={{ display: 'grid', gap: 12 }}>
          {v2 && !selecting ? (
            <Segmenti
              label="Lista"
              value={lista}
              options={[
                { value: 'all', label: 'Tutti' },
                { value: 'mine', label: 'Solo mie' },
              ]}
              onChange={(v) => (setLista(v), open.setOpen(null))}
            />
          ) : null}
          {!selecting ? (
            <div className="card">
              <div className="hd">
                <span className="t">Checklist</span>
                <span className="c">
                  {mio.done} di {mio.total}
                </span>
              </div>
              <div className="bar" role="progressbar" aria-label="Avanzamento" aria-valuemin={0} aria-valuemax={mio.total} aria-valuenow={mio.done}>
                <i style={{ width: `${mio.total ? (mio.done / mio.total) * 100 : 0}%` }} />
              </div>
            </div>
          ) : null}
          {visibili.length === 0 ? (
            <Vuoto
              title={lista === 'mine' ? 'La tua lista è vuota' : 'Nessuna voce comune'}
              text={lista === 'mine' ? 'Qui metti le cose solo tue: le vedi solo tu.' : 'Qui metti le cose di tutti: ognuno spunta la sua.'}
              action="Aggiungi una voce"
              onAction={() => setSheet({})}
            />
          ) : null}
          {gruppi.map((g) => (
            <section key={g.category} className="card" aria-label={g.category}>
              <div className="grp">
                <b>{g.category}</b>
                <span>
                  {g.done} di {g.items.length}
                </span>
              </div>
              <ul className="l">{g.items.map((i) => riga(i))}</ul>
            </section>
          ))}
          {!selecting && !vuota && altri.length > 0 ? (
            <Pulsante color="secondary" iconLeading="copy" onPress={() => setDup(true)}>
              Duplica da un viaggio
            </Pulsante>
          ) : null}
          {selecting ? (
            <Pulsante color="tertiary-destructive" iconLeading="trash" isDisabled={chosen.length === 0} onPress={() => void elimina(chosen)}>
              {chosen.length === 0 ? 'Elimina' : chosen.length === 1 ? 'Elimina 1 voce' : `Elimina ${chosen.length} voci`}
            </Pulsante>
          ) : null}
        </div>
      )}
    </Schermata>
  )
}
