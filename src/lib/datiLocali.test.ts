import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHIAVI_DA_TENERE, cancellaDatiLocali, chiaviDaCancellare } from './datiLocali'

describe('chiaviDaCancellare', () => {
  it('prende le chiavi dell’app e della sessione, e lascia l’aspetto dell’app', () => {
    const chiavi = ['jp.cache.v1', 'jp.outbox.v1', 'jp.nomeProfilo', 'jp.lastUid', 'jp.notif.budget.abc', 'jp.placePhoto.v1.Roma', 'sb-xyz-auth-token', 'jp.theme.v1', 'jp.formati.v1', 'jp.mapStyle', 'altra-app', 'theme']
    expect(chiaviDaCancellare(chiavi)).toEqual(['jp.cache.v1', 'jp.outbox.v1', 'jp.nomeProfilo', 'jp.lastUid', 'jp.notif.budget.abc', 'jp.placePhoto.v1.Roma', 'sb-xyz-auth-token'])
  })
  it('una chiave nuova dell’app viene cancellata senza modificare l’elenco', () => {
    expect(chiaviDaCancellare(['jp.cosaNuova.v9'])).toEqual(['jp.cosaNuova.v9'])
  })
})

/** Deposito finto in memoria (i test girano in node, senza localStorage). */
function deposito(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  }
}

describe('cancellaDatiLocali', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', deposito())
    vi.stubGlobal('sessionStorage', deposito())
  })
  it('toglie i dati dell’account e tiene solo l’aspetto', () => {
    for (const k of ['jp.cache.v1', 'jp.activeTrip', 'jp.outbox.v1', 'jp.nomeProfilo', 'jp.lastUid', 'jp.routes.v1', 'jp.weather.v1', 'jp.doc.offline.v1', 'jp.filekey.v1', 'jp.notif.v1', 'jp.riferimento.v1', 'sb-prova-auth-token']) localStorage.setItem(k, 'x')
    for (const k of CHIAVI_DA_TENERE) localStorage.setItem(k, 'tieni')
    localStorage.setItem('altra-app', 'non mia')
    sessionStorage.setItem('qualcosa', '1')
    cancellaDatiLocali()
    const resto = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).sort()
    expect(resto).toEqual([...CHIAVI_DA_TENERE, 'altra-app'].sort())
    expect(sessionStorage.length).toBe(0)
  })
  it('si può chiamare più volte e senza dati', () => {
    expect(() => (cancellaDatiLocali(), cancellaDatiLocali())).not.toThrow()
  })
})
