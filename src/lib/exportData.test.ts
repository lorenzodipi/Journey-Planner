import { describe, expect, it } from 'vitest'
import { demoTrip } from '../demo/demoTrip'
import { buildExport, exportFileName, serializeExport } from './exportData'

const now = new Date('2026-11-13T10:00:00Z')

describe('esportazione', () => {
  it('contiene formato, versione e viaggi completi', () => {
    const file = buildExport([demoTrip], now)
    expect(file).toMatchObject({ format: 'journey-planner-export', version: 1, exportedAt: '2026-11-13T10:00:00.000Z' })
    const back = JSON.parse(serializeExport(file))
    expect(back.trips[0].id).toBe(demoTrip.id)
    expect(back.trips[0].days.length).toBe(demoTrip.days.length)
  })

  it('nome file: viaggio singolo o tutti', () => {
    expect(exportFileName([{ ...demoTrip, title: 'Giappone 2026 ⛩️' }], now)).toBe('journey-planner-giappone-2026-2026-11-13.json')
    expect(exportFileName([demoTrip, demoTrip], now)).toBe('journey-planner-tutti-i-viaggi-2026-11-13.json')
    expect(exportFileName([{ ...demoTrip, title: '⛩️' }], now)).toBe('journey-planner-viaggio-2026-11-13.json')
  })

  it('non contiene account, email né ruolo', () => {
    const trip = {
      ...demoTrip,
      myRole: 'owner' as const,
      travelers: demoTrip.travelers.map((t, i) => ({ ...t, userId: `uid-${i}`, email: `persona${i}@example.com` })),
    }
    const text = serializeExport(buildExport([trip], now))
    expect(text).not.toMatch(/example\.com|uid-|myRole|userId|"email"/)
    expect(JSON.parse(text).trips[0].travelers[0]).toMatchObject({ name: demoTrip.travelers[0].name })
  })
})
