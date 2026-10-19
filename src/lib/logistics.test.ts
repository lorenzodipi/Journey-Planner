import { describe, expect, it } from 'vitest'
import { layover, legDuration, totalTravelTime } from './flights'
import { legColumns, legToForm, mapFlights, mapTransports, newestFirst, stayColumns, transportColumns, transportToForm, transportWhen, whenKey, type FlightLegRow, type LegInput } from './logistics'

const leg = (over: Partial<LegInput>): LegInput => ({
  flightNumber: '', from: 'MXP', to: 'PEK', departDate: '2026-11-21', departTime: '12:30',
  arriveDate: '2026-11-22', arriveTime: '05:35', fromTz: 'Europe/Rome', toTz: 'Asia/Shanghai',
  cabin: '', seats: '', notes: '', ...over,
})

describe('voli: tratte e scali', () => {
  const outbound = [
    leg({}),
    leg({ from: 'PEK', to: 'HND', departDate: '2026-11-22', departTime: '11:45', arriveDate: '2026-11-22', arriveTime: '16:20', fromTz: 'Asia/Shanghai', toTz: 'Asia/Tokyo' }),
  ]

  it('durata del primo volo = 10h05 anche con fusi diversi', () => {
    const [a] = legColumns(outbound)
    expect(legDuration({ depart: a.depart_at, arrive: a.arrive_at })).toBe(10 * 60 + 5)
  })

  it('scalo a Pechino = 6h10 e secondo volo 3h35', () => {
    const [a, b] = legColumns(outbound)
    expect(layover({ depart: a.depart_at, arrive: a.arrive_at }, { depart: b.depart_at, arrive: b.arrive_at })).toBe(6 * 60 + 10)
    expect(legDuration({ depart: b.depart_at, arrive: b.arrive_at })).toBe(3 * 60 + 35)
  })

  it('tempo totale andata = 19h50', () => {
    const cols = legColumns(outbound)
    expect(totalTravelTime(cols.map((c) => ({ depart: c.depart_at, arrive: c.arrive_at })))).toBe(19 * 60 + 50)
  })

  it('ritorno: KIX 16:30 → PVG 18:20 = 2h50, scalo 7h10, PVG 01:30 → MXP 07:15 = 12h45', () => {
    const ret = legColumns([
      leg({ from: 'PVG', to: 'MXP', departDate: '2026-12-09', departTime: '01:30', arriveDate: '2026-12-09', arriveTime: '07:15', fromTz: 'Asia/Shanghai', toTz: 'Europe/Rome' }),
      leg({ from: 'KIX', to: 'PVG', departDate: '2026-12-08', departTime: '16:30', arriveDate: '2026-12-08', arriveTime: '18:20', fromTz: 'Asia/Tokyo', toTz: 'Asia/Shanghai' }),
    ])
    expect(ret.map((r) => r.from_airport)).toEqual(['KIX', 'PVG']) // ordinate per partenza
    expect(ret.map((r) => r.seq)).toEqual([1, 2])
    const t = ret.map((c) => ({ depart: c.depart_at, arrive: c.arrive_at }))
    expect(legDuration(t[0])).toBe(2 * 60 + 50)
    expect(layover(t[0], t[1])).toBe(7 * 60 + 10)
    expect(legDuration(t[1])).toBe(12 * 60 + 45)
  })

  it('i codici aeroporto vanno in maiuscolo e si può tornare al modulo', () => {
    const [c] = legColumns([leg({ from: 'mxp', to: 'pek' })])
    expect(c.from_airport).toBe('MXP')
    const back = legToForm({
      id: 'x', seq: 1, from: 'MXP', to: 'PEK', departAt: c.depart_at, arriveAt: c.arrive_at,
      fromTz: 'Europe/Rome', toTz: 'Asia/Shanghai',
    })
    expect(back).toMatchObject({ departDate: '2026-11-21', departTime: '12:30', arriveDate: '2026-11-22', arriveTime: '05:35' })
  })

  it('mapFlights raggruppa e ordina le tratte', () => {
    const base = { trip_id: 't', flight_id: 'f', from_tz: 'UTC', to_tz: 'UTC', flight_number: null, cabin: null, seats: null, notes: null }
    const legs: FlightLegRow[] = [
      { ...base, id: 'b', seq: 2, from_airport: 'PEK', to_airport: 'HND', depart_at: '2026-11-22T03:45:00Z', arrive_at: '2026-11-22T07:20:00Z' },
      { ...base, id: 'a', seq: 1, from_airport: 'MXP', to_airport: 'PEK', depart_at: '2026-11-21T11:30:00Z', arrive_at: '2026-11-21T21:35:00Z' },
    ]
    const [f] = mapFlights([{ id: 'f', trip_id: 't', title: 'Andata', airline: null, booking_ref: null, cost: '623.00', currency: 'EUR ', scope: 'per_person', paid: false, notes: null }], legs, 't')
    expect(f.legs.map((l) => l.id)).toEqual(['a', 'b'])
    expect(f.cost).toBe(623)
    expect(f.currency).toBe('EUR')
  })
})

describe('trasporti', () => {
  const days = [{ id: 'd1', date: '2026-11-26' }, { id: 'd2', date: '2026-11-27' }]
  const base = {
    from: 'Tokyo', to: 'Nikko', mode: 'train' as const, departDate: '2026-11-26', departTime: '09:00',
    arriveDate: '2026-11-26', arriveTime: '11:00', cost: 30, currency: 'eur', scope: 'per_person' as const,
    bought: false, refCode: '', notes: '', fromPos: null, toPos: null,
  }

  it('orari nel fuso del viaggio e giorno ricavato dalla data', () => {
    const c = transportColumns(base, 'Asia/Tokyo', days)
    expect(c.depart_at).toBe('2026-11-26T00:00:00.000Z')
    expect(c.arrive_at).toBe('2026-11-26T02:00:00.000Z')
    expect(c.day_id).toBe('d1')
    expect(c.currency).toBe('EUR')
    expect(c.ref_code).toBeNull()
  })

  it('senza orari non perde le date: restano in colonne a parte', () => {
    const c = transportColumns({ ...base, departTime: '', arriveDate: '2026-11-27', arriveTime: '', departDate: '2026-12-31' }, 'Asia/Tokyo', days)
    expect(c.depart_at).toBeNull()
    expect(c.arrive_at).toBeNull()
    expect(c.depart_date).toBe('2026-12-31')
    expect(c.arrive_date).toBe('2026-11-27')
    expect(c.day_id).toBeNull() // la data non è di un giorno del viaggio
  })

  it('con l’orario la data sta nell’istante e le colonne delle date restano vuote', () => {
    const c = transportColumns(base, 'Asia/Tokyo', days)
    expect(c.depart_date).toBeNull()
    expect(c.arrive_date).toBeNull()
  })

  it('la data d’arrivo uguale a quella di partenza, senza orario, non si salva (la propone già il modulo)', () => {
    const c = transportColumns({ ...base, departTime: '08:00', arriveTime: '' }, 'Asia/Tokyo', days)
    expect(c.arrive_date).toBeNull()
  })

  it('una data senza orario torna nel modulo (andata e ritorno di un salvataggio)', () => {
    const row = { id: 'x', trip_id: 't', day_id: null, from_label: 'a', to_label: 'b', mode: 'train' as const, cost: null, currency: 'EUR', scope: 'per_person' as const, bought: false, ref_code: null, notes: null }
    const c = transportColumns({ ...base, departTime: '', arriveDate: '2026-11-27', arriveTime: '' }, 'Asia/Tokyo', days)
    const [t] = mapTransports([{ ...row, depart_at: c.depart_at, arrive_at: c.arrive_at, depart_date: c.depart_date, arrive_date: c.arrive_date, day_id: c.day_id }], 't')
    expect(transportToForm(t, 'Asia/Tokyo', days)).toEqual({ departDate: '2026-11-26', departTime: '', arriveDate: '2026-11-27', arriveTime: '' })
  })

  it('un vecchio trasporto senza orario recupera la data dal giorno a cui è legato', () => {
    expect(transportWhen({ dayId: 'd2' }, 'Asia/Tokyo', days).depart).toEqual({ date: '2026-11-27', time: '' })
    expect(transportWhen({}, 'Asia/Tokyo', days).depart).toBeNull()
  })

  it('ordina dal più recente al meno recente, i senza data in fondo', () => {
    const list = [
      { n: 'senza data', k: '' },
      { n: 'vecchio', k: '2026-11-21T09:00' },
      { n: 'solo data', k: whenKey({ date: '2026-11-26', time: '' }) },
      { n: 'recente', k: '2026-11-26T18:30' },
    ]
    expect(newestFirst(list, (x) => x.k).map((x) => x.n)).toEqual(['recente', 'solo data', 'vecchio', 'senza data'])
  })

  it('riporta l’istante nel modulo', () => {
    expect(transportToForm({ id: 'x', from: 'a', to: 'b', mode: 'train', currency: 'EUR', scope: 'per_person', bought: false, departAt: '2026-11-26T00:00:00.000Z' }, 'Asia/Tokyo')).toEqual({
      departDate: '2026-11-26', departTime: '09:00', arriveDate: '', arriveTime: '',
    })
  })
})

describe('trasporti: posizione sulla mappa', () => {
  const base = { from: 'Tokyo', to: 'Kyoto', mode: 'train' as const, departDate: '2026-11-28', departTime: '09:00', arriveDate: '2026-11-28', arriveTime: '11:30', cost: null, currency: 'JPY', scope: 'per_person' as const, bought: false, refCode: '', notes: '' }
  const days = [{ id: 'd28', date: '2026-11-28' }]
  it('salva le due posizioni, oppure null se mancano', () => {
    const withPos = transportColumns({ ...base, fromPos: { lat: 35.68, lng: 139.76 }, toPos: { lat: 34.98, lng: 135.75 } }, 'Asia/Tokyo', days)
    expect(withPos).toMatchObject({ from_lat: 35.68, from_lng: 139.76, to_lat: 34.98, to_lng: 135.75, day_id: 'd28' })
    const without = transportColumns({ ...base, fromPos: null, toPos: null }, 'Asia/Tokyo', days)
    expect(without).toMatchObject({ from_lat: null, from_lng: null, to_lat: null, to_lng: null })
  })
})

describe('alloggi', () => {
  it('pulisce i campi e normalizza la valuta', () => {
    const c = stayColumns({
      name: ' Hotel Sakura ', city: ' Tokyo ', checkIn: '2026-11-22', checkOut: '2026-11-26', checkInInfo: '', checkOutInfo: ' entro 10:30 ',
      address: '', mapsUrl: '', totalCost: 600, currency: 'jpy', breakfast: true, dinner: false, kitchen: false, booked: true, paid: false, notes: '',
    })
    expect(c).toMatchObject({ name: 'Hotel Sakura', city: 'Tokyo', check_in_info: null, check_out_info: 'entro 10:30', currency: 'JPY', total_cost: 600 })
  })

  it('salva colazione e cena separatamente', () => {
    const base = { name: 'Ryokan', city: '', checkIn: '2026-11-24', checkOut: '2026-11-25', checkInInfo: '', checkOutInfo: '', address: '', mapsUrl: '', totalCost: null, currency: 'JPY', kitchen: false, booked: true, paid: true, notes: '' }
    expect(stayColumns({ ...base, breakfast: true, dinner: true })).toMatchObject({ breakfast: true, dinner: true })
    expect(stayColumns({ ...base, breakfast: false, dinner: true })).toMatchObject({ breakfast: false, dinner: true })
  })
})
