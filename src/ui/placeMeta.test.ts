import { describe, expect, it } from 'vitest'
import type { Trip } from '../types'
import { colorForCategory, themeColor } from './placeMeta'

const trip = (labels: string[]) => ({ categories: labels.map((label, i) => ({ id: `c${i}`, label })) }) as unknown as Trip

describe('colori delle categorie', () => {
  it('ogni categoria ha un colore diverso', () => {
    const labels = ['Tempio', 'Santuario', 'Cibo', 'Natura', 'Shopping', 'Quartiere', 'Museo', 'Panorama', 'Cultura', 'Boh']
    const t = trip(labels)
    const colors = labels.map((_, i) => colorForCategory(t, `c${i}`))
    expect(new Set(colors).size).toBe(labels.length)
  })

  it('Cibo è arancio e Alloggio verde', () => {
    expect(themeColor('Cibo')).toBe('#ffa23a')
    expect(themeColor('Alloggio')).toBe('#22a373')
  })

  it('una categoria sconosciuta resta senza colore', () => {
    expect(colorForCategory(trip(['Tempio']), 'nope')).toBe('#9fb0c8')
  })
})
