import { describe, expect, it } from 'vitest'
import { planLegs, walkLegs, type DayStop } from './dayRoute'
import { comeCiSiMuove, impostazioniViaggio, mezzoSuggerito, modoGoogle, scegliMezzo, spostamento, tipoSuMappa } from './spostamenti'

const base = impostazioniViaggio({})
const auto = impostazioniViaggio({ moveMode: 'car' })

describe('scegliMezzo', () => {
  it('senza scelte: a piedi i tratti brevi, poi con i mezzi', () => {
    expect(scegliMezzo(800, { imp: base })).toEqual({ mezzo: 'walk', fonte: 'breve' })
    expect(scegliMezzo(5000, { imp: base })).toEqual({ mezzo: 'transit', fonte: 'viaggio' })
  })
  it('il mezzo del viaggio e la soglia', () => {
    expect(scegliMezzo(40000, { imp: auto }).mezzo).toBe('car')
    expect(scegliMezzo(800, { imp: auto }).mezzo).toBe('walk')
    expect(scegliMezzo(800, { imp: { mezzo: 'car', sogliaMin: 0 } }).mezzo).toBe('car')
    expect(scegliMezzo(40000, { imp: { mezzo: 'walk', sogliaMin: 15 } }).mezzo).toBe('walk')
  })
  it('il trasporto del giorno, poi la scelta a mano che vince su tutto', () => {
    expect(scegliMezzo(5000, { via: 'train', imp: auto })).toEqual({ mezzo: 'train', fonte: 'trasporto' })
    expect(scegliMezzo(5000, { scelto: 'bus', via: 'train', imp: auto })).toEqual({ mezzo: 'bus', fonte: 'scelto' })
    expect(scegliMezzo(300, { scelto: 'taxi', imp: base }).mezzo).toBe('taxi')
  })
})

describe('spostamento', () => {
  it('la durata scritta a mano vince sul percorso e sulla stima', () => {
    const s = spostamento(40000, { imp: auto, minuti: 50, strada: { meters: 52000, seconds: 2700 } })
    expect(s.text).toBe('In auto · 50 min')
    expect(s.manuale).toBe(true)
  })
  it('in auto usa il percorso su strada, se c’è', () => {
    const s = spostamento(40000, { imp: auto, strada: { meters: 52000, seconds: 2700 } })
    expect(s.text).toBe('In auto · 45 min')
    expect(s.meters).toBe(52000)
    expect(s.icon).toBe('g-tra-car')
  })
  it('senza percorso stima dalla linea d’aria', () => {
    expect(spostamento(40000, { imp: auto }).text).toBe('In auto · 1 h 09')
    expect(spostamento(4000, { imp: base, scelto: 'bus' }).text).toBe('In autobus · 17 min')
  })
})

describe('testi e Google Maps', () => {
  it('come ci si muove', () => {
    expect(comeCiSiMuove(['car', 'car'])).toBe('in auto')
    expect(comeCiSiMuove(['walk'])).toBe('a piedi')
    expect(comeCiSiMuove(['transit', 'walk'])).toBe('tra mezzi pubblici e a piedi')
    expect(comeCiSiMuove(['walk', 'bus'])).toBe('tra autobus e a piedi')
    expect(comeCiSiMuove(['metro', 'walk', 'bus'])).toBe('tra metro, autobus e a piedi')
    expect(comeCiSiMuove(['transit'])).toBe('con i mezzi')
  })
  it('modo di Google Maps', () => {
    expect(modoGoogle(['walk'])).toBe('walking')
    expect(modoGoogle(['car', 'walk'])).toBe('driving')
    expect(modoGoogle(['bus', 'walk'])).toBe('transit')
  })
  it('sulla mappa: a piedi e in auto lungo le strade', () => {
    expect(tipoSuMappa('walk')).toBe('walk')
    expect(tipoSuMappa('taxi')).toBe('drive')
    expect(tipoSuMappa('metro')).toBe('line')
  })
})

describe('mezzoSuggerito', () => {
  const vuoto = { destination: 'Giappone', bookings: [], transports: [] }
  it('auto in Islanda o con un noleggio', () => {
    expect(mezzoSuggerito({ ...vuoto, destination: 'Islanda' })?.mezzo).toBe('car')
    expect(mezzoSuggerito({ ...vuoto, countries: [{ id: 'c', country: 'IS', name: 'Islanda', currency: 'ISK', timezone: 'Atlantic/Reykjavik', startDate: '', endDate: '', position: 0 }] })?.perche).toBe('In Islanda non c’è la metro.')
    expect(mezzoSuggerito({ ...vuoto, bookings: [{ type: 'rental' } as never] })?.mezzo).toBe('car')
    expect(mezzoSuggerito(vuoto)).toBeNull()
  })
})

describe('mappa del giorno', () => {
  const stops: DayStop[] = [
    { id: 'a', n: 1, name: 'Þingvellir', lat: 64.2559, lng: -21.1299 },
    { id: 'b', n: 2, name: 'Geysir', lat: 64.3104, lng: -20.3024 },
  ]
  it('un tratto in auto si calcola su strada con una chiave sua', () => {
    const legs = planLegs(stops, [], (_a, _b, m) => scegliMezzo(m, { imp: auto }).mezzo)
    expect(legs[0].kind).toBe('drive')
    expect(legs[0].key.startsWith('car:')).toBe(true)
    expect(walkLegs(legs)).toHaveLength(1)
  })
  it('con i mezzi resta in linea d’aria', () => {
    const legs = planLegs(stops, [], (_a, _b, m) => scegliMezzo(m, { imp: base }).mezzo)
    expect(legs[0].kind).toBe('line')
    expect(walkLegs(legs)).toHaveLength(0)
  })
})
