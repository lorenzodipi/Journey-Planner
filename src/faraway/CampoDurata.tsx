// Campo «Durata» con il selettore dell'orario (ore e minuti), senza scrivere a mano. Un testo già scritto che non ci sta
// (24 h o più, formato strano) resta un campo di testo finché non lo si cancella.
import type { SvName } from './icons'
import { Campo } from './base'
import { durataComeOra, oraComeDurata } from '../lib/durataOra'

export function CampoDurata({ label, value, onChange, placeholder, icon, hint, error }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: SvName; hint?: string; error?: string | null }) {
  const ora = durataComeOra(value)
  if (ora === null) {
    return <Campo label={label} icon={icon} value={value} onChange={onChange} placeholder={placeholder ?? '1h 30min'} hint={hint ?? 'Testo scritto prima: cancellalo per scegliere ore e minuti.'} error={error ?? undefined} />
  }
  return <Campo da00 label={label} icon={icon ?? 'clock'} type="time" value={ora} onChange={(v) => onChange(oraComeDurata(v))} placeholder={placeholder ?? '1h 30min'} hint={hint} error={error ?? undefined} />
}
