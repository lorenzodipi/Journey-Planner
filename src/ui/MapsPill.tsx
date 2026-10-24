import { Ic } from './Sprite'

type Kind = 'pill' | 'sm' | 'btn' | 'tp' | 'big'

const SPEC: Record<Kind, { cls: string; size: number }> = {
  pill: { cls: 'mappill', size: 32 },
  sm: { cls: 'mappill sm', size: 28 },
  btn: { cls: 'mapbtn', size: 28 },
  tp: { cls: 'tp-map', size: 26 },
  big: { cls: 'tp-btn pri', size: 24 },
}

/** «Apri in Maps»: il pin su un disco verde acqua (Design System v3). Si apre in Google Maps. */
export function MapsPill({ href, label, text, kind = 'pill' }: { href: string; label: string; text?: string; kind?: Kind }) {
  const { cls, size } = SPEC[kind]
  const t = text ?? (kind === 'big' ? 'Apri in Google Maps' : kind === 'pill' ? 'Apri sulla mappa' : 'Maps')
  return (
    <a class={cls} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Apri in Google Maps: ${label}`}>
      <Ic name="i-nav-pin-out" size={size} />
      {kind === 'btn' || kind === 'big' || kind === 'tp' ? (kind === 'btn' ? <span>{t}</span> : t) : <span>{t}</span>}
    </a>
  )
}
