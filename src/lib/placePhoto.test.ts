import { describe, expect, it } from 'vitest'
import {
  FOUND_TTL_MS,
  NONE_TTL_MS,
  cacheFresh,
  distanceM,
  findPhoto,
  isBadImage,
  normalizeTitle,
  parseWikiPages,
  photoKey,
  pickPhoto,
  readCache,
  titleMatches,
  writeCache,
  type PhotoCandidate,
} from './placePhoto'

const place = { name: 'Senso-ji', nameLocal: '浅草寺', lat: 35.7148, lng: 139.7967 }
const cand = (o: Partial<PhotoCandidate>): PhotoCandidate => ({ title: 'Sensō-ji', lat: 35.7148, lng: 139.7966, thumb: 'https://upload.wikimedia.org/x/240px-Senso.jpg', file: 'Senso.jpg', page: 'https://it.wikipedia.org/wiki/Senso-ji', ...o })

describe('normalizeTitle', () => {
  it('toglie accenti, maiuscole e punteggiatura', () => {
    expect(normalizeTitle('Sensō-ji')).toBe('senso ji')
    expect(normalizeTitle('  Café   de  l’Opéra ')).toBe('cafe de l opera')
  })
  it('lascia le lettere di altri alfabeti', () => expect(normalizeTitle('浅草寺')).toBe('浅草寺'))
})

describe('titleMatches', () => {
  it('uguale dopo la normalizzazione', () => expect(titleMatches('Sensō-ji', ['Senso-ji'])).toBe(true))
  it('uno dentro l\'altro', () => expect(titleMatches('Tempio Senso-ji', ['Senso-ji'])).toBe(true))
  it('nome locale', () => expect(titleMatches('浅草寺', ['Senso-ji', '浅草寺'])).toBe(true))
  it('quasi uguale, quasi tutte le parole', () => expect(titleMatches('Fushimi Inari-taisha', ['Fushimi Inari Shrine'])).toBe(true))
  it('un altro luogo vicino non va bene', () => {
    expect(titleMatches('Stazione di Asakusa', ['Senso-ji'])).toBe(false)
    expect(titleMatches('Tokyo Skytree', ['Tokyo Station'])).toBe(false)
  })
  it('una sigla troppo corta non basta', () => expect(titleMatches('Ramen Ichiran Shibuya', ['Ra'])).toBe(false))
  it('nome vuoto: nessuna corrispondenza', () => expect(titleMatches('Senso-ji', ['', '  '])).toBe(false))
})

describe('isBadImage', () => {
  it('scarta svg, loghi, bandiere e mappe', () => {
    expect(isBadImage('Flag_of_Japan.svg', undefined)).toBe(true)
    expect(isBadImage('Senso-ji_logo.png', undefined)).toBe(true)
    expect(isBadImage(undefined, 'https://upload.wikimedia.org/a/b/240px-Tokyo_location_map.png')).toBe(true)
    expect(isBadImage('Coat_of_arms.png', undefined)).toBe(true)
  })
  it('tiene le foto', () => expect(isBadImage('Senso-ji_2019.jpg', 'https://upload.wikimedia.org/a/b/240px-Senso-ji_2019.jpg')).toBe(false))
})

describe('pickPhoto', () => {
  it('sceglie l\'articolo compatibile', () => expect(pickPhoto([cand({})], place)?.title).toBe('Sensō-ji'))
  it('scarta quello lontano', () => expect(pickPhoto([cand({ lat: 35.73 })], place)).toBeNull())
  it('scarta il titolo che non c\'entra anche se vicinissimo', () => expect(pickPhoto([cand({ title: 'Stazione di Asakusa' })], place)).toBeNull())
  it('scarta senza miniatura o con un logo', () => {
    expect(pickPhoto([cand({ thumb: undefined })], place)).toBeNull()
    expect(pickPhoto([cand({ file: 'Logo.svg' })], place)).toBeNull()
  })
  it('tra due compatibili prende il più vicino', () => {
    const far = cand({ title: 'Senso-ji', lat: 35.7165, page: 'far' })
    const near = cand({ title: 'Sensō-ji', lat: 35.71481, page: 'near' })
    expect(pickPhoto([far, near], place)?.page).toBe('near')
  })
  it('luogo senza coordinate: niente foto', () => expect(pickPhoto([cand({})], { ...place, lat: null, lng: null })).toBeNull())
})

describe('distanceM', () => {
  it('zero sullo stesso punto, circa 111 m per 0,001° di latitudine', () => {
    expect(distanceM({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0)
    expect(distanceM({ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 })).toBeCloseTo(111.2, 0)
  })
})

describe('cache', () => {
  const key = photoKey(place)
  const photo = { url: 'u', page: 'p', title: 't' }
  it('la chiave cambia se cambiano nome o coordinate', () => {
    expect(photoKey({ ...place, name: 'Altro' })).not.toBe(key)
    expect(photoKey({ ...place, lat: 36 })).not.toBe(key)
    expect(photoKey({ ...place })).toBe(key)
  })
  it('scadenza: trovata 30 giorni, non trovata 7', () => {
    const at = 1_000_000
    expect(cacheFresh({ key, at, photo }, key, at + FOUND_TTL_MS - 1)).toBe(true)
    expect(cacheFresh({ key, at, photo }, key, at + FOUND_TTL_MS)).toBe(false)
    expect(cacheFresh({ key, at, photo: null }, key, at + NONE_TTL_MS - 1)).toBe(true)
    expect(cacheFresh({ key, at, photo: null }, key, at + NONE_TTL_MS)).toBe(false)
  })
  it('chiave diversa o voce mancante: da rifare', () => {
    expect(cacheFresh({ key: 'x', at: 0, photo }, key, 1)).toBe(false)
    expect(cacheFresh(null, key, 1)).toBe(false)
  })
  it('scrive e legge, ignora i dati rovinati e la memoria che lancia', () => {
    const mem = new Map<string, string>()
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }
    writeCache('p1', { key, at: 5, photo }, store)
    expect(readCache('p1', store)).toEqual({ key, at: 5, photo })
    mem.set('jp.placePhoto.v1.p2', '{non json')
    expect(readCache('p2', store)).toBeNull()
    mem.set('jp.placePhoto.v1.p3', JSON.stringify({ key, at: 1, photo: { url: 3 } }))
    expect(readCache('p3', store)).toBeNull()
    const bad = { getItem: () => { throw new Error('bloccata') }, setItem: () => { throw new Error('piena') } }
    expect(readCache('p1', bad)).toBeNull()
    expect(() => writeCache('p1', { key, at: 5, photo }, bad)).not.toThrow()
  })
})

describe('parseWikiPages e findPhoto', () => {
  const body = {
    query: {
      pages: {
        '1': { title: 'Sensō-ji', fullurl: 'https://it.wikipedia.org/wiki/Sens%C5%8D-ji', thumbnail: { source: 'https://upload.wikimedia.org/a/240px-Senso.jpg' }, pageimage: 'Senso.jpg', coordinates: [{ lat: 35.7148, lon: 139.7967 }] },
        '2': { title: 'Senza coordinate' },
      },
    },
  }
  it('legge gli articoli con coordinate', () => {
    const r = parseWikiPages(body, 'it')
    expect(r).toHaveLength(1)
    expect(r[0].file).toBe('Senso.jpg')
    expect(parseWikiPages(null, 'it')).toEqual([])
    expect(parseWikiPages({ query: {} }, 'it')).toEqual([])
  })
  const ok = (json: unknown) => (async () => ({ ok: true, json: async () => json }) as Response) as unknown as typeof fetch
  it('trova la foto', async () => expect((await findPhoto(place, ['it'], ok(body)))?.url).toContain('240px-Senso.jpg'))
  it('nessun articolo compatibile = null', async () => expect(await findPhoto({ ...place, name: 'Altro posto', nameLocal: undefined }, ['it'], ok(body))).toBeNull())
  it('rete assente: lancia, così non si salva «non trovata»', async () => {
    const down = (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    await expect(findPhoto(place, ['it', 'en'], down)).rejects.toThrow()
  })
  it('una lingua che fallisce non rovina le altre', async () => {
    let n = 0
    const half = (async () => (++n === 1 ? ({ ok: false, status: 500 } as Response) : ({ ok: true, json: async () => body }) as Response)) as unknown as typeof fetch
    expect(await findPhoto(place, ['it', 'en'], half)).not.toBeNull()
  })
  it('senza coordinate non chiede niente', async () => {
    const never = (async () => { throw new Error('non va chiamata') }) as unknown as typeof fetch
    expect(await findPhoto({ ...place, lat: null, lng: null }, ['it'], never)).toBeNull()
  })
})
