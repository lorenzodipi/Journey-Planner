import { Link, useLocation } from 'wouter-preact'
import { CalendarIcon, MapIcon, PinIcon, SectionsIcon, TodayIcon } from './Icons'

const tabs = [
  { href: '/', label: 'Oggi', Icon: TodayIcon, tint: 'var(--glicine)' },
  { href: '/giorni', label: 'Giorni', Icon: CalendarIcon, tint: 'var(--cielo)' },
  { href: '/mappa', label: 'Mappa', Icon: MapIcon, tint: 'var(--menta)' },
  { href: '/luoghi', label: 'Luoghi', Icon: PinIcon, tint: 'var(--pomodoro)' },
  { href: '/altro', label: 'Altro', Icon: SectionsIcon, tint: 'var(--confetto)' },
]

/** Barra in basso del design system: cinque schede con icona e nome; la scheda attiva ha la pillola azzurra. */
export function BottomNav() {
  const [location] = useLocation()

  return (
    <nav
      aria-label="Navigazione principale"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-bg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul class="mx-auto grid h-16 max-w-xl grid-cols-5">
        {tabs.map(({ href, label, Icon, tint }) => {
          const active = href === '/' ? location === '/' : location.startsWith(href)
          return (
            <li>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                class={`flex h-16 touch-manipulation flex-col items-center gap-0.5 pt-2 text-xs font-semibold ${active ? 'text-pale' : 'text-muted'}`}
              >
                <span class={`grid h-8 w-14 place-items-center rounded-full ${active ? 'bg-accent-soft' : ''}`}>
                  <span class="grid size-7 place-items-center rounded-full" style={{ background: tint, color: 'var(--on-bright)' }}>
                    <Icon size={15} />
                  </span>
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
