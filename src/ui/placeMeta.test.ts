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

  it('Supermercato e Benzinaio hanno colori propri, diversi da tutti gli altri', () => {
    expect(themeColor('Supermercato')).toBe('#98aa07')
    expect(themeColor('Benzinaio')).toBe('#b97aaa')
    const labels = ['Tempio', 'Cibo', 'Caffè', 'Shopping', 'Natura', 'Panorama', 'Quartiere', 'Museo', 'Castello', 'Onsen', 'Alloggio', 'Stazione', 'Vita notturna', 'Divertimento', 'Supermercato', 'Benzinaio']
    const t = trip(labels)
    expect(new Set(labels.map((_, i) => colorForCategory(t, `c${i}`))).size).toBe(labels.length)
  })

  it('Treno e Aeroporto hanno ciascuno il suo colore, diverso da tutti gli altri', () => {
    expect(themeColor('Treno')).toBe('#c0c8d6')
    expect(themeColor('Aeroporto')).toBe('#6cc3ff')
    const labels = ['Tempio', 'Cibo', 'Caffè', 'Shopping', 'Natura', 'Panorama', 'Quartiere', 'Museo', 'Castello', 'Onsen', 'Alloggio', 'Treno', 'Aeroporto', 'Autobus', 'Vita notturna', 'Divertimento', 'Supermercato', 'Benzinaio']
    const t = trip(labels)
    expect(new Set(labels.map((_, i) => colorForCategory(t, `c${i}`))).size).toBe(labels.length)
  })

  it('una categoria sconosciuta resta senza colore', () => {
    expect(colorForCategory(trip(['Tempio']), 'nope')).toBe('#9fb0c8')
  })
})
