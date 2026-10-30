import { useEffect, useState } from 'react'
import type { Place } from '../types'
import { PlaceDisc } from './PlaceDisc'
import { usePlacePhoto } from './usePlacePhoto'

/**
 * Spezzone sinistro della card del luogo: l'icona della categoria, e sopra la foto (dissolvenza breve) se Wikipedia
 * ne ha una affidabile. Le dimensioni non cambiano quando la foto arriva; se non arriva o non si carica resta l'icona.
 */
export function PlacePhotoStub({ place, color, langs }: { place: Place; color: string; langs?: string[] }) {
  const photo = usePlacePhoto(place, langs)
  const [loaded, setLoaded] = useState(false)
  const [broken, setBroken] = useState(false)
  const url = photo.status === 'ready' ? photo.photo.url : null
  useEffect(() => {
    setLoaded(false)
    setBroken(false)
  }, [url])
  return (
    <>
      <PlaceDisc category={place.category} color={color} size={60} />
      {url && !broken && (
        <img
          src={url}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setBroken(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </>
  )
}
