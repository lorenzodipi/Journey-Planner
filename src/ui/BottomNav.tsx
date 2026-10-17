import { Link, useLocation } from 'wouter-preact'
import { CalendarIcon, MapIcon, MoreIcon, PinIcon, SunIcon } from './Icons'

const tabs = [
  { href: '/', label: 'Oggi', Icon: SunIcon },
  { href: '/giorni', label: 'Giorni', Icon: CalendarIcon },
  { href: '/mappa', label: 'Mappa', Icon: MapIcon },
  { href: '/luoghi', label: 'Luoghi', Icon: PinIcon },
  { href: '/altro', label: 'Altro', Icon: MoreIcon },
]

export function BottomNav() {
  const [location] = useLocation()

  return (
    <nav
      aria-label="Navigazione principale"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul class="mx-auto flex max-w-xl">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === '/' ? location === '/' : location.startsWith(href)
          return (
            <li class="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                class={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <span
                  class={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                    active ? 'bg-accent-soft' : ''
                  }`}
                >
                  <Icon size={22} />
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
