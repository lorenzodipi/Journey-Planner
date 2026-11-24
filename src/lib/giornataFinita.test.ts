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
  it('passata un\'ora dall\'ultima tappa con orario, senza tappe senza orario aperte: finita', () => {
    const items = [{ time: '12:00', endTime: '13:30', status: 'todo' as const }, { time: undefined, status: 'done' as const }]
    expect(giornataFinita(items, ora(14, 0))).toBe(false)
    expect(giornataFinita(items, ora(14, 31))).toBe(true)
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
