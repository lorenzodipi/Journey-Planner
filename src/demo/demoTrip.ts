// Dati DEMO e fittizi: servono solo per vedere l'interfaccia prima di collegare Supabase.
// Nessun dato personale. Con Supabase configurato i dati vengono dal database.
import type { Trip } from '../types'

export const demoTrip: Trip = {
  id: 'demo',
  title: 'Giappone',
  destination: 'Giappone (anteprima demo)',
  startDate: '2026-11-22',
  endDate: '2026-11-26',
  timezone: 'Asia/Tokyo',
  theme: 'japan',
  baseCurrency: 'EUR',
  localCurrency: 'JPY',
  center: { lat: 35.6812, lng: 139.7671 },
  travelers: [
    { id: 't1', name: 'Viaggiatore 1', color: '#3d86ff' },
    { id: 't2', name: 'Viaggiatore 2', color: '#2cc48a' },
  ],
  categories: [
    { id: 'pc1', label: 'Tempio' },
    { id: 'pc2', label: 'Cibo' },
    { id: 'pc3', label: 'Alloggio' },
  ],
  expenseCategories: [
    { id: 'xc1', label: 'Cibo' },
    { id: 'xc2', label: 'Trasporti' },
    { id: 'xc3', label: 'Souvenir' },
  ],
  stays: [
    { id: 's1', name: 'Hotel Asakusa', city: 'Tokyo', checkIn: '2026-11-22', checkOut: '2026-11-26', checkInInfo: '15:00–22:00', checkOutInfo: 'entro 10:30', totalCost: 520, currency: 'EUR', breakfast: true, dinner: false, kitchen: false, booked: true, paid: true },
    { id: 's2', name: 'Ryokan Nikko', city: 'Nikko', checkIn: '2026-11-26', checkOut: '2026-11-27', totalCost: 180, currency: 'EUR', breakfast: true, dinner: true, kitchen: false, booked: false, paid: false },
  ],
  transports: [
    { id: 'tr1', from: 'Haneda', to: 'Shinjuku', mode: 'train', departAt: '2026-11-22T08:30:00.000Z', currency: 'JPY', scope: 'per_person', cost: 1300, bought: true },
    { id: 'tr2', from: 'Tokyo', to: 'Nikko', mode: 'train', departAt: '2026-11-26T00:40:00.000Z', arriveAt: '2026-11-26T02:30:00.000Z', currency: 'JPY', scope: 'per_person', cost: 2800, bought: false, refCode: 'NK-4410' },
  ],
  flights: [
    {
      id: 'f1',
      title: 'Roma → Tokyo',
      airline: 'Demo Air',
      bookingRef: 'K7QX2M',
      currency: 'EUR',
      scope: 'per_person',
      cost: 640,
      paid: false,
      legs: [
        { id: 'fl1', seq: 1, flightNumber: 'DA 101', from: 'FCO', to: 'HND', departAt: '2026-11-21T10:30:00.000Z', arriveAt: '2026-11-22T06:10:00.000Z', fromTz: 'Europe/Rome', toTz: 'Asia/Tokyo' },
      ],
    },
  ],
  fxRate: 0.0056,
  budget: [
    {
      id: 'b1',
      label: 'Cene fuori',
      category: 'Cibo',
      categoryId: 'xc1',
      amount: 300,
      currency: 'EUR',
      scope: 'total',
      shares: [
        { id: 'bs1', travelerId: 't1', paid: false },
        { id: 'bs2', travelerId: 't2', paid: false },
      ],
    },
  ],
  expenses: [
    { id: 'e1', label: 'Ramen', category: 'Cibo', categoryId: 'xc1', amount: 2400, currency: 'JPY', paidBy: 't1', spentAt: '2026-11-22T10:30:00.000Z', dayId: 'd1', shares: [{ travelerId: 't1', weight: 1 }, { travelerId: 't2', weight: 1 }] },
    { id: 'e2', label: 'Pranzo ad Asakusa', category: 'Cibo', categoryId: 'xc1', amount: 30, currency: 'EUR', paidBy: 't2', spentAt: '2026-11-23T03:30:00.000Z', dayId: 'd2', shares: [{ travelerId: 't1', weight: 1 }, { travelerId: 't2', weight: 1 }] },
    { id: 'e3', label: 'Suica', category: 'Trasporti', categoryId: 'xc2', amount: 2000, currency: 'JPY', paidBy: 't1', spentAt: '2026-11-22T08:00:00.000Z', dayId: 'd1', shares: [{ travelerId: 't1', weight: 1 }] },
  ],
  checklist: [
    { id: 'demo-ck1', kind: 'todo', text: 'Controllare il passaporto', done: true, position: 1 },
    { id: 'demo-ck2', kind: 'todo', text: 'Comprare la eSIM', done: false, position: 2 },
    { id: 'demo-ck3', kind: 'todo', text: 'Prenotare il ristorante a Kyoto', done: false, position: 3 },
    { id: 'demo-ck4', kind: 'packing', text: 'Caricatore e adattatore', done: false, position: 4 },
    { id: 'demo-ck5', kind: 'packing', text: 'Magliette', done: false, quantity: 4, quantityDone: 1, position: 5 },
  ],
  bookings: [
    { id: 'bk1', type: 'flight', title: 'Volo Roma → Tokyo', code: 'K7QX2M', keepOffline: false },
    { id: 'bk2', type: 'hotel', title: 'Soggiorno Tokyo', code: '88314502', validFrom: '2026-11-21T15:00:00.000Z', validTo: '2026-11-25T15:00:00.000Z', keepOffline: false },
    { id: 'bk3', type: 'ticket', title: 'TeamLab Planets', keepOffline: false },
  ],
  places: [
    { id: 'p1', name: 'Tempio Senso-ji', city: 'Tokyo', category: 'Tempio', categoryId: 'pc1', status: 'planned', lat: 35.7148, lng: 139.7967, note: 'Meglio al mattino presto' },
    { id: 'p2', name: 'Santuario Meiji', city: 'Tokyo', category: 'Tempio', categoryId: 'pc1', status: 'idea', lat: 35.6764, lng: 139.6993 },
    { id: 'p3', name: 'Shibuya Crossing', city: 'Tokyo', category: 'Quartiere', status: 'planned', lat: 35.6595, lng: 139.7005, note: 'Bello di sera' },
    { id: 'p4', name: 'Tokyo Tower', city: 'Tokyo', category: 'Punto panoramico', status: 'idea', lat: 35.6586, lng: 139.7454 },
    { id: 'p5', name: 'Parco Ueno', city: 'Tokyo', category: 'Natura', status: 'done', lat: 35.7156, lng: 139.7745 },
    { id: 'p6', name: 'Akihabara', city: 'Tokyo', category: 'Shopping', status: 'idea', lat: 35.6984, lng: 139.7731 },
    { id: 'p7', name: 'Santuario Toshogu', city: 'Nikko', category: 'Tempio', categoryId: 'pc1', status: 'idea', lat: 36.758, lng: 139.5987 },
    { id: 'p8', name: 'Fushimi Inari', city: 'Kyoto', category: 'Tempio', categoryId: 'pc1', status: 'idea', lat: 34.9671, lng: 135.7727 },
    { id: 'p9', name: 'Mercato Nishiki', city: 'Kyoto', category: 'Shopping', status: 'idea', lat: 35.005, lng: 135.7649 },
    { id: 'p10', name: 'Dotonbori', city: 'Osaka', category: 'Quartiere', status: 'idea', lat: 34.6687, lng: 135.5013 },
  ],
  days: [
    {
      id: 'd1',
      date: '2026-11-22',
      city: 'Tokyo',
      title: 'Arrivo',
      items: [
        { id: 'i1', time: '16:20', title: 'Atterraggio a Haneda', kind: 'flight' },
        { id: 'i2', time: '18:30', title: 'Check-in in hotel', kind: 'free' },
        { id: 'i3', time: '19:30', title: 'Cena nel quartiere', kind: 'meal' },
      ],
    },
    {
      id: 'd2',
      date: '2026-11-23',
      city: 'Tokyo',
      title: 'Asakusa e Ueno',
      items: [
        { id: 'i4', time: '08:30', title: 'Tempio Senso-ji', kind: 'visit', placeId: 'p1' },
        { id: 'i5', time: '12:30', title: 'Pranzo ad Asakusa', kind: 'meal' },
        { id: 'i6', time: '14:30', title: 'Parco Ueno', kind: 'visit', placeId: 'p5' },
      ],
    },
    {
      id: 'd3',
      date: '2026-11-24',
      city: 'Tokyo',
      title: 'Shibuya e Meiji',
      items: [
        { id: 'i7', time: '09:00', title: 'Santuario Meiji', kind: 'visit', placeId: 'p2' },
        { id: 'i8', time: '17:30', title: 'Shibuya Crossing', kind: 'visit', placeId: 'p3' },
      ],
    },
    { id: 'd4', date: '2026-11-25', city: 'Tokyo', items: [] },
    {
      id: 'd5',
      date: '2026-11-26',
      city: 'Nikko',
      title: 'Verso Nikko',
      items: [
        { id: 'i9', time: '09:40', title: 'Treno Tokyo → Nikko', kind: 'transport' },
        { id: 'i10', time: '13:00', title: 'Santuario Toshogu', kind: 'visit', placeId: 'p7' },
      ],
    },
  ],
}
