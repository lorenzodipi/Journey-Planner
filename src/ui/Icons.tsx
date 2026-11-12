import {
  faBus,
  faCar,
  faPersonWalking,
  faPlane,
  faRightFromBracket,
  faRightToBracket,
  faRoute,
  faShip,
  faTaxi,
  faTrain,
  faTrainSubway,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'

// Icone di Font Awesome Free (https://fontawesome.com, licenza CC BY 4.0: l'attribuzione è nel pacchetto
// e nella pagina Impostazioni account). Qui le rinominiamo con i nomi usati nell'app.

interface IconProps {
  size?: number
  className?: string
  /** Ignorato: le icone Font Awesome sono piene. Resta per non cambiare le chiamate esistenti. */
  strokeWidth?: number
}

const wrap =
  (def: IconDefinition) =>
  ({ size = 24, className: cls }: IconProps) => {
    const [w, h, , , path] = def.icon
    return (
      <svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} fill="currentColor" className={cls} aria-hidden="true">
        <path d={path as string} />
      </svg>
    )
  }

export const PlaneIcon = wrap(faPlane)
export const TrainIcon = wrap(faTrain)
export const MetroIcon = wrap(faTrainSubway)
export const BusIcon = wrap(faBus)
export const CarIcon = wrap(faCar)
export const TaxiIcon = wrap(faTaxi)
export const WalkIcon = wrap(faPersonWalking)
export const FerryIcon = wrap(faShip)
export const RouteIcon = wrap(faRoute)
export const CheckInIcon = wrap(faRightToBracket)
export const CheckOutIcon = wrap(faRightFromBracket)
