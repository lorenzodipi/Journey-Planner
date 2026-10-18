import { useMemo } from 'preact/hooks'
import type { Category } from '../types'
import { Select, type SelectOption } from './Select'

interface Props {
  value: string
  onChange: (label: string) => void
  /** Categorie già create nel viaggio. */
  categories: Category[]
  /** Nomi proposti che non esistono ancora: scegliendoli la categoria si crea al salvataggio. */
  suggestions?: string[]
  label?: string
}

/**
 * Scelta della categoria di una spesa o di una voce di budget: quelle del viaggio, le proposte,
 * e si può scrivere un nome nuovo (la categoria nasce con la spesa). Il valore è il nome.
 */
export function CategorySelect({ value, onChange, categories, suggestions = [], label = 'Categoria' }: Props) {
  const options = useMemo<SelectOption[]>(() => {
    const known = new Set(categories.map((c) => c.label.toLowerCase()))
    return [
      { value: '', label: 'Nessuna categoria' },
      ...categories.map((c) => ({ value: c.label, label: c.label, color: c.color })),
      ...suggestions
        .filter((s) => !known.has(s.toLowerCase()))
        .map((s) => ({ value: s, label: s, hint: 'Nuova categoria' })),
    ]
  }, [categories, suggestions])
  // il valore può differire solo per maiuscole da una categoria esistente: si usa quella
  const match = categories.find((c) => c.label.toLowerCase() === value.trim().toLowerCase())
  return (
    <Select
      label={label}
      value={match ? match.label : value}
      options={options}
      onChange={onChange}
      creatable
      searchable
      createLabel={(typed) => `Crea la categoria «${typed}»`}
    />
  )
}
