import {
  AttributionControl,
  LngLatBounds,
  Map as MLMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type IControl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useRef } from 'preact/hooks'

// Questo file (e MapLibre) viene caricato solo quando serve una mappa: l'avvio dell'app resta leggero.
setWorkerUrl(workerUrl)

// Mappa vettoriale di OpenFreeMap: gratuita, senza chiave API, nitida a qualsiasi zoom.
// Le etichette sono bilingui (nome latino + nome locale, es. "Shinjuku 新宿").
const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron', // grigio pulito
  dark: 'https://tiles.openfreemap.org/styles/dark',
  detail: 'https://tiles.openfreemap.org/styles/liberty', // più colorata e dettagliata
}

type StylePref = 'auto' | 'detail'
const PREF_KEY = 'jp.mapStyle'

function loadPref(): StylePref {
  try {
    return localStorage.getItem(PREF_KEY) === 'detail' ? 'detail' : 'auto'
  } catch {
    return 'auto'
  }
}

function savePref(pref: StylePref): void {
  try {
    localStorage.setItem(PREF_KEY, pref)
  } catch {
    // ignorato
  }
}

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)')

function styleFor(pref: StylePref): string {
  if (pref === 'detail') return STYLES.detail
  return darkQuery()?.matches ? STYLES.dark : STYLES.light
}

/** Pulsante sulla mappa per passare tra stile pulito (automatico chiaro/scuro) e dettagliato. */
class StyleToggle implements IControl {
  private el = document.createElement('div')
  private button = document.createElement('button')

  constructor(
    private pref: StylePref,
    private onChange: (pref: StylePref) => void,
  ) {}

  onAdd(): HTMLElement {
    this.el.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    this.button.type = 'button'
    this.button.className = 'jp-style-toggle'
    this.button.addEventListener('click', () => {
      this.pref = this.pref === 'auto' ? 'detail' : 'auto'
      savePref(this.pref)
      this.render()
      this.onChange(this.pref)
    })
    this.el.appendChild(this.button)
    this.render()
    return this.el
  }

  onRemove(): void {
    this.el.remove()
  }

  private render() {
    const detail = this.pref === 'detail'
    this.button.textContent = detail ? 'Dettagli' : 'Pulita'
    this.button.setAttribute('aria-label', detail ? 'Mappa dettagliata: tocca per passare alla mappa pulita' : 'Mappa pulita: tocca per passare alla mappa dettagliata')
  }
}

function newMap(el: HTMLElement, center: { lat: number; lng: number }, zoom: number, withToggle: boolean): MLMap {
  let pref = loadPref()
  let current = styleFor(pref)
  const map = new MLMap({
    container: el,
    style: current,
    center: [center.lng, center.lat],
    zoom,
    maxZoom: 19,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    maxPitch: 0,
  })
  map.touchZoomRotate.disableRotation()
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
  map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

  const apply = (style: string) => {
    if (style === current) return
    current = style
    map.setStyle(style)
  }
  if (withToggle) {
    map.addControl(
      new StyleToggle(pref, (p) => {
        pref = p
        apply(styleFor(pref))
      }),
      'top-right',
    )
  }

  // se il telefono cambia tema mentre la mappa è aperta
  const query = darkQuery()
  const onScheme = () => apply(styleFor(pref))
  query?.addEventListener?.('change', onScheme)
  map.once('remove', () => query?.removeEventListener?.('change', onScheme))

  // se uno stile non si scarica (es. lo stile scuro non disponibile), ripiego su quello chiaro
  map.on('error', (e) => {
    const url = (e as unknown as { error?: { url?: string } }).error?.url ?? ''
    if (url.includes('/styles/') && current !== STYLES.light) apply(STYLES.light)
  })
  return map
}

function pinElement(p: { name: string; color: string }, selected: boolean): HTMLElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'jp-pin'
  el.style.background = p.color
  el.title = p.name
  el.setAttribute('aria-label', p.name)
  setSelected(el, selected)
  return el
}

function setSelected(el: HTMLElement, selected: boolean) {
  el.classList.toggle('jp-pin-selected', selected)
  el.style.zIndex = selected ? '10' : ''
}

export interface MapPin {
  id: string
  lat: number
  lng: number
  name: string
  color: string
}

interface MapViewProps {
  pins: MapPin[]
  center: { lat: number; lng: number }
  selectedId: string | null
  /** `null` quando si tocca la mappa fuori dai pin. */
  onSelect: (id: string | null) => void
}

/** Mappa con un pin colorato per luogo. Si adatta ai pin visibili quando cambiano i filtri. */
export function MapView({ pins, center, selectedId, onSelect }: MapViewProps) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const markers = useRef<Map<string, Marker>>(new Map())
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const pinsRef = useRef(pins)
  pinsRef.current = pins
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId
  const fitted = useRef('')
  const ready = useRef(false)

  useEffect(() => {
    if (!el.current) return
    const m = newMap(el.current, center, 11, true)
    map.current = m
    m.on('click', () => onSelectRef.current(null))
    // i pin sono elementi HTML: servono solo dopo che la mappa esiste
    ready.current = true
    drawPins()
    return () => {
      ready.current = false
      for (const mk of markers.current.values()) mk.remove()
      markers.current.clear()
      m.remove()
      map.current = null
    }
    // la mappa si crea una volta sola
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function drawPins() {
    const m = map.current
    if (!m || !ready.current) return
    const list = pinsRef.current
    for (const mk of markers.current.values()) mk.remove()
    markers.current.clear()
    for (const p of list) {
      const pe = pinElement(p, p.id === selectedIdRef.current)
      const select = () => onSelectRef.current(p.id)
      pe.addEventListener('click', (ev) => {
        ev.stopPropagation()
        select()
      })
      markers.current.set(p.id, new Marker({ element: pe, anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(m))
    }
    // inquadra tutto solo se cambia l'insieme dei pin (non a ogni selezione)
    const key = list.map((p) => p.id).join(',')
    if (key !== fitted.current && list.length > 0) {
      fitted.current = key
      if (list.length === 1) m.jumpTo({ center: [list[0].lng, list[0].lat], zoom: 15 })
      else {
        const b = new LngLatBounds()
        for (const p of list) b.extend([p.lng, p.lat])
        m.fitBounds(b, { padding: 48, maxZoom: 16, duration: 0 })
      }
    }
  }

  // ridisegna i pin quando cambiano
  useEffect(() => {
    drawPins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins])

  // evidenzia il pin selezionato senza ricreare tutto
  useEffect(() => {
    for (const [id, mk] of markers.current) setSelected(mk.getElement(), id === selectedId)
  }, [selectedId])

  return <div ref={el} class="h-full w-full" role="application" aria-label="Mappa dei luoghi" />
}

interface PinPickerProps {
  lat: number | null
  lng: number | null
  center: { lat: number; lng: number }
  onMove: (lat: number, lng: number) => void
}

/** Piccola mappa con un pin trascinabile (o un tocco sulla mappa) per correggere la posizione di un luogo. */
export function PinPicker({ lat, lng, center, onMove }: PinPickerProps) {
  const el = useRef<HTMLDivElement>(null)
  const marker = useRef<Marker | null>(null)
  const map = useRef<MLMap | null>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  useEffect(() => {
    if (!el.current) return
    const start = lat != null && lng != null ? { lat, lng } : center
    const m = newMap(el.current, start, lat != null ? 16 : 11, false)
    map.current = m
    const mk = new Marker({
      element: pinElement({ name: 'Posizione', color: '#c8402f' }, true),
      anchor: 'center',
      draggable: true,
    })
      .setLngLat([start.lng, start.lat])
      .addTo(m)
    marker.current = mk
    mk.on('dragend', () => {
      const p = mk.getLngLat()
      onMoveRef.current(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)))
    })
    m.on('click', (e) => {
      mk.setLngLat(e.lngLat)
      onMoveRef.current(Number(e.lngLat.lat.toFixed(6)), Number(e.lngLat.lng.toFixed(6)))
    })
    return () => {
      mk.remove()
      m.remove()
      marker.current = null
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // se le coordinate cambiano da fuori (ricerca, link), il pin le segue
  useEffect(() => {
    if (lat == null || lng == null || !marker.current || !map.current) return
    const cur = marker.current.getLngLat()
    if (Math.abs(cur.lat - lat) > 1e-7 || Math.abs(cur.lng - lng) > 1e-7) {
      marker.current.setLngLat([lng, lat])
      map.current.jumpTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 15) })
    }
  }, [lat, lng])

  return <div ref={el} class="h-56 w-full overflow-hidden rounded-2xl" role="application" aria-label="Sposta il pin" />
}
