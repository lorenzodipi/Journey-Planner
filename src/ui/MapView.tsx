import {
  AttributionControl,
  LngLatBounds,
  Map as MLMap,
  Marker,
  GeolocateControl,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type IControl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect, useRef } from 'preact/hooks'
import { pinIconSvg, type PinIcon } from '../lib/categoryIcon'
import { isTap, type TapDown } from '../lib/mapTap'

// Questo file (e MapLibre) viene caricato solo quando serve una mappa: l'avvio dell'app resta leggero.
setWorkerUrl(workerUrl)

// Mappa vettoriale di OpenFreeMap: gratuita, senza chiave API, nitida a qualsiasi zoom.
// Le etichette sono bilingui (nome latino + nome locale, es. "Shinjuku 新宿").
// La mappa è sempre chiara (come nei disegni): carta color crema con strade bianche, anche con il telefono in tema scuro.
const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/bright', // pulita, simile alla carta stradale
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

function styleFor(pref: StylePref): string {
  return pref === 'detail' ? STYLES.detail : STYLES.light
}

/** Pulsante sulla mappa per passare tra stile pulito e dettagliato. */
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

function newMap(el: HTMLElement, center: { lat: number; lng: number }, zoom: number, withToggle: boolean, cooperative = false, locate = false): MLMap {
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
    // dentro una pagina che scorre: con un dito scorre la pagina, con due si muove la mappa
    ...(cooperative
      ? {
          cooperativeGestures: true,
          locale: {
            'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + scorrimento per ingrandire la mappa',
            'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + scorrimento per ingrandire la mappa',
            'CooperativeGesturesHandler.MobileHelpText': 'Usa due dita per muovere la mappa',
          },
        }
      : {}),
  })
  map.touchZoomRotate.disableRotation()
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
  if (locate) map.addControl(new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), 'top-right')
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

  // se lo stile scelto non si scarica, ripiego su quello pulito
  map.on('error', (e) => {
    const url = (e as unknown as { error?: { url?: string } }).error?.url ?? ''
    if (url.includes('/styles/') && current !== STYLES.light) apply(STYLES.light)
  })
  return map
}

function pinElement(p: { name: string; color: string; icon?: PinIcon; symbol?: string; ring?: string }, selected: boolean): HTMLElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'jp-pin'
  el.title = p.name
  el.setAttribute('aria-label', p.name)
  if (p.symbol) {
    // disco del Design System (simbolo dello sprite, già colorato); l'anello colorato indica il giorno
    el.classList.add('fw-pin')
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#${p.symbol}"/></svg>`
    if (p.ring) {
      el.classList.add('fw-ring')
      el.style.setProperty('--pin-ring', p.ring)
    }
  } else {
    el.style.background = p.color
    if (p.icon) el.innerHTML = pinIconSvg(p.icon)
  }
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
  /** Icona della categoria, disegnata dentro il pallino. */
  icon?: PinIcon
  /** Simbolo dello sprite del Design System (es. `i-cat-temple`): se c'è, sostituisce colore e icona. */
  symbol?: string
  /** Anello colorato attorno al disco (es. colore del giorno). */
  ring?: string
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
    const m = newMap(el.current, center, 11, true, false, true)
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
      element: pinElement({ name: 'Posizione', color: '#3d86ff' }, true),
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

// ---------- mappa del giorno ----------

export interface DayMapStop {
  id: string
  n: number
  name: string
  lat: number
  lng: number
}

export interface DayMapLine {
  id: string
  coords: [number, number][] // [lng, lat]
  dashed: boolean
  color: string
}

export interface DayMapEnd {
  id: string
  name: string
  lat: number
  lng: number
}

const LINES_SOURCE = 'day-lines'
const STOP_COLOR = '#3d86ff'

function applyLines(m: MLMap, lines: DayMapLine[]) {
  const data = {
    type: 'FeatureCollection' as const,
    features: lines.map((l) => ({
      type: 'Feature' as const,
      properties: { dashed: l.dashed, color: l.color },
      geometry: { type: 'LineString' as const, coordinates: l.coords },
    })),
  }
  try {
    const src = m.getSource(LINES_SOURCE) as GeoJSONSource | undefined
    if (src) {
      src.setData(data)
      return
    }
    // Non si controlla isStyleLoaded(): con lo stile vero resta "false" finché arrivano i tile.
    // Se lo stile non è ancora pronto addSource lancia e si riprova a 'style.load' / 'idle'.
    m.addSource(LINES_SOURCE, { type: 'geojson', data })
    const round = { 'line-cap': 'round', 'line-join': 'round' } as const
    // bordo chiaro sotto tutte le linee: le tiene leggibili sia sulla mappa chiara che su quella scura
    m.addLayer({
      id: 'day-lines-casing',
      type: 'line',
      source: LINES_SOURCE,
      layout: round,
      paint: { 'line-color': '#ffffff', 'line-width': 8.5, 'line-opacity': 0.92 },
    })
    m.addLayer({
      id: 'day-lines-solid',
      type: 'line',
      source: LINES_SOURCE,
      filter: ['==', ['get', 'dashed'], false],
      layout: round,
      paint: { 'line-color': ['get', 'color'], 'line-width': 4.5 },
    })
    m.addLayer({
      id: 'day-lines-dash',
      type: 'line',
      source: LINES_SOURCE,
      filter: ['==', ['get', 'dashed'], true],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-dasharray': [2, 1.4] },
    })
  } catch {
    // lo stile non è pronto: si riprova al prossimo evento
    try {
      if (m.getSource(LINES_SOURCE)) m.removeSource(LINES_SOURCE)
    } catch {
      /* niente */
    }
  }
}

interface PinHandlers {
  /** istante dell'ultimo movimento della mappa */
  lastMove: { current: number | null }
  /** quanti puntatori sono appoggiati alla mappa adesso */
  pointers: { current: number }
  onTap: (stop: DayMapStop) => void
}

/** Pin numerato: il cerchio è 28 px, l'area da toccare 44 px. Vale come tocco solo se rispetta `isTap`. */
function numberElement(stop: DayMapStop, h: PinHandlers): HTMLElement {
  const hit = document.createElement('div')
  hit.className = 'jp-hit'
  hit.dataset.stopId = stop.id
  hit.tabIndex = 0
  hit.title = `${stop.n}. ${stop.name}`
  hit.setAttribute('role', 'button')
  hit.setAttribute('aria-label', `Tappa ${stop.n}: ${stop.name}`)
  const dot = document.createElement('div')
  dot.className = 'jp-num'
  dot.style.background = STOP_COLOR
  dot.textContent = String(stop.n)
  hit.appendChild(dot)

  let down: TapDown | null = null
  hit.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now(), pointers: h.pointers.current }
  })
  hit.addEventListener('pointerup', (e) => {
    const d = down
    down = null
    if (d && isTap(d, { x: e.clientX, y: e.clientY, t: performance.now() }, h.lastMove.current)) h.onTap(stop)
  })
  hit.addEventListener('pointercancel', () => {
    down = null
  })
  hit.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      h.onTap(stop)
    }
  })
  return hit
}

function endElement(end: DayMapEnd): HTMLElement {
  const el = document.createElement('div')
  el.className = 'jp-end'
  el.title = end.name
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', end.name)
  return el
}

interface DayMapProps {
  stops: DayMapStop[]
  lines: DayMapLine[]
  ends: DayMapEnd[]
  center: { lat: number; lng: number }
  /** Tappa selezionata (ingrandita sulla mappa). */
  selectedId?: string | null
  /** Tocco su un pin (già filtrato: non scatta se si sta trascinando o zoomando la mappa). */
  onSelect?: (stopId: string) => void
}

/** Mappa di una giornata: pin numerati nell'ordine delle tappe, linee tra le tappe e partenze/arrivi dei mezzi. */
export function DayMapView({ stops, lines, ends, center, selectedId, onSelect }: DayMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const markers = useRef<Marker[]>([])
  const linesRef = useRef(lines)
  linesRef.current = lines
  const pointsRef = useRef({ stops, ends })
  pointsRef.current = { stops, ends }
  const fitted = useRef('')
  const lastMove = useRef<number | null>(null)
  const pointers = useRef(0)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const handlers = useRef<PinHandlers>({ lastMove, pointers, onTap: (stop) => selectRef.current?.(stop.id) })

  function markSelected() {
    for (const mk of markers.current) {
      const el = mk.getElement()
      if (el.dataset.stopId) el.dataset.selected = String(el.dataset.stopId === selectedRef.current)
    }
  }

  function drawPoints() {
    const m = map.current
    if (!m) return
    for (const mk of markers.current) mk.remove()
    markers.current = []
    const { stops: s, ends: e } = pointsRef.current
    for (const end of e) markers.current.push(new Marker({ element: endElement(end), anchor: 'center' }).setLngLat([end.lng, end.lat]).addTo(m))
    for (const stop of s) markers.current.push(new Marker({ element: numberElement(stop, handlers.current), anchor: 'center' }).setLngLat([stop.lng, stop.lat]).addTo(m))
    // inquadra tutto solo quando cambia l'insieme dei punti (non quando arrivano i percorsi)
    markSelected()
    const key = [...s.map((x) => x.id), ...e.map((x) => x.id)].join(',')
    const all = [...s, ...e]
    if (key !== fitted.current && all.length > 0) {
      fitted.current = key
      if (all.length === 1) m.jumpTo({ center: [all[0].lng, all[0].lat], zoom: 15 })
      else {
        const b = new LngLatBounds()
        for (const p of all) b.extend([p.lng, p.lat])
        m.fitBounds(b, { padding: 44, maxZoom: 16, duration: 0 })
      }
    }
  }

  useEffect(() => {
    if (!el.current) return
    const m = newMap(el.current, center, 12, true, true)
    map.current = m
    // il tocco su un pin vale solo se la mappa è ferma e il dito è uno solo
    m.on('move', () => {
      lastMove.current = performance.now()
    })
    const box = el.current
    const addPointer = () => {
      pointers.current++
    }
    const dropPointer = () => {
      pointers.current = Math.max(0, pointers.current - 1)
    }
    box.addEventListener('pointerdown', addPointer, true)
    box.addEventListener('pointerup', dropPointer, true)
    box.addEventListener('pointercancel', dropPointer, true)
    // cambiando stile (chiaro/scuro/dettagli) le linee vanno ridisegnate
    const redraw = () => applyLines(m, linesRef.current)
    m.on('style.load', redraw)
    m.on('load', redraw)
    m.on('idle', () => {
      if (!m.getSource(LINES_SOURCE)) redraw()
    })
    drawPoints()
    return () => {
      box.removeEventListener('pointerdown', addPointer, true)
      box.removeEventListener('pointerup', dropPointer, true)
      box.removeEventListener('pointercancel', dropPointer, true)
      for (const mk of markers.current) mk.remove()
      markers.current = []
      m.remove()
      map.current = null
    }
    // la mappa si crea una volta sola
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    drawPoints()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, ends])

  useEffect(() => {
    if (map.current) applyLines(map.current, lines)
  }, [lines])

  useEffect(markSelected, [selectedId])

  return <div ref={el} class="h-full w-full" role="application" aria-label="Mappa della giornata" />
}
