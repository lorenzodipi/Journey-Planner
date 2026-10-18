import { describe, expect, it } from 'vitest'
import type { Trip } from '../types'
import { buildExport, serializeExport } from './exportData'
import { buildSteps, parseExport, summarizeTrip, tripRow } from './restore'

const trip: Trip = {
  id: 'trip-old',
  title: 'Giappone 2026',
  destination: 'Giappone',
  startDate: '2026-11-21',
  endDate: '2026-11-23',
  timezone: 'Asia/Tokyo',
  theme: 'japan',
  baseCurrency: 'EUR',
  localCurrency: 'JPY',
  center: { lat: 35.68, lng: 139.76 },
  fxRate: 0.0056,
  travelers: [
    { id: 'tr1', name: 'Lorenzo', color: '#c8402f', position: 1000 },
    { id: 'tr2', name: 'Gaia', color: '#264653', position: 2000 },
  ],
  categories: [{ id: 'c1', label: 'Tempio', color: '#aa0000' }],
  expenseCategories: [{ id: 'xc1', label: 'Cibo', color: '#aa5500' }],
  places: [
    { id: 'p1', name: 'Senso-ji', city: 'Tokyo', category: 'Tempio', categoryId: 'c1', status: 'planned', lat: 35.71, lng: 139.79, estCost: 500, currency: 'JPY' },
    { id: 'p2', name: 'Ramen Ichiran', city: 'Tokyo', category: 'Cibo', status: 'idea', lat: null, lng: null },
  ],
  days: [
    {
      id: 'd1',
      date: '2026-11-21',
      city: 'Tokyo',
      items: [
        { id: 'i1', title: 'Senso-ji', kind: 'visit', placeId: 'p1', time: '09:30', position: 1000 },
        { id: 'i2', title: 'Pranzo', kind: 'meal', placeId: 'p2', time: '12:30', endTime: '13:30', done: true, position: 2000 },
      ],
    },
    { id: 'd2', date: '2026-11-22', city: 'Tokyo', title: 'Giornata libera', notes: 'Shopping', items: [] },
    { id: 'd3', date: '2026-11-23', city: 'Kyoto', items: [] },
  ],
  stays: [
    {
      id: 's1',
      name: 'Hotel Asakusa',
      city: 'Tokyo',
      checkIn: '2026-11-21',
      checkOut: '2026-11-23',
      totalCost: 320,
      currency: 'EUR',
      breakfast: true,
      dinner: true,
      kitchen: false,
      booked: true,
      paid: false,
    },
  ],
  transports: [
    {
      id: 'x1',
      from: 'Tokyo',
      to: 'Kyoto',
      mode: 'train',
      departAt: '2026-11-23T00:00:00.000Z',
      arriveAt: '2026-11-23T02:15:00.000Z',
      dayId: 'd3',
      fromLat: 35.68,
      fromLng: 139.76,
      toLat: 34.98,
      toLng: 135.76,
      cost: 14000,
      currency: 'JPY',
      scope: 'per_person',
      bought: false,
    },
  ],
  flights: [
    {
      id: 'f1',
      title: 'Andata',
      airline: 'XX',
      currency: 'EUR',
      scope: 'per_person',
      paid: true,
      legs: [
        { id: 'l2', seq: 2, from: 'DXB', to: 'HND', departAt: '2026-11-21T04:00:00.000Z', arriveAt: '2026-11-21T14:00:00.000Z', fromTz: 'Asia/Dubai', toTz: 'Asia/Tokyo' },
        { id: 'l1', seq: 1, from: 'FCO', to: 'DXB', departAt: '2026-11-20T20:00:00.000Z', arriveAt: '2026-11-21T01:00:00.000Z', fromTz: 'Europe/Rome', toTz: 'Asia/Dubai' },
      ],
    },
  ],
  budget: [
    {
      id: 'b1',
      label: 'Volo',
      category: 'Trasporti',
      amount: 800,
      currency: 'EUR',
      scope: 'per_person',
      shares: [
        { id: 'bs1', travelerId: 'tr1', paid: true },
        { id: 'bs2', travelerId: 'tr2', paid: false },
      ],
    },
  ],
  expenses: [
    {
      id: 'e1',
      label: 'Ramen',
      category: 'cibo',
      categoryId: 'xc1',
      amount: 2400,
      currency: 'JPY',
      fxRate: 0.0056,
      paidBy: 'tr1',
      spentAt: '2026-11-21T03:30:00.000Z',
      dayId: 'd1',
      shares: [
        { travelerId: 'tr1', weight: 1 },
        { travelerId: 'tr2', weight: 1 },
      ],
    },
  ],
  checklist: [
    { id: 'k1', kind: 'todo', text: 'Comprare la Suica', done: false, dueDate: '2026-11-20', position: 1000 },
    { id: 'k2', kind: 'packing', text: 'Adattatore', done: true, travelerId: 'tr2', position: 2000 },
  ],
  bookings: [
    { id: 'bk1', type: 'hotel', title: 'Hotel Asakusa', code: 'XYZ', validFrom: '2026-11-21T06:00:00.000Z', keepOffline: true, filePath: 'trip-old/doc.pdf' },
  ],
}

const exported = (t: unknown = trip) => JSON.stringify({ format: 'journey-planner-export', version: 1, exportedAt: '2026-11-13T10:00:00Z', trips: [t] })

describe('parseExport: file', () => {
  it('accetta un file esportato e rilegge tutto', () => {
    const r = parseExport(serializeExport(buildExport([trip])))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const back = r.trips[0].trip
    expect(back.title).toBe('Giappone 2026')
    expect(summarizeTrip(back)).toEqual({ days: 3, items: 2, places: 2, stays: 1, transports: 1, flights: 1, budget: 1, expenses: 1, checklist: 2, bookings: 1 })
    expect(back.stays[0].dinner).toBe(true)
    expect(back.transports[0]).toMatchObject({ fromLat: 35.68, toLng: 135.76, dayId: 'd3' })
    expect(back.fxRate).toBe(0.0056)
  })

  it('rifiuta file non validi con un messaggio chiaro', () => {
    expect(parseExport('non json')).toEqual({ ok: false, error: 'Il file non è un JSON valido.' })
    expect(parseExport('{"a":1}')).toMatchObject({ ok: false, error: expect.stringContaining('non è un file esportato') })
    expect(parseExport('[]')).toMatchObject({ ok: false })
    expect(parseExport(JSON.stringify({ format: 'journey-planner-export', version: 99, trips: [trip] }))).toMatchObject({ ok: false, error: expect.stringContaining('più recente') })
    expect(parseExport(JSON.stringify({ format: 'journey-planner-export', version: 1, trips: [] }))).toMatchObject({ ok: false, error: 'Il file non contiene viaggi.' })
  })

  it('un viaggio irrecuperabile viene saltato, gli altri restano', () => {
    const file = JSON.stringify({ format: 'journey-planner-export', version: 1, trips: [{ ...trip, endDate: '2026-11-01' }, { ...trip, id: 'altro', title: 'Islanda' }] })
    const r = parseExport(file)
    expect(r.ok && r.trips.map((t) => t.trip.title)).toEqual(['Islanda'])
    expect(r.ok && r.skipped).toEqual([{ title: 'Giappone 2026', reason: 'la data di fine è prima di quella di inizio' }])
    expect(parseExport(exported({ ...trip, title: '' }))).toMatchObject({ ok: false, error: expect.stringContaining('manca il titolo') })
  })
})

describe('parseExport: pulizia dei dati', () => {
  const run = (patch: Record<string, unknown>) => {
    const r = parseExport(exported({ ...trip, ...patch }))
    if (!r.ok) throw new Error(r.error)
    return r.trips[0]
  }

  it('scarta ciò che il database rifiuterebbe e lo segnala', () => {
    const r = run({
      stays: [{ name: 'Rovesciato', checkIn: '2026-11-23', checkOut: '2026-11-21' }, { name: '', checkIn: '2026-11-21', checkOut: '2026-11-22' }],
      expenses: [{ label: 'Senza importo', spentAt: '2026-11-21T03:30:00Z' }, { label: 'Data errata', amount: 5, spentAt: 'ieri' }],
      flights: [{ id: 'f', title: 'Volo', legs: [{ from: 'FCO', to: 'HND', departAt: '2026-11-21T10:00:00Z', arriveAt: '2026-11-21T09:00:00Z', fromTz: 'Europe/Rome', toTz: 'Asia/Tokyo' }] }],
    })
    expect(r.trip.stays).toHaveLength(0)
    expect(r.trip.expenses).toHaveLength(0)
    expect(r.trip.flights[0].legs).toHaveLength(0)
    expect(r.warnings.join('\n')).toMatch(/alloggi/)
    expect(r.warnings.join('\n')).toMatch(/spese/)
    expect(r.warnings.join('\n')).toMatch(/tratte di volo/)
  })

  it('riallinea riferimenti rotti senza perdere l\'elemento', () => {
    const r = run({
      transports: [{ from: 'A', to: 'B', dayId: 'non-esiste', fromLat: 10 }],
      expenses: [{ label: 'x', amount: 1, spentAt: '2026-11-21T03:30:00Z', paidBy: 'nessuno', dayId: 'zzz', shares: [{ travelerId: 'tr1' }, { travelerId: 'tr1' }, { travelerId: 'fantasma' }] }],
      checklist: [{ kind: 'boh', text: 'x', travelerId: 'fantasma' }],
      days: [{ id: 'd1', date: '2026-11-21', items: [{ title: 'Giro', placeId: 'perso' }] }],
    })
    expect(r.trip.transports[0]).toMatchObject({ dayId: undefined, fromLat: undefined, fromLng: undefined, mode: 'other' })
    expect(r.trip.expenses[0]).toMatchObject({ paidBy: undefined, dayId: undefined, shares: [{ travelerId: 'tr1', weight: 1 }] })
    expect(r.trip.checklist[0]).toMatchObject({ kind: 'todo', travelerId: undefined })
    expect(r.trip.days[0].items[0].placeId).toBeUndefined()
    expect(r.warnings.join('\n')).toMatch(/luoghi che non esistono/)
  })

  it('completa i giorni mancanti e non duplica le date', () => {
    const r = run({ days: [{ id: 'd1', date: '2026-11-21', items: [] }, { id: 'dup', date: '2026-11-21', items: [] }, { id: 'x', date: 'sbagliata', items: [] }] })
    expect(r.trip.days.map((d) => d.date)).toEqual(['2026-11-21', '2026-11-22', '2026-11-23'])
  })

  it('rinumera le tratte di volo e ordina per numero', () => {
    const legs = parseExport(exported()).ok && (parseExport(exported()) as { ok: true; trips: { trip: Trip }[] }).trips[0].trip.flights[0].legs
    expect(legs && legs.map((l) => [l.seq, l.from])).toEqual([[1, 'FCO'], [2, 'DXB']])
  })

  it('valute, fuso, tema e coordinate non valide ricevono valori sicuri', () => {
    const r = run({ timezone: 'Marte/Olympus', theme: 'neon', baseCurrency: 'euro', center: { lat: 999, lng: 0 }, localCurrency: 'x', fxRate: -3 })
    expect(r.trip).toMatchObject({ timezone: 'UTC', theme: 'default', baseCurrency: 'EUR', localCurrency: undefined, fxRate: undefined })
    expect(r.trip.center.lat).toBeCloseTo(41.9, 0)
    expect(r.warnings.join('\n')).toMatch(/Fuso orario/)
  })

  it('gli allegati PDF non vengono ripristinati e se ne avvisa', () => {
    const r = run({})
    expect(r.trip.bookings[0].filePath).toBeUndefined()
    expect(r.trip.bookings[0]).toMatchObject({ keepOffline: false, code: 'XYZ' })
    expect(r.warnings.join('\n')).toMatch(/allegato PDF/)
  })

  it('luoghi con coordinate fuori scala restano, ma senza posizione', () => {
    const r = run({ places: [{ id: 'p', name: 'Dove?', lat: 200, lng: 10, status: 'boh' }] })
    expect(r.trip.places[0]).toMatchObject({ lat: null, lng: null, status: 'idea' })
  })
})

describe('buildSteps', () => {
  const parsed = parseExport(exported())
  if (!parsed.ok) throw new Error(parsed.error)
  let n = 0
  const steps = buildSteps(parsed.trips[0].trip, 'TRIP', () => `id-${++n}`)
  const rows = (table: string) => steps.find((s) => s.table === table)?.rows ?? []
  const ids = (table: string) => new Set(rows(table).map((r) => r.id))

  it('inserisce le tabelle nell\'ordine delle dipendenze', () => {
    const order = steps.map((s) => s.table)
    const before = (a: string, b: string) => expect(order.indexOf(a)).toBeLessThan(order.indexOf(b))
    before('trip_travelers', 'budget_item_shares')
    before('trip_travelers', 'expenses')
    before('days', 'day_items')
    before('categories', 'places')
    before('places', 'day_items')
    before('flights', 'flight_legs')
    before('budget_items', 'budget_item_shares')
    before('expenses', 'expense_shares')
  })

  it('ogni riga appartiene al nuovo viaggio e ha un id nuovo e unico', () => {
    const all = steps.flatMap((s) => s.rows)
    expect(all.every((r) => r.trip_id === 'TRIP')).toBe(true)
    const allIds = all.map((r) => r.id)
    expect(new Set(allIds).size).toBe(allIds.length)
    expect(allIds.some((i) => ['d1', 'p1', 'tr1', 'f1'].includes(String(i)))).toBe(false)
  })

  it('i riferimenti puntano alle nuove righe', () => {
    expect(rows('day_items').every((r) => ids('days').has(r.day_id))).toBe(true)
    expect(rows('day_items').filter((r) => r.place_id).every((r) => ids('places').has(r.place_id))).toBe(true)
    expect(rows('places').every((r) => r.category_id === null || ids('categories').has(r.category_id))).toBe(true)
    expect(rows('flight_legs').every((r) => ids('flights').has(r.flight_id))).toBe(true)
    expect(rows('budget_item_shares').every((r) => ids('budget_items').has(r.budget_item_id) && ids('trip_travelers').has(r.traveler_id))).toBe(true)
    expect(rows('expense_shares').every((r) => ids('expenses').has(r.expense_id) && ids('trip_travelers').has(r.traveler_id))).toBe(true)
    expect(rows('expenses')[0]).toMatchObject({ paid_by: expect.stringMatching(/^id-/), day_id: expect.stringMatching(/^id-/) })
    expect(rows('transports')[0].day_id).toBe(rows('days').find((d) => d.date === '2026-11-23')?.id)
    expect(rows('checklist_items').find((c) => c.text === 'Adattatore')?.traveler_id).toBe(rows('trip_travelers').find((t) => t.name === 'Gaia')?.id)
  })

  it('le categorie di spesa si ricollegano alle spese e alle voci (anche se citate solo per nome)', () => {
    const cats = rows('expense_categories')
    expect(cats.map((c) => c.label).sort()).toEqual(['Cibo', 'Trasporti'])
    expect(rows('expenses')[0].category_id).toBe(cats.find((c) => c.label === 'Cibo')?.id)
    expect(rows('budget_items')[0].category_id).toBe(cats.find((c) => c.label === 'Trasporti')?.id)
    expect('category' in rows('expenses')[0]).toBe(false) // il testo libero non si scrive più
  })

  it('senza categorie di spesa nel file, le colonne nuove non si scrivono (database senza la 0008)', () => {
    const plain = parseExport(exported({ ...trip, expenseCategories: [], budget: [], expenses: [{ ...trip.expenses[0], category: undefined, categoryId: undefined }] }))
    if (!plain.ok) throw new Error(plain.error)
    const steps2 = buildSteps(plain.trips[0].trip, 'T', () => crypto.randomUUID())
    expect(steps2.some((x) => x.table === 'expense_categories')).toBe(false)
    expect(steps2.find((x) => x.table === 'expenses')?.rows.every((r) => !('category_id' in r))).toBe(true)
  })

  it('le etichette dei luoghi senza categoria nel file diventano categorie', () => {
    expect(rows('categories').map((c) => c.label).sort()).toEqual(['Cibo', 'Tempio'])
    const ramen = rows('places').find((p) => p.name === 'Ramen Ichiran')
    expect(ramen?.category_id).toBe(rows('categories').find((c) => c.label === 'Cibo')?.id)
  })

  it('porta con sé i campi nuovi: cena, posizioni dei trasporti, cambio', () => {
    expect(rows('stays')[0]).toMatchObject({ dinner: true, breakfast: true, total_cost: 320 })
    expect(rows('transports')[0]).toMatchObject({ from_lat: 35.68, to_lng: 135.76, from_label: 'Tokyo' })
    expect(tripRow(parsed.trips[0].trip, '  ').fx_rate).toBe(0.0056)
    expect(rows('bookings')[0]).toMatchObject({ file_path: null, confirmation_code: 'XYZ' })
  })

  it('la quantità della checklist viaggia solo se serve', () => {
    const none = buildSteps(parsed.trips[0].trip, 'T', () => crypto.randomUUID())
    expect(none.find((x) => x.table === 'checklist_items')?.rows.every((r) => !('quantity' in r))).toBe(true)
    const withQty = parseExport(exported({ ...trip, checklist: [{ id: 'k1', kind: 'packing', text: 'Magliette', done: false, quantity: 3, position: 1 }, { id: 'k2', kind: 'packing', text: 'Passaporto', done: false, quantity: 1, position: 2 }, { id: 'k3', kind: 'packing', text: 'Zaino', done: false, quantity: 'x', position: 3 }] }))
    if (!withQty.ok) throw new Error(withQty.error)
    expect(withQty.trips[0].trip.checklist.map((c) => c.quantity)).toEqual([3, undefined, undefined])
    const rows = buildSteps(withQty.trips[0].trip, 'T', () => crypto.randomUUID()).find((x) => x.table === 'trip_travelers' ? false : x.table === 'checklist_items')?.rows ?? []
    expect(rows.map((r) => r.quantity)).toEqual([3, null, null])
  })

  it('i pezzi già a posto si ripristinano solo se parziali', () => {
    const f = parseExport(exported({ ...trip, checklist: [
      { id: 'k1', kind: 'packing', text: 'Magliette', done: false, quantity: 10, quantityDone: 8, position: 1 },
      { id: 'k2', kind: 'packing', text: 'Calzini', done: true, quantity: 5, quantityDone: 2, position: 2 },
      { id: 'k3', kind: 'packing', text: 'Zaino', done: false, quantityDone: 4, position: 3 },
      { id: 'k4', kind: 'packing', text: 'Guanti', done: false, quantity: 4, quantityDone: 40, position: 4 },
    ] }))
    if (!f.ok) throw new Error(f.error)
    expect(f.trips[0].trip.checklist.map((c) => c.quantityDone)).toEqual([8, undefined, undefined, 3])
    const rows = buildSteps(f.trips[0].trip, 'T', () => crypto.randomUUID()).find((x) => x.table === 'checklist_items')?.rows ?? []
    expect(rows.map((r) => r.quantity_done)).toEqual([8, null, null, 3])
  })

  it('tripRow usa il titolo scelto, altrimenti quello del file', () => {
    expect(tripRow(parsed.trips[0].trip, 'Giappone (ripristino)').title).toBe('Giappone (ripristino)')
    expect(tripRow(parsed.trips[0].trip, '   ').title).toBe('Giappone 2026')
  })

  it('le tabelle vuote non producono inserimenti', () => {
    const empty = parseExport(exported({ ...trip, stays: [], flights: [], bookings: [] }))
    if (!empty.ok) throw new Error(empty.error)
    const tables = buildSteps(empty.trips[0].trip, 'T', () => crypto.randomUUID()).map((s) => s.table)
    expect(tables).not.toContain('stays')
    expect(tables).not.toContain('flight_legs')
    expect(tables).toContain('days')
  })
})
