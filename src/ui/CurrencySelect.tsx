import { useMemo } from 'react'
import { currencyOptions } from '../lib/currencies'
import { Select } from './Select'

/** Selettore di valuta ricercabile (per codice, nome o simbolo). `optional` aggiunge «Nessuna». */
export function CurrencySelect({
  label,
  value,
  onChange,
  optional,
  tone,
}: {
  label: string
  value: string
  onChange: (code: string) => void
  optional?: boolean
  tone?: 'bg' | 'surface'
}) {
  const options = useMemo(() => {
    const list = currencyOptions(value)
    return optional ? [{ value: '', label: 'Nessuna' }, ...list] : list
  }, [value, optional])
  return <Select label={label} value={value.trim().toUpperCase()} onChange={onChange} options={options} searchable tone={tone} placeholder={optional ? 'Nessuna' : 'Scegli la valuta'} />
}
