// Paese scelto dall'elenco di tutti i paesi: campo in cui si scrive il nome (in italiano o in inglese) o il codice e si
// sceglie tra le voci che corrispondono (CampoCerca). Il valore è il codice ISO; il campo vuoto toglie la scelta.
import { useMemo } from 'react'
import { COUNTRIES } from '../lib/countries'
import type { VoceCerca } from '../lib/cerca'
import { CampoCerca } from './CampoCerca'
import { t } from '../i18n'

const inglese = (() => {
  try {
    return new Intl.DisplayNames('en', { type: 'region' })
  } catch {
    return null
  }
})()

export function CampoPaese({ label, value, onChange, hint }: { label: string; value: string; onChange: (codice: string) => void; hint?: string }) {
  const voci = useMemo<VoceCerca[]>(() => COUNTRIES.map((c) => ({ id: c.code, codice: c.code, label: c.name, altro: inglese?.of(c.code) ?? '' })), [])
  return <CampoCerca label={label} value={value} onChange={onChange} voci={voci} hint={hint} placeholder={t('Nome del paese')} icon="globe" facoltativo />
}
