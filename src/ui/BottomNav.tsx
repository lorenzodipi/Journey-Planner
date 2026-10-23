import { Link, useLocation } from 'wouter-preact'
import { CalendarIcon, MapIcon, PinIcon, SectionsIcon, TodayIcon } from './Icons'

const tabs = [
  { href: '/', label: 'Oggi', Icon: TodayIcon },
  { href: '/giorni', label: 'Giorni', Icon: CalendarIcon },
  { href: '/mappa', label: 'Mappa', Icon: MapIcon },
  { href: '/luoghi', label: 'Luoghi', Icon: PinIcon },
  { href: '/altro', label: 'Altro', Icon: SectionsIcon },
]

/** Barra a pillola che galleggia in basso: la scheda attiva mostra anche il nome. */
export function BottomNav() {
  const [location] = useLocation()

  return (
    <nav
      aria-label="Navigazione principale"
      class="fixed inset-x-0 bottom-0 z-20 px-3.5 pointer-events-none"
      style={{ paddingBottom: 'calc(1.125rem + env(safe-area-inset-bottom))' }}
    >
      <ul class="pointer-events-auto mx-auto flex h-[66px] max-w-xl items-center justify-between rounded-full border-2 border-line bg-surface px-2 shadow-[0_8px_20px_rgb(0_0_0/0.45)]">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === '/' ? location === '/' : location.startsWith(href)
          return (
            <li>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                class={
                  active
                    ? 'inline-flex h-12 items-center gap-2 rounded-full bg-accent px-4 text-sm font-extrabold text-accent-ink'
                    : 'grid h-12 w-[46px] place-items-center text-muted'
                }
              >
                <Icon size={active ? 22 : 24} stroke-width={active ? 2.2 : 2} />
                {active && label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
