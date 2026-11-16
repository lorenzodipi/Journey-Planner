// Pagina Checklist (mock Fa-51, #41, FRD LIST-001…012): «Tutti» (lista comune, spunte personali) | «Solo mie» (lista privata),
// avanzamento mio, sezioni per categoria, avatar con «2 di 4», apertura in linea, «Seleziona» e «Duplica da un viaggio».
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import { categoriesFor, categoryOf, cercaVoci, doneCount, inLista, isCategoriaFissa, mioAvanzamento, sezioni, spunteDi, type ListaChecklist, type SezioneChecklist } from '../../lib/checklist'
import { formatShort } from '../../lib/dates'
import { discOf, initials } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import type { ChecklistItem, Trip } from '../../types'
import { Campo, MenuAzioni, Pulsante, PulsanteIcona, Segmenti } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { Affianca, BarraIndietro, Schermata } from '../../faraway/shell'
import { Vuoto } from '../../faraway/Stati'
import { VoceSheet } from './VoceSheet'
import { CategoriaSheet } from './CategoriaSheet'
import { useInCorso } from '../../faraway/Attesa'
import { nomeCategoria, t as tt } from '../../i18n'

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']

export function ChecklistPage() {
  const trip = useTrip()
  const t = useTrips()
  const search = useSearch()
  const [ask, confirmNode] = useConferma()
  const v2 = !!trip.checklistV2
  const [lista, setLista] = useState<ListaChecklist>('all')
  const [sheet, setSheet] = useState<{ item?: ChecklistItem } | null>(() => (new URLSearchParams(search).get('nuova') ? {} : null))
  // «Nuova voce» arriva da un link (Oggi): il foglio si è aperto, il parametro si toglie perché ricaricando non si riapra
  const [, navigate] = useLocation()
  useEffect(() => {
    if (new URLSearchParams(search).get('nuova')) navigate('/altro/checklist', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [dup, setDup] = useState(false)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [catSheet, setCatSheet] = useState<SezioneChecklist | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const gruppo = trip.travelers.length > 1

  // da soli non c'è differenza tra lista comune e privata: si vede tutto in una lista sola
  const visibili = useMemo(() => (v2 && gruppo ? trip.checklist.filter((i) => inLista(i, lista)) : trip.checklist), [trip.checklist, lista, v2, gruppo])
  // ricerca (lente nella barra): filtra le voci per testo, descrizione o categoria; mentre si cerca le categorie restano aperte
  const [cercaAperta, setCercaAperta] = useState(false)
  const [ricerca, setRicerca] = useState('')
  const cercando = cercaAperta && ricerca.trim() !== ''
  const trovate = useMemo(() => (cercando ? cercaVoci(visibili, ricerca, nomeCategoria) : visibili), [visibili, ricerca, cercando])
  const gruppi = useMemo(() => sezioni(trovate), [trovate])
  const chiusa = (categoria: string) => !cercando && chiuse.has(categoria)
  // categorie chiuse (si apre e chiude toccando il titolo): restano chiuse anche riaprendo la pagina, per questo viaggio
  const chiaveChiuse = `jp.checklist.chiuse.${trip.id}`
  const [chiuse, setChiuse] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(chiaveChiuse) ?? '[]') as string[])
    } catch {
      return new Set()
    }
  })
  function cambiaChiuse(modifica: (insieme: Set<string>) => void) {
    setChiuse((prima) => {
      const dopo = new Set(prima)
      modifica(dopo)
      try {
        localStorage.setItem(chiaveChiuse, JSON.stringify([...dopo]))
      } catch {
        // ignorato: resta aperta o chiusa finché si sta sulla pagina
      }
      return dopo
    })
  }
  const apriChiudi = (categoria: string) => cambiaChiuse((c) => (c.has(categoria) ? c.delete(categoria) : c.add(categoria)))
  // le voci «Scegli» che non mi riguardano non contano nel mio avanzamento
  const mio = mioAvanzamento(trip.checklist.filter((i) => !i.forTravelers || !trip.myTravelerId || i.forTravelers.includes(trip.myTravelerId)))
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
      title: list.length === 1 ? tt('Eliminare «{text}»?', { text: list[0].text }) : tt('Eliminare {length} voci?', { length: list.length }),
      message: list.some((i) => !i.private) && gruppo ? tt('Le voci comuni spariscono per tutti. Puoi annullare subito dopo.') : tt('Puoi annullare subito dopo.'),
      confirm: list.length === 1 ? tt('Elimina la voce') : tt('Elimina {length} voci', { length: list.length }),
      cancel: tt('Tieni le voci'),
      destructive: true,
    })
    if (!ok) return
    const ids = list.map((i) => i.id)
    const m = await t.setChecklistManyDeleted(ids, true)
    showToast(m ?? (list.length === 1 ? tt('Voce eliminata') : tt('{length} voci eliminate', { length: list.length })), m ? undefined : { label: tt('Annulla'), run: () => void t.setChecklistManyDeleted(ids, false) })
    setSelecting(false)
    setSel(new Set())
  }

  /** Cambia la categoria a queste voci. Il messaggio in basso ha «Annulla», che rimette a ognuna la categoria di prima. Ritorna l'errore, se c'è. */
  async function cambiaCategoria(voci: ChecklistItem[], nuova: string, messaggio: string): Promise<string | null> {
    const prima = new Map<string, string[]>()
    for (const v of voci) prima.set(categoryOf(v), [...(prima.get(categoryOf(v)) ?? []), v.id])
    const errore = await t.setChecklistCategory(voci.map((v) => v.id), nuova)
    if (!errore) showToast(messaggio, { label: tt('Annulla'), run: () => prima.forEach((ids, c) => void t.setChecklistCategory(ids, c)) })
    return errore
  }
  async function rinominaCategoria(g: SezioneChecklist, nome: string): Promise<string | null> {
    const errore = await cambiaCategoria(g.items, nome, tt('Categoria rinominata'))
    if (errore) return errore
    // la categoria chiusa resta chiusa col nome nuovo
    cambiaChiuse((c) => (c.delete(g.category) ? c.add(nome) : c))
    setCatSheet(null)
    return null
  }
  async function eliminaCategoria(g: SezioneChecklist) {
    const ok = await ask({
      title: tt('Eliminare la categoria «{label}»?', { label: g.category }),
      message: [
        g.items.length === 1 ? tt('La voce non viene eliminata: passa in «Altro».') : tt('Le {n} voci non vengono eliminate: passano in «Altro».', { n: g.items.length }),
        gruppo && g.items.some((i) => !i.private) ? tt('Il cambio vale per tutti i viaggiatori.') : '',
        tt('Puoi annullare subito dopo.'),
      ].filter(Boolean).join(' '),
      confirm: tt('Elimina la categoria'),
      cancel: tt('Tieni la categoria'),
      destructive: true,
    })
    if (!ok) return
    const errore = await cambiaCategoria(g.items, 'Altro', tt('Categoria eliminata'))
    if (errore) showToast(errore)
    else cambiaChiuse((c) => void c.delete(g.category))
  }

  const [occ, faiOcc] = useInCorso()
  async function modello() {
    const m = await faiOcc('modello', () => t.addChecklistTemplate(trip.id))
    showToast(m ?? tt('Modello aggiunto: modifica o elimina le voci che non ti servono.'))
  }
  async function duplica(from: Trip) {
    const m = await faiOcc(`dup:${from.id}`, () => t.duplicateChecklist(trip.id, from.id))
    setDup(false)
    showToast(m ?? tt('Voci copiate da «{title}»', { title: from.title }))
  }

  const chosen = trovate.filter((i) => sel.has(i.id))
  const today = new Date().toISOString().slice(0, 10)

  function riga(i: ChecklistItem) {
    const multi = (i.quantity ?? 1) > 1
    const have = doneCount(i)
    const partial = multi && have > 0 && !i.done
    const picked = selecting && sel.has(i.id)
    const late = !i.done && !!i.dueDate && i.dueDate < today
    // nella scheda «Solo mie» sono tutte private: la pillola «Solo io» sarebbe una ripetizione
    const chipPrivata = i.private && !(v2 && gruppo && lista === 'mine')
    const persone = i.forTravelers ? trip.travelers.filter((p) => i.forTravelers?.includes(p.id)) : trip.travelers
    const s = i.forTravelers ? { done: persone.filter((p) => (p.id === trip.myTravelerId ? i.done : !!i.others?.find((o) => o.travelerId === p.id)?.done)).length, total: persone.length } : spunteDi(i, trip.travelers.length)
    const mostraPersone = gruppo && !i.private && v2
    return (
      <li key={i.id} className={cx('it', i.done && 'done')} style={{ flexWrap: 'wrap' }}>
        <button
          type="button"
          className={cx('ck', (selecting ? picked : i.done) ? 'd' : partial ? 'p' : undefined)}
          role="checkbox"
          aria-checked={selecting ? picked : partial ? 'mixed' : i.done}
          aria-label={selecting ? tt('Seleziona: {text}', { text: i.text }) : `${i.done ? tt('Da rifare') : multi ? tt('Tutti a posto') : tt('Fatto')}: ${i.text}`}
          disabled={!selecting && pending.has(i.id)}
          onClick={() => (selecting ? setSel((p) => (p.has(i.id) ? new Set([...p].filter((x) => x !== i.id)) : new Set(p).add(i.id))) : void toggle(i))}
        >
          <b>
            <Sv name={partial && !i.done ? 'minus' : 'check'} size={16} className="ic" />
          </b>
        </button>
        <div className="tx">
          {selecting ? (
            <button type="button" onClick={() => setSel((p) => (p.has(i.id) ? new Set([...p].filter((x) => x !== i.id)) : new Set(p).add(i.id)))} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
              <span className="n">
                {i.text}
                {multi ? ` · ${i.quantity}${i.unit ? ` ${i.unit}` : ''}` : ''}
              </span>
            </button>
          ) : (
            <span className="n" style={{ display: 'block' }}>
              {i.text}
              {multi ? ` · ${i.quantity}${i.unit ? ` ${i.unit}` : ''}` : ''}
            </span>
          )}
          {i.description ? <span className="fa-m" style={{ display: 'block', whiteSpace: 'pre-line' }}>{i.description}</span> : null}
          {chipPrivata || i.dueDate ? (
            <div className="mt">
              {chipPrivata ? (
                <span className="tag">
                  <Sv name="lock" size={12} className="ic" />
                  {tt('Solo io')}
                </span>
              ) : null}
              {i.dueDate ? <span className="tag" style={late ? { color: 'var(--danger)' } : undefined}>{tt('entro {v0}', { v0: formatShort(i.dueDate) })}</span> : null}
            </div>
          ) : null}
          {multi ? (
            <div className="mt">
              {selecting ? (
                <span className="cnt">{have}/{i.quantity}</span>
              ) : (
                <span role="group" aria-label={tt('Pezzi a posto: {text}', { text: i.text })} className="fa-qta">
                  <PulsanteIcona icon="minus" label={tt('Meno: {text}', { text: i.text })} isDisabled={pending.has(i.id) || have <= 0} onPress={() => void setCount(i, have - 1)} />
                  <b aria-live="polite">{have}/{i.quantity}</b>
                  <PulsanteIcona icon="plus" label={tt('Più: {text}', { text: i.text })} isDisabled={pending.has(i.id) || have >= (i.quantity ?? 1)} onPress={() => void setCount(i, have + 1)} />
                </span>
              )}
            </div>
          ) : null}
          {mostraPersone ? (
            <div className="mt">
              <span className="pp" aria-hidden="true">
                {persone.map((p) => {
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
              <span className="cnt">{tt('{done} di {total}', { done: s.done, total: s.total })}</span>
            </div>
          ) : null}
          {i.url && !selecting ? (
            <a className="fa-lnk" href={i.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14 }}>
              {tt('Apri il link')}
            </a>
          ) : null}
        </div>
        {selecting ? null : <PulsanteIcona icon="pencil" label={tt('Modifica: {text}', { text: i.text })} onPress={() => setSheet({ item: i })} />}
      </li>
    )
  }

  const vuota = trip.checklist.length === 0
  return (
    <Schermata
      bar={
        <BarraIndietro
          senzaIndietro={selecting}
          title={selecting ? (chosen.length === 0 ? tt('Tocca le voci') : chosen.length === 1 ? '1 selezionata' : tt('{length} selezionate', { length: chosen.length })) : tt('Checklist')}
          back="/altro"
          right={
            vuota ? undefined : (
              <>
                {selecting ? null : <PulsanteIcona icon={cercaAperta ? 'close' : 'search'} label={cercaAperta ? tt('Chiudi la ricerca') : tt('Cerca nelle voci')} expanded={cercaAperta} onPress={() => (setCercaAperta(!cercaAperta), setRicerca(''))} />}
                <PulsanteIcona className={selecting ? undefined : 'dng'} icon={selecting ? 'close' : 'trash'} label={selecting ? tt('Annulla la selezione') : tt('Elimina delle voci')} onPress={() => (selecting ? (setSelecting(false), setSel(new Set())) : setSelecting(true))} />
              </>
            )
          }
        />
      }
      fab={vuota || selecting ? null : { label: tt('Voce'), aria: tt('Aggiungi una voce'), onPress: () => setSheet({}) }}
      // eliminando, al posto della barra delle sezioni c'è il bottone «Elimina», sempre visibile
      tabs={!selecting}
      className={selecting ? 'fa-selmode' : undefined}
      // «Tutti | Solo mie» sta nella testa con il titolo
      fissa={
        !vuota && (cercaAperta || (v2 && gruppo && !selecting)) ? (
          <>
            {cercaAperta ? <Campo label={tt('Cerca nelle voci')} hideLabel icon="search" type="search" value={ricerca} onChange={setRicerca} placeholder={tt('Voce, nota o categoria')} enterKeyHint="search" autoFocus /> : null}
            {v2 && gruppo && !selecting ? (
          <Segmenti
            label={tt('Lista')}
            value={lista}
            options={[
              { value: 'all', label: tt('Tutti') },
              { value: 'mine', label: tt('Solo mie') },
            ]}
            onChange={setLista}
          />
            ) : null}
          </>
        ) : null
      }
      overlay={
        <>
          {selecting ? (
            <div className="fa-selbar">
              <Pulsante color="tertiary-destructive" iconLeading="trash" isDisabled={chosen.length === 0} onPress={() => void elimina(chosen)}>
                {chosen.length === 0 ? tt('Elimina') : chosen.length === 1 ? 'Elimina 1 voce' : tt('Elimina {length} voci', { length: chosen.length })}
              </Pulsante>
            </div>
          ) : null}
          {sheet ? (
            <VoceSheet
              key={sheet.item?.id ?? 'new'}
              trip={trip}
              item={sheet.item}
              where={lista}
              open
              onClose={() => setSheet(null)}
              onElimina={
                sheet.item
                  ? () => {
                      const voce = sheet.item as ChecklistItem
                      setSheet(null)
                      void elimina([voce])
                    }
                  : undefined
              }
            />
          ) : null}
          {catSheet ? (
            <CategoriaSheet
              key={catSheet.category}
              categoria={catSheet.category}
              esistenti={categoriesFor(trip.checklist)}
              perTutti={gruppo && catSheet.items.some((i) => !i.private)}
              onClose={() => setCatSheet(null)}
              onSalva={(nome) => rinominaCategoria(catSheet, nome)}
            />
          ) : null}
          <Foglio open={dup} title={tt('Duplica da un viaggio')} onClose={() => setDup(false)}>
            <div style={{ display: 'grid', gap: 8 }}>
              <p className="fa-m" style={{ margin: 0 }}>{tt('Copio le voci comuni e la tua lista privata, senza spunte.')}</p>
              {altri.map((x) => (
                <Pulsante key={x.id} color="secondary" isLoading={occ === `dup:${x.id}`} onPress={() => void duplica(x)}>
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
          <Vuoto title={tt('Nessuna voce ancora')} text={tt('Aggiungi cosa fare prima di partire e cosa mettere in valigia, per tutti o solo per te.')} action={tt('Aggiungi la prima voce')} onAction={() => setSheet({})} />
          <Pulsante color="secondary" isLoading={occ === 'modello'} onPress={() => void modello()}>
            {tt('Parti da un modello')}
          </Pulsante>
          {altri.length > 0 ? (
            <Pulsante color="secondary" onPress={() => setDup(true)}>
              {tt('Duplica da un viaggio')}
            </Pulsante>
          ) : null}
        </>
      ) : (
        <div className="k-Checklist" style={{ display: 'grid', gap: 16 }}>
          {!selecting ? (
            <div className="card">
              <div className="hd">
                <span className="t">{tt('Checklist')}</span>
                <span className="c">
                  {tt('{done} di {total}', { done: mio.done, total: mio.total })}
                </span>
              </div>
              <div className="bar" role="progressbar" aria-label={tt('Avanzamento')} aria-valuemin={0} aria-valuemax={mio.total} aria-valuenow={mio.done}>
                <i style={{ width: `${mio.total ? (mio.done / mio.total) * 100 : 0}%` }} />
              </div>
            </div>
          ) : null}
          {visibili.length === 0 ? (
            <Vuoto
              title={lista === 'mine' ? tt('La tua lista è vuota') : tt('Nessuna voce comune')}
              text={lista === 'mine' ? tt('Qui metti le cose solo tue: le vedi solo tu.') : tt('Qui metti le cose di tutti: ognuno spunta la sua.')}
              action={tt('Aggiungi una voce')}
              onAction={() => setSheet({})}
            />
          ) : cercando && trovate.length === 0 ? (
            <p className="fa-m" role="status" style={{ margin: 0, textAlign: 'center' }}>{tt('Nessuna voce corrisponde a «{v0}».', { v0: ricerca.trim() })}</p>
          ) : null}
          {/* da 840 px due colonne indipendenti (come Impostazioni): niente righe in comune, quindi niente vuoti sotto una card più corta.
              La divisione guarda quante voci ha ogni categoria, non se è aperta o chiusa: aprendo e chiudendo le card non cambiano colonna. */}
          <Affianca pesi={gruppi.map((g) => g.items.length + 1)}>
              {gruppi.map((g) => (
              <section key={g.category} className={cx('card', chiusa(g.category) && 'chiusa')} aria-label={nomeCategoria(g.category)}>
                {/* titolo della categoria: tocca per aprire o chiudere; da chiusa restano titolo e «2 di 12» */}
                {isCategoriaFissa(g.category) || selecting ? (
                  <button type="button" className="grp" aria-expanded={!chiusa(g.category)} onClick={() => apriChiudi(g.category)}>
                    <b>{nomeCategoria(g.category)}</b>
                    <span>
                      {tt('{done} di {length}', { done: g.done, length: g.items.length })}
                      <Sv name="chev" size={16} className={cx('chv', !chiusa(g.category) && 'up')} />
                    </span>
                  </button>
                ) : (
                  // categoria creata a mano: il menu ⋯ (Modifica, Elimina) sulla stessa riga, prima di «0 di 2» e della freccia.
                  // Il ⋯ non può stare dentro il pulsante che apre e chiude: il pulsante è il titolo e la sua area (::after) copre tutta la riga.
                  <div className="grp gp">
                    <button type="button" className="gtog" aria-expanded={!chiusa(g.category)} onClick={() => apriChiudi(g.category)}>
                      <b>{nomeCategoria(g.category)}</b>
                      <span className="sr-only">{tt('{done} di {length}', { done: g.done, length: g.items.length })}</span>
                    </button>
                    <span className="gr">
                      <span className="gdots">
                        <MenuAzioni
                          label={tt('Azioni sulla categoria {label}', { label: g.category })}
                          azioni={[
                            { id: 'modifica', label: tt('Modifica'), onPress: () => setCatSheet(g) },
                            { id: 'elimina', label: tt('Elimina'), onPress: () => void eliminaCategoria(g) },
                          ]}
                        />
                      </span>
                      <span aria-hidden="true">{tt('{done} di {length}', { done: g.done, length: g.items.length })}</span>
                      <Sv name="chev" size={16} className={cx('chv', !chiusa(g.category) && 'up')} />
                    </span>
                  </div>
                )}
                {chiusa(g.category) ? null : <ul className="l">{g.items.map((i) => riga(i))}</ul>}
              </section>
            ))}
          </Affianca>
          {!selecting && !vuota && altri.length > 0 ? (
            <Pulsante color="secondary" iconLeading="copy" onPress={() => setDup(true)}>
              {tt('Duplica da un viaggio')}
            </Pulsante>
          ) : null}
        </div>
      )}
    </Schermata>
  )
}
