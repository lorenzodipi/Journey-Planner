import { createContext } from 'react'
import type { ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { demoTrip } from '../demo/demoTrip'
import { useAuth } from '../lib/auth'
import { clearSnapshot, loadActiveId, loadSnapshot, saveActiveId, saveSnapshot } from '../lib/cache'
import { clearQueue, flushQueue, loadQueue, saveQueue, type Entry, type Local, type Op } from '../lib/outbox'
import { execOp } from '../lib/outboxExec'
import { countChange } from '../lib/checklist'
import { applyQueue, checklistEntry, deletedPatch, expenseEntry } from '../lib/outboxLocal'
import { showToast } from './toast'
import { planMove } from '../lib/dragOrder'
import { canSwap, changedPositions, orderItems, positionForNew, renumber } from '../lib/itemOrder'
import * as api from '../lib/tripApi'
import * as logistics from '../lib/logisticsApi'
import * as money from '../lib/moneyApi'
import * as planning from '../lib/planningApi'
import * as restore from '../lib/restoreApi'
import { syncOfflineFiles } from '../lib/bookingFiles'
import { supabase } from '../lib/supabase'
import { tripCenter } from '../lib/tzCenter'
import type { ImportPlan } from '../lib/kmzPlan'
import type { BookingInput, ChecklistInput } from '../lib/planningData'
import type { BudgetInput, ExpenseInput } from '../lib/moneyData'
import type { FlightInput, StayInput, TransportInput } from '../lib/logistics'
import type { InvitedInput, ItemInput, PlaceInput, TravelerInput, TripInput, TripPeople } from '../lib/tripApi'
import type { Booking, BudgetItem, ChecklistItem, Expense, Flight, ItemStatus, PlaceStatus, Trip, Stay, TicketCode, TicketKind } from '../types'
import { schema } from '../lib/schema'

export type TripsStatus = 'loading' | 'ready' | 'error'

/** Costo di una tappa: diventa la spesa collegata. */
export interface ItemCost {
  amount: number
  currency: string
  paidBy: string | null
  /** tra chi si divide (vuoto = tutti) */
  travelerIds: string[]
  category: string
  notes?: string
}

/** Ogni azione restituisce `null` se è andata bene, altrimenti il messaggio d'errore da mostrare. */
type Result = Promise<string | null>

/** Tempo limite del primo caricamento dei viaggi (#25). */
export const LOAD_TIMEOUT_MS = 15_000

interface TripsValue {
  status: TripsStatus
  trips: Trip[]
  active: Trip | null
  /** true se i dati mostrati vengono dalla copia locale (offline o rete assente) */
  stale: boolean
  error: string | null
  /** modifiche fatte senza rete (o non ancora partite) */
  pending: number
  /** id delle righe con modifiche non ancora inviate (voci «In attesa», #49) */
  pendingIds: ReadonlySet<string>
  /** modifiche rifiutate dal server, da scartare */
  failed: Entry[]
  dismissFailed: (id: string) => void
  setActive: (id: string) => void
  /** Ricarica tutto dal server. `true` se ci è riuscita. */
  refresh: () => Promise<boolean>
  createTrip: (input: TripInput, people: TripPeople) => Result
  updateTrip: (id: string, input: TripInput) => Result
  deleteTrip: (id: string) => Result
  /** Crea un viaggio nuovo a partire da un file esportato (e lo rende quello attivo). */
  restoreTrip: (trip: Trip, title: string) => Result
  updateDay: (id: string, patch: { city: string; title: string; notes: string }) => Result
  addTraveler: (tripId: string, input: InvitedInput) => Result
  linkTraveler: (id: string, email: string) => Result
  updateTraveler: (id: string, input: TravelerInput) => Result
  removeTraveler: (id: string) => Result
  createPlace: (tripId: string, input: PlaceInput) => Result
  updatePlace: (id: string, tripId: string, input: PlaceInput) => Result
  setPlaceStatus: (id: string, status: PlaceStatus) => Result
  setPlaceDeleted: (id: string, deleted: boolean) => Result
  /** Più luoghi insieme: una sola richiesta e un solo aggiornamento. */
  setPlacesDeleted: (ids: string[], deleted: boolean) => Result
  importPlaces: (tripId: string, plan: ImportPlan) => Promise<{ error: string | null; undo: () => Result }>
  /** Il viaggio com'è adesso (non quello dell'ultimo disegno): serve ai lavori lunghi in background. */
  getTrip: (id: string) => Trip | undefined
  /** Imposta la posizione di luoghi che non ne hanno (salta quelli che nel frattempo l'hanno ricevuta). */
  setPlacePositions: (tripId: string, updates: { id: string; name: string; lat: number; lng: number }[]) => Result
  createItem: (tripId: string, dayId: string, input: ItemInput) => Result
  updateItem: (id: string, input: ItemInput) => Result
  moveItem: (dayId: string, itemId: string, step: -1 | 1) => Result
  /** Porta una tappa al posto `to` (trascinamento): una sola richiesta, con le sole posizioni cambiate. */
  moveItemTo: (dayId: string, itemId: string, to: number) => Result
  /** Scrive posizioni già calcolate (es. «Ottimizza percorso» e il suo «Annulla»). */
  setItemPositions: (list: { id: string; position: number }[]) => Result
  setItemDone: (id: string, done: boolean) => Result
  /** Stato della tappa (#32): salva anche l'ora del cambio; «Fatta» segna il luogo collegato come visitato. */
  setItemStatus: (tripId: string, id: string, status: ItemStatus) => Result
  /** Sposta la tappa in un altro giorno; con `postpone` diventa «Rimandata» dal giorno di partenza. */
  moveItemToDay: (tripId: string, id: string, toDayId: string, postpone?: boolean) => Result
  setItemParticipants: (id: string, participants: string[]) => Result
  /** Costo della tappa = spesa collegata in Spese (#32): crea, aggiorna o (con `null`) elimina la spesa. */
  saveItemCost: (tripId: string, itemId: string, cost: ItemCost | null) => Result
  setItemDeleted: (id: string, deleted: boolean) => Result
  createStay: (tripId: string, input: StayInput) => Result
  updateStay: (id: string, input: StayInput, old?: Stay) => Result
  setStayFlag: (id: string, flag: 'booked' | 'paid', value: boolean) => Result
  setStayDeleted: (id: string, deleted: boolean) => Result
  createTransport: (tripId: string, input: TransportInput) => Result
  updateTransport: (tripId: string, id: string, input: TransportInput) => Result
  setTransportBought: (id: string, bought: boolean) => Result
  setTransportDeleted: (id: string, deleted: boolean) => Result
  createFlight: (tripId: string, input: FlightInput) => Result
  updateFlight: (tripId: string, flight: Flight, input: FlightInput) => Result
  setFlightPaid: (id: string, paid: boolean) => Result
  setFlightDeleted: (id: string, deleted: boolean) => Result
  createBudgetItem: (tripId: string, input: BudgetInput) => Result
  createExpenseCategory: (tripId: string, label: string) => Result
  renameExpenseCategory: (tripId: string, id: string, label: string) => Result
  setExpenseCategoryDeleted: (id: string, deleted: boolean) => Result
  setExpenseCategoryPlanned: (tripId: string, label: string, planned: number | null) => Result
  setTripBudgetLimit: (tripId: string, limit: number | null) => Result
  updateBudgetItem: (tripId: string, item: BudgetItem, input: BudgetInput) => Result
  setBudgetSharePaid: (shareId: string, paid: boolean) => Result
  setBudgetItemDeleted: (id: string, deleted: boolean) => Result
  createExpense: (tripId: string, input: ExpenseInput) => Result
  updateExpense: (tripId: string, expense: Expense, input: ExpenseInput) => Result
  setExpenseDeleted: (id: string, deleted: boolean) => Result
  setFxRate: (tripId: string, rate: number | null) => Result
  /** Cambio della valuta locale e delle valute extra del viaggio, insieme. */
  setFxRates: (tripId: string, rate: number | null, extra: Record<string, number>) => Result
  createChecklistItem: (tripId: string, input: ChecklistInput) => Result
  updateChecklistItem: (id: string, input: ChecklistInput) => Result
  setChecklistDone: (id: string, done: boolean) => Result
  /** Imposta quanti pezzi di una voce con quantità sono già a posto. */
  setChecklistCount: (id: string, count: number) => Result
  setChecklistDeleted: (id: string, deleted: boolean) => Result
  /** Più voci insieme: una sola richiesta. */
  setChecklistManyDeleted: (ids: string[], deleted: boolean) => Result
  addChecklistTemplate: (tripId: string) => Result
  createBooking: (tripId: string, input: BookingInput) => Result
  updateBooking: (tripId: string, booking: Booking, input: BookingInput) => Result
  setBookingDeleted: (id: string, deleted: boolean) => Result
  /** Codice del biglietto (#38): salva o sostituisce l'immagine per un passeggero. */
  saveTicketCode: (tripId: string, kind: TicketKind, refId: string, travelerId: string | null, file: File, old?: TicketCode) => Result
  removeTicketCode: (code: TicketCode) => Result
}

/** Tabelle del viaggio di cui si ascoltano le modifiche degli altri (devono avere `trip_id`, tranne `trips`). */
const WATCHED_TABLES = [
  'trips',
  'days',
  'trip_travelers',
  'places',
  'categories',
  'expense_categories',
  'day_items',
  'stays',
  'transports',
  'flights',
  'flight_legs',
  'budget_items',
  'budget_item_shares',
  'expenses',
  'expense_shares',
  'checklist_items',
  'bookings',
] as const

const DEMO_MESSAGE = 'Anteprima demo: collega Supabase per salvare le modifiche.'
const demoResult: Result = Promise.resolve(DEMO_MESSAGE)

const TripsContext = createContext<TripsValue | null>(null)

export function TripProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const demo = auth.status === 'demo'
  // con i dati salvati (servizio irraggiungibile) si lavora come da dentro: le modifiche restano in coda
  const signedIn = auth.status === 'signed-in' || auth.status === 'saved'

  const [serverTrips, setTrips] = useState<Trip[]>(demo ? [demoTrip] : [])
  const [queue, setQueueState] = useState<Entry[]>(() => (demo ? [] : loadQueue()))
  const queueRef = useRef<Entry[]>(queue)
  const tripsRef = useRef<Trip[]>([])
  const flushing = useRef(false)
  // le tappe di ogni giorno sono sempre nell'ordine mostrato (posizione + orario)
  const trips = useMemo(
    () => applyQueue(serverTrips, queue).map((t) => ({ ...t, center: tripCenter(t), days: t.days.map((d) => ({ ...d, items: orderItems(d.items) })) })),
    [serverTrips, queue],
  )
  const [status, setStatus] = useState<TripsStatus>(demo ? 'ready' : 'loading')
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(demo ? demoTrip.id : loadActiveId())
  const hasData = useRef(false)

  /** Ricarica dal server (tutto, o solo i gruppi indicati). `true` se ci è riuscita. */
  const load = useCallback(async (only?: api.Scope[]): Promise<boolean> => {
    if (demo) return false
    try {
      // senza dati sul telefono non si aspetta all'infinito (#25): dopo il tempo limite compare l'errore
      let timer: ReturnType<typeof setTimeout> | undefined
      const limit = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), hasData.current ? 30_000 : LOAD_TIMEOUT_MS)
      })
      const fresh = await Promise.race([api.fetchTrips(only), limit]).finally(() => clearTimeout(timer))
      hasData.current = true
      setTrips(fresh)
      setStale(false)
      setError(null)
      setStatus('ready')
      saveSnapshot(fresh)
      if (!only || only.includes('planning')) void syncOfflineFiles(fresh) // biglietti marcati "offline" sul telefono
      return true
    } catch (e) {
      // Offline o errore: se ho una copia locale la mostro, altrimenti segnalo l'errore.
      if (hasData.current) {
        setStale(true)
      } else {
        setError(api.describeError(e))
        setStatus('error')
      }
      return false
    }
  }, [demo])

  const refresh = useCallback(() => load(), [load])

  useEffect(() => {
    if (demo) return
    if (!signedIn) {
      if (auth.status === 'signed-out') {
        // niente dati di un utente rimasti sul dispositivo dopo l'uscita
        clearSnapshot()
        clearQueue()
        queueRef.current = []
        setQueueState([])
        hasData.current = false
        api.forgetFetched()
        setTrips([])
        setActiveId(null)
        setStatus('loading')
      }
      return
    }
    const snapshot = loadSnapshot()
    if (snapshot) {
      hasData.current = true
      setTrips(snapshot.trips)
      setStale(true)
      setStatus('ready')
    }
    void flushThenRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, signedIn, auth.status, refresh])

  // Tornando online ricarico i dati
  useEffect(() => {
    if (demo || !signedIn) return
    const onOnline = () => void flushThenRefresh()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, signedIn, refresh])

  tripsRef.current = trips
  const active = useMemo(() => trips.find((t) => t.id === activeId) ?? trips[0] ?? null, [trips, activeId])

  // Modifiche di altre persone (es. Gaia) in tempo reale: Supabase avvisa quando cambia una riga del viaggio aperto
  // e si ricarica solo il gruppo di dati toccato (le raffiche, come un import, diventano un solo ricaricamento).
  // Serve la migrazione 0011 (abilita il tempo reale sulle tabelle); senza, tutto funziona come prima.
  const watchedId = active?.id
  useEffect(() => {
    if (demo || !signedIn || !supabase || !watchedId) return
    const db = supabase
    const pending = new Set<api.Scope | 'all'>()
    let timer: ReturnType<typeof setTimeout> | undefined
    let first = true
    const flushChanges = () => {
      const scopes = [...pending]
      pending.clear()
      void load(scopes.includes('all') ? undefined : (scopes as api.Scope[]))
    }
    const onChange = (table: string) => {
      const scope = table === 'trip_travelers' ? 'all' : api.scopeOfTable(table) ?? 'all' // chi ha accesso cambia: si ricarica tutto
      pending.add(scope)
      clearTimeout(timer)
      timer = setTimeout(flushChanges, 600)
    }
    let channel = db.channel(`trip-${watchedId}`)
    for (const table of WATCHED_TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: table === 'trips' ? `id=eq.${watchedId}` : `trip_id=eq.${watchedId}` }, () => onChange(table))
    }
    channel.subscribe((state) => {
      if (state !== 'SUBSCRIBED') return
      // ricollegato dopo una pausa (app in secondo piano, rete persa): potrebbe essersi perso qualcosa
      if (first) first = false
      else void load()
    })
    return () => {
      clearTimeout(timer)
      void db.removeChannel(channel)
    }
  }, [demo, signedIn, watchedId, load])

  const setActive = useCallback((id: string) => {
    setActiveId(id)
    saveActiveId(id)
  }, [])

  // ---------- coda delle modifiche offline ----------

  const commit = useCallback((next: Entry[]) => {
    queueRef.current = next
    saveQueue(next)
    setQueueState(next)
  }, [])

  /** Invia le modifiche in coda; poi ricarica i dati e toglie dalla vista quelle ormai presenti sul server. */
  const flush = useCallback(async (): Promise<void> => {
    if (demo || !signedIn || flushing.current || !navigator.onLine) return
    if (queueRef.current.length === 0) return
    flushing.current = true
    let stopped = false
    try {
      const res = await flushQueue(queueRef.current, execOp)
      stopped = res.stopped
      if (res.sent.length || res.failed.length) {
        commit(
          queueRef.current.map((e) => {
            const f = res.failed.find((x) => x.id === e.id)
            if (f) return { ...e, error: api.describeError(new Error(f.error)) }
            return res.sent.includes(e.id) ? { ...e, sent: true } : e
          }),
        )
        if (res.failed.length) showToast(`${res.failed.length === 1 ? 'Una modifica è stata rifiutata' : `${res.failed.length} modifiche sono state rifiutate`} dal server: controlla l'avviso in alto.`)
      }
      // si ricarica una volta sola, a coda svuotata, e solo i gruppi di dati toccati dalle modifiche inviate
      const more = !stopped && queueRef.current.some((e) => !e.error && !e.sent)
      const sentNow = queueRef.current.filter((e) => e.sent)
      if (!more && sentNow.length > 0 && (await load(api.scopeOfOps(sentNow.flatMap((e) => e.ops))))) commit(queueRef.current.filter((e) => !e.sent))
    } finally {
      flushing.current = false
    }
    // qualcosa è stato aggiunto mentre si inviava: riparte, a meno che la rete sia caduta
    if (!stopped && queueRef.current.some((e) => !e.error && !e.sent)) void flush()
  }, [demo, signedIn, commit, load])

  async function flushThenRefresh() {
    await flush()
    await refresh()
  }

  /** Mette una modifica in coda: si vede subito, parte appena c'è rete. Non fallisce mai per mancanza di connessione. */
  const queued = (label: string, ops: Op[], local: Local): Result => {
    if (demo) return demoResult
    commit([...queueRef.current, { id: crypto.randomUUID(), at: Date.now(), label, ops, local }])
    void flush()
    return Promise.resolve(null)
  }

  const unsent = queue.filter((e) => !e.error && !e.sent).length
  const pendingIds = useMemo(() => {
    const ids = new Set<string>()
    for (const e of queue) {
      if (e.error || e.sent) continue
      for (const op of e.ops) {
        if (op.k === 'upsert' && typeof op.row.id === 'string') ids.add(op.row.id)
        else if (op.k === 'update') ids.add(op.id)
        else if (op.k === 'updateMany') op.ids.forEach((id) => ids.add(id))
        else if (op.k === 'expenseShares') ids.add(op.expenseId)
      }
    }
    return ids
  }, [queue])
  const failed = queue.filter((e) => e.error)

  // riprova ogni tanto finché ci sono modifiche da inviare, e quando l'app torna in primo piano
  useEffect(() => {
    if (demo || !signedIn) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') void flush()
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = unsent > 0 ? setInterval(() => void flush(), 20_000) : undefined
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (timer) clearInterval(timer)
    }
  }, [demo, signedIn, unsent, flush])

  /** Esegue una scrittura, poi ricarica i dati. */
  const run = useCallback(
    async (job: () => Promise<unknown>, scope?: api.Scope[]): Result => {
      if (demo) return DEMO_MESSAGE
      try {
        // tetto di attesa anche prima della richiesta di rete (es. blocco della sessione)
        let timer: ReturnType<typeof setTimeout> | undefined
        const giveUp = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), 25_000)
        })
        try {
          await Promise.race([job(), giveUp])
        } finally {
          clearTimeout(timer)
        }
      } catch (e) {
        console.error('[journey] operazione fallita', e)
        return api.describeError(e)
      }
      await load(scope) // solo i dati toccati dalla modifica (tutto se non indicato)
      return null
    },
    [demo, load],
  )

  const value: TripsValue = {
    status,
    trips,
    active,
    stale,
    error,
    pending: unsent,
    pendingIds,
    failed,
    dismissFailed: (id) => commit(queueRef.current.filter((e) => e.id !== id)),
    setActive,
    refresh,
    createTrip: (input, people) =>
      run(async () => {
        const id = await api.createTrip(input, people)
        setActive(id)
      }),
    updateTrip: (id, input) => run(() => api.updateTrip(id, input)),
    deleteTrip: (id) => run(() => api.deleteTrip(id)),
    restoreTrip: async (trip, title) => {
      if (demo) return DEMO_MESSAGE
      try {
        const id = await restore.restoreTrip(trip, title)
        setActive(id)
      } catch (e) {
        console.error('[journey] ripristino fallito', e)
        return api.describeError(e)
      }
      await refresh()
      return null
    },
    updateDay: (id, patch) => run(() => api.updateDay(id, patch), ['trips']),
    addTraveler: (tripId, input) => run(() => api.addTraveler(tripId, input)),
    linkTraveler: (id, email) => run(() => api.linkTraveler(id, email)),
    updateTraveler: (id, input) => run(() => api.updateTraveler(id, input)),
    removeTraveler: (id) => run(() => api.removeTraveler(id)),
    createPlace: (tripId, input) =>
      run(() => api.createPlace(tripId, input, trips.find((t) => t.id === tripId)?.categories ?? []), ['places', 'categories']),
    updatePlace: (id, tripId, input) =>
      run(() =>
        api.updatePlace(
          id,
          tripId,
          input,
          trips.find((t) => t.id === tripId)?.categories ?? [],
          trips.find((t) => t.id === tripId)?.places.find((p) => p.id === id)?.name,
        ),
        ['places', 'categories', 'items'], // rinominare un luogo può aggiornare anche il titolo delle sue tappe
      ),
    setPlaceStatus: (id, status) => queued('Stato del luogo', [{ k: 'update', table: 'places', id, patch: { status } }], { t: 'place.status', id, status }),
    setPlaceDeleted: (id, deleted) => run(() => api.setPlaceDeleted(id, deleted), ['places']),
    setPlacesDeleted: (ids, deleted) => (ids.length === 0 ? Promise.resolve(null) : run(() => api.setPlacesDeleted(ids, deleted), ['places'])),
    getTrip: (id) => tripsRef.current.find((t) => t.id === id),
    setPlacePositions: (tripId, updates) => {
      const current = tripsRef.current.find((t) => t.id === tripId)?.places ?? []
      // solo luoghi che esistono ancora e non hanno già una posizione (qualcuno può averla impostata a mano nel frattempo)
      const todo = updates.filter((u) => current.some((p) => p.id === u.id && p.lat == null && p.lng == null))
      return todo.length === 0 ? Promise.resolve(null) : run(() => api.setPlacePositions(tripId, todo, current), ['places'])
    },
    importPlaces: async (tripId, plan) => {
      const trip = trips.find((t) => t.id === tripId)
      const box: { done?: api.ImportResult } = {}
      const error = await run(async () => {
        box.done = await api.importPlaces(tripId, plan, trip?.categories ?? [], trip?.places ?? [])
      }, ['places', 'categories'])
      return { error, undo: () => run(async () => (box.done ? api.undoImport(box.done) : undefined), ['places']) }
    },
    createItem: (tripId, dayId, input) => {
      const day = trips.find((t) => t.id === tripId)?.days.find((d) => d.id === dayId)
      const position = positionForNew(
        (day?.items ?? []).map((i) => ({ position: i.position ?? 0, time: i.time })),
        input.startTime || undefined,
      )
      return run(() => api.createItem(tripId, dayId, input, position), ['items'])
    },
    updateItem: (id, input) => run(() => api.updateItem(id, input), ['items']),
    moveItem: async (dayId, itemId, step) => {
      const day = trips.flatMap((t) => t.days).find((d) => d.id === dayId)
      const items = day?.items ?? []
      const index = items.findIndex((i) => i.id === itemId)
      const to = index + step
      if (index === -1 || to < 0 || to >= items.length) return null
      if (!canSwap(items[index], items[to])) return "Queste due tappe hanno orari diversi: l'ordine segue l'orario. Cambia l'orario per spostarle."
      const next = items.slice()
      ;[next[index], next[to]] = [next[to], next[index]]
      // si rinumera tutto il giorno: le posizioni salvate tornano uguali all'ordine che si vede
      // ma si scrivono solo le posizioni che cambiano davvero (di solito due)
      const changed = changedPositions(items, renumber(next))
      return changed.length === 0 ? null : run(() => api.setItemPositions(changed), ['items'])
    },
    moveItemTo: async (dayId, itemId, to) => {
      const items = trips.flatMap((t) => t.days).find((d) => d.id === dayId)?.items ?? []
      const changed = planMove(items, items.findIndex((i) => i.id === itemId), to)
      return changed ? run(() => api.setItemPositions(changed), ['items']) : null
    },
    setItemPositions: (list) => (list.length === 0 ? Promise.resolve(null) : run(() => api.setItemPositions(list), ['items'])),
    setItemStatus: async (tripId, id, status) => {
      const at = new Date().toISOString()
      const patch = schema.itemStatus ? { status, status_changed_at: at, done: status === 'done' } : { done: status === 'done' }
      if (!schema.itemStatus && status !== 'done' && status !== 'todo') return Promise.resolve(api.MIGRATION_0017)
      const err = await queued('Stato della tappa', [{ k: 'update', table: 'day_items', id, patch }], { t: 'item.status', id, status, at })
      if (err || status !== 'done') return err
      // la tappa fatta segna il luogo collegato come «Visitato»
      const trip = trips.find((t) => t.id === tripId)
      const item = trip?.days.flatMap((d) => d.items).find((i) => i.id === id)
      const place = item?.placeId ? trip?.places.find((p) => p.id === item.placeId) : undefined
      if (place && place.status !== 'done') return queued('Stato del luogo', [{ k: 'update', table: 'places', id: place.id, patch: { status: 'done' } }], { t: 'place.status', id: place.id, status: 'done' })
      return null
    },
    moveItemToDay: (tripId, id, toDayId, postpone) => {
      const trip = trips.find((t) => t.id === tripId)
      const from = trip?.days.find((d) => d.items.some((i) => i.id === id))
      const to = trip?.days.find((d) => d.id === toDayId)
      if (!trip || !from || !to) return Promise.resolve('Giorno non trovato.')
      const position = positionForNew(to.items.map((i, k) => ({ ...i, position: i.position ?? (k + 1) * 1000 })))
      return run(() => api.moveItemToDay(id, toDayId, position, postpone ? from.id : undefined), ['items'])
    },
    saveItemCost: (tripId, itemId, cost) => {
      const trip = trips.find((t) => t.id === tripId)
      if (!trip) return Promise.resolve('Viaggio non trovato.')
      const day = trip.days.find((d) => d.items.some((i) => i.id === itemId))
      const item = day?.items.find((i) => i.id === itemId)
      if (!day || !item) return Promise.resolve('Tappa non trovata.')
      const linked = trip.expenses.find((e) => e.source?.kind === 'day_item' && e.source.id === itemId)
      if (!cost) return linked ? queued('Spesa', [{ k: 'update', table: 'expenses', id: linked.id, patch: deletedPatch(true) }], { t: 'expense.deleted', id: linked.id, deleted: true }) : Promise.resolve(null)
      if (!schema.itemStatus) return Promise.resolve(api.MIGRATION_0017)
      const input: ExpenseInput = {
        label: item.title,
        category: cost.category,
        amount: cost.amount,
        currency: cost.currency,
        fxRate: null,
        paidBy: cost.paidBy,
        spentDate: day.date,
        notes: cost.notes ?? '',
        travelerIds: cost.travelerIds.length > 0 ? cost.travelerIds : trip.travelers.map((t) => t.id),
        source: { kind: 'day_item', id: itemId },
      }
      const e = expenseEntry(trip, input, linked)
      return queued(e.label, e.ops, e.local)
    },
    setItemParticipants: (id, participants) => run(() => api.setItemParticipants(id, participants), ['items']),
    setItemDone: (id, done) => queued('Tappa fatta', [{ k: 'update', table: 'day_items', id, patch: { done } }], { t: 'item.done', id, done }),
    setItemDeleted: (id, deleted) => run(() => api.setItemDeleted(id, deleted), ['items']),
    createStay: (tripId, input) => run(() => logistics.createStay(tripId, input), ['logistics']),
    updateStay: (id, input, old) => run(() => logistics.updateStay(id, input, old), ['logistics']),
    setStayFlag: (id, flag, value) => run(() => logistics.setStayFlag(id, flag, value), ['logistics']),
    setStayDeleted: (id, deleted) => run(() => logistics.setStayDeleted(id, deleted), ['logistics']),
    createTransport: (tripId, input) => {
      const trip = trips.find((x) => x.id === tripId)
      return run(() => logistics.createTransport(tripId, input, trip?.timezone ?? 'UTC', trip?.days ?? []), ['logistics'])
    },
    updateTransport: (tripId, id, input) => {
      const trip = trips.find((x) => x.id === tripId)
      return run(() => logistics.updateTransport(id, input, trip?.timezone ?? 'UTC', trip?.days ?? [], trip?.transports.find((x) => x.id === id)), ['logistics'])
    },
    setTransportBought: (id, bought) => run(() => logistics.setTransportBought(id, bought), ['logistics']),
    saveTicketCode: (tripId, kind, refId, travelerId, file, old) => run(() => planning.saveTicketCode(tripId, kind, refId, travelerId, file, old), ['planning']),
    removeTicketCode: (code) => run(() => planning.removeTicketCode(code), ['planning']),
    setTransportDeleted: (id, deleted) => run(() => logistics.setTransportDeleted(id, deleted), ['logistics']),
    createFlight: (tripId, input) => run(() => logistics.createFlight(tripId, input), ['logistics']),
    updateFlight: (tripId, flight, input) => run(() => logistics.updateFlight(flight, tripId, input), ['logistics']),
    setFlightPaid: (id, paid) => run(() => logistics.setFlightPaid(id, paid), ['logistics']),
    setFlightDeleted: (id, deleted) => run(() => logistics.setFlightDeleted(id, deleted), ['logistics']),
    createBudgetItem: (tripId, input) => run(() => money.createBudgetItem(tripId, input, trips.find((x) => x.id === tripId)?.expenseCategories ?? []), ['money', 'expenseCategories']),
    updateBudgetItem: (tripId, item, input) => run(() => money.updateBudgetItem(item, tripId, input, trips.find((x) => x.id === tripId)?.expenseCategories ?? []), ['money', 'expenseCategories']),
    createExpenseCategory: (tripId, label) => run(() => money.createExpenseCategory(tripId, label, trips.find((x) => x.id === tripId)?.expenseCategories ?? []), ['money', 'expenseCategories']),
    renameExpenseCategory: (tripId, id, label) => run(() => money.renameExpenseCategory(id, label, trips.find((x) => x.id === tripId)?.expenseCategories ?? []), ['money', 'expenseCategories']),
    setExpenseCategoryDeleted: (id, deleted) => run(() => money.setExpenseCategoryDeleted(id, deleted), ['money', 'expenseCategories']),
    setExpenseCategoryPlanned: (tripId, label, planned) => run(() => money.setExpenseCategoryPlanned(tripId, label, planned, trips.find((x) => x.id === tripId)?.expenseCategories ?? []), ['expenseCategories']),
    setTripBudgetLimit: (tripId, limit) => run(() => api.setTripBudgetLimit(tripId, limit), ['trips']),
    setBudgetSharePaid: (shareId, paid) => run(() => money.setBudgetSharePaid(shareId, paid), ['money']),
    setBudgetItemDeleted: (id, deleted) => run(() => money.setBudgetItemDeleted(id, deleted), ['money']),
    createExpense: (tripId, input) => {
      const trip = trips.find((x) => x.id === tripId)
      if (!trip) return Promise.resolve('Viaggio non trovato.')
      const e = expenseEntry(trip, input)
      return queued(e.label, e.ops, e.local)
    },
    updateExpense: (tripId, expense, input) => {
      const trip = trips.find((x) => x.id === tripId)
      if (!trip) return Promise.resolve('Viaggio non trovato.')
      const e = expenseEntry(trip, input, expense)
      return queued(e.label, e.ops, e.local)
    },
    setExpenseDeleted: (id, deleted) =>
      queued('Spesa', [{ k: 'update', table: 'expenses', id, patch: deletedPatch(deleted) }], { t: 'expense.deleted', id, deleted }),
    setFxRate: (tripId, rate) => run(() => money.setTripFxRate(tripId, rate), ['trips']),
    setFxRates: (tripId, rate, extra) => run(() => money.setTripFxRates(tripId, rate, extra), ['trips']),
    createChecklistItem: (tripId, input) => {
      const items = trips.find((x) => x.id === tripId)?.checklist.filter((c: ChecklistItem) => c.kind === input.kind) ?? []
      const position = Math.max(0, ...items.map((c) => c.position)) + 1000
      const e = checklistEntry(tripId, input, position)
      return queued(e.label, e.ops, e.local)
    },
    updateChecklistItem: (id, input) => {
      const trip = trips.find((x) => x.checklist.some((c) => c.id === id))
      const existing = trip?.checklist.find((c) => c.id === id)
      if (!trip || !existing) return Promise.resolve('Voce non trovata.')
      const e = checklistEntry(trip.id, input, existing.position, existing)
      return queued(e.label, e.ops, e.local)
    },
    setChecklistDone: (id, done) =>
      queued('Checklist', [{ k: 'update', table: 'checklist_items', id, patch: { done } }], { t: 'checklist.done', id, done }),
    setChecklistCount: (id, count) => {
      const item = trips.flatMap((x) => x.checklist).find((c) => c.id === id)
      if (!item) return Promise.resolve('Voce non trovata.')
      const c = countChange(item, count)
      return queued('Checklist', [{ k: 'update', table: 'checklist_items', id, patch: c.patch }], { t: 'checklist.count', id, count: c.count, done: c.done })
    },
    setChecklistDeleted: (id, deleted) =>
      queued('Checklist', [{ k: 'update', table: 'checklist_items', id, patch: deletedPatch(deleted) }], { t: 'checklist.deleted', id, deleted }),
    setChecklistManyDeleted: (ids, deleted) =>
      ids.length === 0
        ? Promise.resolve(null)
        : queued('Checklist', [{ k: 'updateMany', table: 'checklist_items', ids, patch: deletedPatch(deleted) }], { t: 'checklist.deletedMany', ids, deleted }),
    addChecklistTemplate: (tripId) => run(() => planning.addChecklistTemplate(tripId, trips.find((x) => x.id === tripId)?.checklist ?? []), ['planning']),
    createBooking: (tripId, input) => run(() => planning.createBooking(tripId, input, trips.find((x) => x.id === tripId)?.timezone ?? 'UTC'), ['planning']),
    updateBooking: (tripId, booking, input) =>
      run(() => planning.updateBooking(booking, tripId, input, trips.find((x) => x.id === tripId)?.timezone ?? 'UTC'), ['planning']),
    setBookingDeleted: (id, deleted) => run(() => planning.setBookingDeleted(id, deleted), ['planning']),
  }
  if (demo) {
    value.createTrip = () => demoResult
    value.updateTrip = () => demoResult
  }

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
}

export function useTrips(): TripsValue {
  const ctx = useContext(TripsContext)
  if (!ctx) throw new Error('useTrips va usato dentro TripProvider')
  return ctx
}

/** Viaggio attivo. L'App garantisce che esista prima di mostrare le pagine. */
export function useTrip(): Trip {
  const { active } = useTrips()
  return active as Trip
}
