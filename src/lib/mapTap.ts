// Quando un tocco sulla mappa conta come «tocco» e non come inizio di un trascinamento, uno zoom o un'inerzia.
// Così passare il dito sulla mappa mentre si scorre la pagina non seleziona nulla per sbaglio.

export const TAP_MAX_MOVE_PX = 8
export const TAP_MAX_MS = 350
/** La mappa non deve essersi mossa (pan, pinch, inerzia) nei 300 ms prima che il dito si appoggi. */
export const TAP_QUIET_MS = 300

export interface TapDown {
  x: number
  y: number
  /** istante in cui il dito si è appoggiato (ms) */
  t: number
  /** quanti puntatori erano attivi in quel momento, compreso questo */
  pointers: number
}

export interface TapUp {
  x: number
  y: number
  t: number
}

/**
 * `lastMapMoveAt`: istante dell'ultimo movimento della mappa (o null se non si è mai mossa).
 * Il tocco vale se: un solo dito, spostamento < 8 px, durata < 350 ms, mappa ferma da almeno 300 ms
 * prima del tocco e ferma durante il tocco.
 */
export function isTap(down: TapDown, up: TapUp, lastMapMoveAt: number | null): boolean {
  if (down.pointers !== 1) return false
  if (Math.hypot(up.x - down.x, up.y - down.y) >= TAP_MAX_MOVE_PX) return false
  if (up.t - down.t >= TAP_MAX_MS) return false
  if (lastMapMoveAt != null && lastMapMoveAt > down.t - TAP_QUIET_MS) return false
  return true
}
