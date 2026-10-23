import { useEffect, useState } from 'preact/hooks'
import { cacheFresh, findPhoto, photoKey, readCache, writeCache, type PlacePhoto } from '../lib/placePhoto'
import type { Place } from '../types'

export type PhotoState = { status: 'loading' } | { status: 'ready'; photo: PlacePhoto } | { status: 'none' }

// una sola richiesta in volo per luogo, anche se il pin viene toccato più volte
const inflight = new Map<string, Promise<PlacePhoto | null>>()

/**
 * Foto del luogo da Wikipedia, cercata alla selezione e poi in cache (trovata o «non trovata»).
 * Offline o in errore resta `none`, senza messaggi: si vede l'icona.
 */
export function usePlacePhoto(place: Pick<Place, 'id' | 'name' | 'nameLocal' | 'lat' | 'lng'>, extraLangs: string[] = []): PhotoState {
  const key = photoKey(place)
  const langs = ['it', 'en', ...extraLangs.filter((l) => l !== 'it' && l !== 'en')]
  const [state, setState] = useState<PhotoState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    if (place.lat == null || place.lng == null) {
      setState({ status: 'none' })
      return
    }
    const cached = readCache(place.id)
    if (cached && cacheFresh(cached, key, Date.now())) {
      setState(cached.photo ? { status: 'ready', photo: cached.photo } : { status: 'none' })
      return
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setState({ status: 'none' })
      return
    }
    setState({ status: 'loading' })
    const id = `${place.id}|${key}`
    let run = inflight.get(id)
    if (!run) {
      run = findPhoto(place, langs).then((photo) => {
        writeCache(place.id, { key, at: Date.now(), photo })
        return photo
      })
      inflight.set(id, run)
      void run.then(
        () => inflight.delete(id),
        () => inflight.delete(id),
      )
    }
    run.then(
      (photo) => active && setState(photo ? { status: 'ready', photo } : { status: 'none' }),
      () => active && setState({ status: 'none' }),
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id, key, langs.join(',')])

  return state
}
