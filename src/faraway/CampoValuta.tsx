// Valuta scelta da un elenco, non scritta a mano: le valute del viaggio (`valute`, poche: un <select>) oppure, con
// `tutte`, tutte le valute del mondo: lì è un campo in cui si scrive il codice o il nome (CampoCerca), le più usate prima.
import { useId, useMemo } from 'react'
import type { VoceCerca } from '../lib/cerca'
import { currencyGroups } from '../lib/currencies'
import { currencyName } from '../lib/money'
import { CampoCerca } from './CampoCerca'
import { t } from '../i18n'

export function CampoValuta({ value, onChange, valute = [], label = t('Valuta'), tutte, hint }: { value: string; onChange: (valuta: string) => void; valute?: string[]; label?: string; /** tutte le valute del mondo, «EUR · Euro», le più usate in cima */ tutte?: boolean; hint?: string }) {
  const id = useId()
  const voci = useMemo<VoceCerca[]>(() => (tutte ? currencyGroups(value).flatMap((g) => g.valute.map((v) => ({ id: v.code, codice: v.code, label: currencyName(v.code) || v.code }))) : []), [tutte, value])
  if (tutte)
    return (
      <CampoCerca
        label={label}
        value={value}
        onChange={onChange}
        voci={voci}
        hint={hint}
        placeholder={t('Codice o nome della valuta')}
        testoDi={(c) => (currencyName(c) ? `${c} · ${currencyName(c)}` : c)}
        segno={(v) => <b className="cod">{v.codice}</b>}
      />
    )
  return (
    <div className="fa-fld">
      <label htmlFor={id}>{label}</label>
      <span className="fa-in">
        <select id={id} value={value} onChange={(e) => onChange(e.currentTarget.value)} aria-describedby={hint ? `${id}-h` : undefined}>
          {valute.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </span>
      {hint ? (
        <span id={`${id}-h`} className="fa-help">
          {hint}
        </span>
      ) : null}
    </div>
  )
}
