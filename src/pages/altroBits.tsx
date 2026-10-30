import type { Traveler } from '../types'

// Colori vivaci del Design System per gli avatar (i viaggiatori hanno un colore proprio salvato, scuro: qui si usa la tavolozza v3).
const AV = ['var(--arancia)', 'var(--confetto)', 'var(--menta)', 'var(--cielo)', 'var(--limone)', 'var(--glicine)']
export const avColor = (i: number) => AV[i % AV.length]

export const initialOf = (name: string) => (name.trim().charAt(0) || '?').toUpperCase()

/** Pila di avatar sovrapposti, come nei mock. */
export function AvatarStack({ people }: { people: Traveler[] }) {
  return (
    <div style={{ display: 'flex' }}>
      {people.slice(0, 4).map((p, i) => (
        <span key={p.id} style={i === 0 ? undefined : { marginLeft: '-6px' }}>
          <span className="av" style={{ background: avColor(i) }} aria-hidden="true">
            {initialOf(p.name)}
          </span>
        </span>
      ))}
    </div>
  )
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** «Lorenzo e Gaia», «Lorenzo, Gaia e Anna». */
export function namesOf(people: Traveler[]): string {
  const n = people.map((p) => p.name).filter(Boolean)
  if (n.length <= 1) return n[0] ?? ''
  return `${n.slice(0, -1).join(', ')} e ${n[n.length - 1]}`
}
