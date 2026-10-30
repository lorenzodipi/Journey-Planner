import { describe, expect, it } from 'vitest'
import * as v from './inviti'

const now = new Date('2026-11-01T12:00:00Z')
const inv = (email: string, status: 'inviato' | 'accettato' | 'rifiutato' | 'scaduto', expiresAt = '2026-11-05T00:00:00Z', createdAt = '2026-10-29T00:00:00Z') => ({ id: email, email, status, createdAt, expiresAt })

describe('inviti', () => {
  it('un invito aperto dopo la scadenza è scaduto', () => {
    expect(v.statoInvito(inv('a@b.it', 'inviato', '2026-10-31T00:00:00Z'), now)).toBe('scaduto')
    expect(v.statoInvito(inv('a@b.it', 'inviato'), now)).toBe('inviato')
    expect(v.statoInvito(inv('a@b.it', 'rifiutato', '2026-10-31T00:00:00Z'), now)).toBe('rifiutato')
  })
  it('validazione: formato, già partecipante, già invitato', () => {
    const trip = { travelers: [{ id: '1', name: 'A', color: '', email: 'Anna@x.it' }], invites: [inv('b@x.it', 'inviato'), inv('c@x.it', 'scaduto')] } as never
    expect(v.erroreInvito('boh', trip, now)).toMatch(/valido/)
    expect(v.erroreInvito('anna@x.it', trip, now)).toMatch(/già nel viaggio/)
    expect(v.erroreInvito(' B@x.it ', trip, now)).toMatch(/già invitato/)
    expect(v.erroreInvito('c@x.it', trip, now)).toBeNull() // l'invito scaduto non blocca
    expect(v.erroreInvito('d@x.it', trip, now)).toBeNull()
  })
  it('riepilogo e inviti visibili', () => {
    const trip = { travelers: [{}, {}] as never, invites: [inv('x@x.it', 'accettato'), inv('b@x.it', 'rifiutato', '2026-11-05T00:00:00Z', '2026-10-30T00:00:00Z'), inv('c@x.it', 'inviato')] } as never
    expect(v.riepilogoPartecipanti(trip, now)).toBe('2 persone · 1 invito in attesa')
    expect(v.invitiVisibili(trip, now).map((i) => i.email)).toEqual(['c@x.it', 'b@x.it'])
  })
  it('scadenza e ruolo', () => {
    expect(v.scadenzaTesto('2026-11-04T12:00:00Z', now)).toBe('Scade tra 3 giorni')
    expect(v.scadenzaTesto('2026-11-02T12:00:00Z', now)).toBe('Scade domani')
    expect(v.ruoloTesto({ role: 'owner' })).toBe('Creatore')
    expect(v.ruoloTesto({ role: 'viewer' })).toBe('Partecipante')
  })
})
