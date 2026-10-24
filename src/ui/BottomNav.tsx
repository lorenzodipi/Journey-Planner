import { Link, useLocation } from 'wouter-preact'
import { Ic } from './Sprite'

const tabs = [
  { href: '/', label: 'Oggi', icon: 'i-nav-today' },
  { href: '/giorni', label: 'Giorni', icon: 'i-nav-calendar' },
  { href: '/mappa', label: 'Mappa', icon: 'i-nav-map' },
  { href: '/luoghi', label: 'Luoghi', icon: 'i-nav-pin' },
  { href: '/altro', label: 'Altro', icon: 'i-nav-sections' },
]

/** Barra delle schede del Design System: dischi colorati, pillola azzurro-soft sulla scheda attiva. */
export function BottomNav() {
  const [location] = useLocation()
  return (
    <nav class="tabbar" aria-label="Navigazione principale">
      <ul>
        {tabs.map(({ href, label, icon }) => {
          const active = href === '/' ? location === '/' : location.startsWith(href)
          return (
            <li>
              <Link href={href} class={`tab${active ? ' on' : ''}`} aria-current={active ? 'page' : undefined}>
                <span class="tpill">
                  <Ic name={icon} size={28} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
