import type { TransportMode } from '../types'
import type { DayEvent } from '../lib/today'
import { BusIcon, CarIcon, CheckInIcon, CheckOutIcon, FerryIcon, MetroIcon, PlaneIcon, RouteIcon, TaxiIcon, TrainIcon, WalkIcon } from './Icons'

const BY_MODE: Record<TransportMode, typeof TrainIcon> = {
  train: TrainIcon,
  metro: MetroIcon,
  bus: BusIcon,
  taxi: TaxiIcon,
  walk: WalkIcon,
  car: CarIcon,
  plane: PlaneIcon,
  ferry: FerryIcon,
  other: RouteIcon,
}

/** Icona in base al tipo di spostamento: volo, mezzo di trasporto, check-in o check-out. */
export function MovementIcon({ event, size = 20 }: { event: Pick<DayEvent, 'kind' | 'mode' | 'title'>; size?: number }) {
  if (event.kind === 'flight') return <PlaneIcon size={size} />
  if (event.kind === 'stay') return event.title.startsWith('Check-out') ? <CheckOutIcon size={size} /> : <CheckInIcon size={size} />
  const Icon = (event.mode && BY_MODE[event.mode]) || RouteIcon
  return <Icon size={size} />
}
