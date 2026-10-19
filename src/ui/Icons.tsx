import {
  faArrowDown,
  faArrowUp,
  faBagShopping,
  faBed,
  faBus,
  faCalendarDays,
  faCar,
  faCheck,
  faChevronDown,
  faChevronRight,
  faClock,
  faCloud,
  faCopy,
  faDownload,
  faEarthEurope,
  faEllipsis,
  faFile,
  faGear,
  faLandmark,
  faListCheck,
  faLocationDot,
  faMagnifyingGlass,
  faMap,
  faMapLocationDot,
  faMinus,
  faPencil,
  faPersonWalking,
  faPlane,
  faPlus,
  faRightFromBracket,
  faRightLeft,
  faRightToBracket,
  faRoute,
  faShieldHalved,
  faShip,
  faSimCard,
  faSliders,
  faSun,
  faTaxi,
  faTicket,
  faTrain,
  faTrainSubway,
  faTrashCan,
  faUtensils,
  faWallet,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'

// Icone di Font Awesome Free (https://fontawesome.com, licenza CC BY 4.0: l'attribuzione è nel pacchetto
// e nella pagina Impostazioni). Qui le rinominiamo con i nomi usati nell'app.

interface IconProps {
  size?: number
  class?: string
  /** Ignorato: le icone Font Awesome sono piene. Resta per non cambiare le chiamate esistenti. */
  'stroke-width'?: number
}

const wrap =
  (def: IconDefinition) =>
  ({ size = 24, class: cls }: IconProps) => {
    const [w, h, , , path] = def.icon
    return (
      <svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} fill="currentColor" class={cls} aria-hidden="true">
        <path d={path as string} />
      </svg>
    )
  }

export const SunIcon = wrap(faSun)
export const CalendarIcon = wrap(faCalendarDays)
export const ClockIcon = wrap(faClock)
export const EarthIcon = wrap(faEarthEurope)
export const MapIcon = wrap(faMap)
export const PinIcon = wrap(faLocationDot)
export const MoreIcon = wrap(faEllipsis)
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
export const TrashIcon = wrap(faTrashCan)
export const ChevronDownIcon = wrap(faChevronDown)
export const CheckIcon = wrap(faCheck)
export const SearchIcon = wrap(faMagnifyingGlass)
export const FoodIcon = wrap(faUtensils)
export const VisitIcon = wrap(faLandmark)
export const BedIcon = wrap(faBed)
export const BudgetIcon = wrap(faWallet)
export const TicketIcon = wrap(faTicket)
export const ChecklistIcon = wrap(faListCheck)
export const TickIcon = wrap(faCheck)
export const MinusIcon = wrap(faMinus)
export const PlusIcon = wrap(faPlus)
export const SwapIcon = wrap(faRightLeft)
export const ChevronRightIcon = wrap(faChevronRight)
export const CopyIcon = wrap(faCopy)
export const DownloadIcon = wrap(faDownload)
export const ShieldIcon = wrap(faShieldHalved)
export const SimIcon = wrap(faSimCard)
export const FileIcon = wrap(faFile)
export const SettingsIcon = wrap(faGear)
export const CloudIcon = wrap(faCloud)
export const LogoutIcon = wrap(faRightFromBracket)
export const BagIcon = wrap(faBagShopping)
export const TrainCarIcon = wrap(faTrain)
export const PinOutIcon = wrap(faMapLocationDot)
export const PencilIcon = wrap(faPencil)
export const SunriseIcon = wrap(faArrowUp)
export const SunsetIcon = wrap(faArrowDown)
export const FilterIcon = wrap(faSliders)
