import { describe, expect, it } from 'vitest'
import { giornataFinita } from './oggi'

const ora = (h: number, m = 0) => h * 60 + m

describe('«Giornata finita» in Oggi', () => {
  it('le tappe senza orario ancora da fare tengono aperta la giornata (il caso del 24 novembre)', () => {
    const items = [
      { time: '12:00', endTime: '13:30', status: 'done' as const },
      { time: undefined, status: 'todo' as const },
      { time: undefined, status: 'todo' as const },
    ]
    expect(giornataFinita(items, ora(15, 10))).toBe(false)
    expect(giornataFinita(items, ora(23, 50))).toBe(false)
  })
  it('con l\'ora di fine: finita quando è passata (senza tappe senza orario aperte)', () => {
    const items = [{ time: '12:00', endTime: '13:30', status: 'todo' as const }, { time: undefined, status: 'done' as const }]
    expect(giornataFinita(items, ora(13, 29))).toBe(false)
    expect(giornataFinita(items, ora(13, 30))).toBe(true)
  })
  it('con una durata di 3 ore: non finita finché la tappa non termina', () => {
    const items = [{ time: '14:00', durationMinutes: 180, status: 'todo' as const }]
    expect(giornataFinita(items, ora(15, 30))).toBe(false)
    expect(giornataFinita(items, ora(16, 59))).toBe(false)
    expect(giornataFinita(items, ora(17, 0))).toBe(true)
  })
  it('la durata del luogo collegato vale come quella della tappa', () => {
    const items = [{ time: '14:00', placeId: 'p', status: 'todo' as const }]
    expect(giornataFinita(items, ora(16, 0), () => 150)).toBe(false)
    expect(giornataFinita(items, ora(16, 30), () => 150)).toBe(true)
  })
  it('senza durata: un\'ora dopo l\'inizio', () => {
    const items = [{ time: '14:00', status: 'todo' as const }]
    expect(giornataFinita(items, ora(14, 59))).toBe(false)
    expect(giornataFinita(items, ora(15, 0))).toBe(true)
  })
  it('tutte chiuse (fatte o saltate): finita, anche senza orari', () => {
    expect(giornataFinita([{ status: 'done' as const }, { status: 'skipped' as const }], ora(9))).toBe(true)
  })
  it('nessuna tappa: non è «finita»', () => {
    expect(giornataFinita([], ora(23))).toBe(false)
  })
  it('solo tappe senza orario da fare: mai finita durante il giorno', () => {
    expect(giornataFinita([{ status: 'todo' as const }], ora(22))).toBe(false)
  })
})
