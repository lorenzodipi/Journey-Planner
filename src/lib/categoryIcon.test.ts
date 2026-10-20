import { describe, expect, it } from 'vitest'
import { categoryIcon, PIN_ICONS, pinIconSvg, type PinIcon } from './categoryIcon'

describe('icona della categoria', () => {
  const cases: [string, PinIcon][] = [
    ['Tempio', 'temple'],
    ['Santuario', 'temple'],
    ['Cibo', 'food'],
    ['Ristorante', 'food'],
    ['Street food', 'food'],
    ['Caffè', 'cafe'],
    ['Shopping', 'shopping'],
    ['Mercato', 'shopping'],
    ['Natura', 'nature'],
    ['Parco', 'nature'],
    ['Parco divertimenti', 'fun'],
    ['Quartiere', 'district'],
    ['Punto panoramico', 'viewpoint'],
    ['Museo', 'museum'],
    ['Castello', 'castle'],
    ['Onsen', 'spa'],
    ['Alloggio', 'stay'],
    ['Casa', 'stay'],
    ['Appartamento', 'stay'],
    ['Stazione', 'train'],
    ['Treno', 'train'],
    ['Stazione dei treni', 'train'],
    ['Metro', 'train'],
    ['Aeroporto', 'airport'],
    ['Aeroporto Internazionale del Kansai', 'airport'],
    ['Autobus', 'transit'],
    ['Traghetto', 'transit'],
    ['Porto', 'transit'],
    ['Vita notturna', 'night'],
    ['Supermercato', 'grocery'],
    ['Supermercati', 'grocery'],
    ['Minimarket', 'grocery'],
    ['Benzinaio', 'fuel'],
    ['Benzinai', 'fuel'],
    ['Distributore di carburante', 'fuel'],
    ['Stazione di servizio', 'fuel'],
    ['  TEMPIO  ', 'temple'],
    ['', 'pin'],
    ['Boh', 'pin'],
  ]
  it.each(cases)('«%s» → %s', (label, icon) => expect(categoryIcon(label)).toBe(icon))

  it('senza categoria usa il segnaposto', () => {
    expect(categoryIcon(undefined)).toBe('pin')
    expect(categoryIcon(null)).toBe('pin')
  })

  it('ogni icona ha un disegno', () => {
    for (const icon of Object.keys(PIN_ICONS) as PinIcon[]) expect(pinIconSvg(icon)).toContain('<path')
  })
})
