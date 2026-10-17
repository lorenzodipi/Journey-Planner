import { describe, expect, it } from 'vitest'
import { categoryIcon, PIN_ICON_PATHS, pinIconSvg, type PinIcon } from './categoryIcon'

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
    ['Stazione', 'transit'],
    ['Vita notturna', 'night'],
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
    for (const icon of Object.keys(PIN_ICON_PATHS) as PinIcon[]) expect(pinIconSvg(icon)).toContain('<path d="M')
  })
})
