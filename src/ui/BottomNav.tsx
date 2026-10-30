import { Link, useLocation } from 'wouter'
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
    <nav className="tabbar" aria-label="Navigazione principale">
      <ul>
        {tabs.map(({ href, label, icon }) => {
          const active = href === '/' ? location === '/' : location.startsWith(href)
          return (
            <li>
              <Link href={href} className={`tab${active ? ' on' : ''}`} aria-current={active ? 'page' : undefined}>
                <span className="tpill">
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
