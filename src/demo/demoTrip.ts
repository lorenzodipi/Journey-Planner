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
    { id: 't1', name: 'Viaggiatore 1', color: '#c8402f' },
    { id: 't2', name: 'Viaggiatore 2', color: '#264653' },
  ],
  categories: [],
  places: [
    { id: 'p1', name: 'Tempio Senso-ji', city: 'Tokyo', category: 'Tempio', status: 'planned', lat: 35.7148, lng: 139.7967, note: 'Meglio al mattino presto' },
    { id: 'p2', name: 'Santuario Meiji', city: 'Tokyo', category: 'Tempio', status: 'idea', lat: 35.6764, lng: 139.6993 },
    { id: 'p3', name: 'Shibuya Crossing', city: 'Tokyo', category: 'Quartiere', status: 'planned', lat: 35.6595, lng: 139.7005, note: 'Bello di sera' },
    { id: 'p4', name: 'Tokyo Tower', city: 'Tokyo', category: 'Punto panoramico', status: 'idea', lat: 35.6586, lng: 139.7454 },
    { id: 'p5', name: 'Parco Ueno', city: 'Tokyo', category: 'Natura', status: 'done', lat: 35.7156, lng: 139.7745 },
    { id: 'p6', name: 'Akihabara', city: 'Tokyo', category: 'Shopping', status: 'idea', lat: 35.6984, lng: 139.7731 },
    { id: 'p7', name: 'Santuario Toshogu', city: 'Nikko', category: 'Tempio', status: 'idea', lat: 36.758, lng: 139.5987 },
    { id: 'p8', name: 'Fushimi Inari', city: 'Kyoto', category: 'Tempio', status: 'idea', lat: 34.9671, lng: 135.7727 },
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
