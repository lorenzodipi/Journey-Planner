import { describe, expect, it } from 'vitest'
import { luogoDaAlloggio, luogoEsistente } from './luogoAlloggio'
import type { Place } from '../types'

const link = 'https://www.google.com/maps/place/Hotel/@1,2,12z/data=!3d64.1350049!4d-20.2793022'
describe('luogo dell’alloggio', () => {
  it('nasce dal link di Maps, con categoria Alloggio', () => {
    expect(luogoDaAlloggio({ name: 'Hotel Sole', city: 'Flúðir', address: 'Via 1', mapsUrl: link })).toMatchObject({ name: 'Hotel Sole', category: 'Alloggio', lat: 64.1350049, lng: -20.2793022, city: 'Flúðir' })
  })
  it('senza link con posizione non crea niente', () => {
    expect(luogoDaAlloggio({ name: 'Hotel', city: '', mapsUrl: '' })).toBeNull()
    expect(luogoDaAlloggio({ name: 'Hotel', city: '', mapsUrl: 'https://maps.app.goo.gl/abc' })).toBeNull()
  })
  it('ritrova il luogo anche dopo una rinomina e non confonde altre categorie', () => {
    const p = (name: string, category: string) => ({ id: name + category, name, category }) as Place
    const list = [p('Hotel Sole', 'Cibo'), p('Hotel Sole', 'Alloggio')]
    expect(luogoEsistente(list, 'Nuovo nome', 'hotel sole')?.id).toBe('Hotel SoleAlloggio')
    expect(luogoEsistente(list, 'Altro')).toBeUndefined()
  })
})
