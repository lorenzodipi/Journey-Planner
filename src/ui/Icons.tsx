import type { ComponentChildren } from 'preact'

interface IconProps {
  size?: number
  class?: string
  children?: ComponentChildren
}

function Base({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
)

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Base>
)

export const MapIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" />
    <path d="M9 4v13M15 6.5v13" />
  </Base>
)

export const PinIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Base>
)

export const MoreIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" />
  </Base>
)

export const PlaneIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.5 13.5 4 12l-1 1.5 5.5 3.5L9 20l1.6.3 1.5-3.2 4.4 2.3.9-1.5-3.9-3.4 6.6-6.2c.8-.8.6-2-.4-2.2-.6-.1-1.2.1-1.7.5l-6.5 5.4-5.5-1.2" />
  </Base>
)

export const TrainIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="3" width="14" height="14" rx="4" />
    <path d="M5 11h14M9 20l-2 2M15 20l2 2M9 17l-1 3h8l-1-3" />
    <circle cx="9" cy="14" r=".8" fill="currentColor" />
    <circle cx="15" cy="14" r=".8" fill="currentColor" />
  </Base>
)

export const MetroIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="16" height="12" rx="3" />
    <path d="M4 10h16M8 20l1.5-4M16 20l-1.5-4M7 20h10" />
  </Base>
)

export const BusIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="3" width="16" height="15" rx="3" />
    <path d="M4 10h16M7 18v2.5M17 18v2.5" />
    <circle cx="8" cy="14.2" r=".8" fill="currentColor" />
    <circle cx="16" cy="14.2" r=".8" fill="currentColor" />
  </Base>
)

export const CarIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 16V11l1.8-4.2A2 2 0 0 1 8.6 5.5h6.8a2 2 0 0 1 1.8 1.3L19 11v5" />
    <path d="M3.5 11h17v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-5ZM6.5 17v2M17.5 17v2" />
    <circle cx="7.5" cy="14" r=".8" fill="currentColor" />
    <circle cx="16.5" cy="14" r=".8" fill="currentColor" />
  </Base>
)

export const TaxiIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 3h4M5 16V11l1.8-4.2A2 2 0 0 1 8.6 5.5h6.8a2 2 0 0 1 1.8 1.3L19 11v5" />
    <path d="M3.5 11h17v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-5ZM6.5 17v2M17.5 17v2" />
  </Base>
)

export const WalkIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="13" cy="4.5" r="1.8" />
    <path d="m10 21 2-6-2.5-2.5L11 8l-3 2v3M12 15l3 2v4M11 8l4 1.5 2 3.5" />
  </Base>
)

export const FerryIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 14 12 11l8 3-2 5H6l-2-5ZM12 3v8M8.5 7h7M3 21c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
  </Base>
)

export const RouteIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="18" r="2.2" />
    <circle cx="18" cy="6" r="2.2" />
    <path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" />
  </Base>
)

export const CheckInIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 20V8M3 15h18v5M21 15v-2a3 3 0 0 0-3-3h-7v5" />
    <circle cx="7" cy="11.5" r="1.8" />
  </Base>
)

export const CheckOutIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10" />
  </Base>
)

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
  </Base>
)

export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
)

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
)

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Base>
)
