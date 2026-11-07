import { useEffect, useState } from 'react'

// Avviso al centro dello schermo che resta finché non lo si chiude (es. «Viaggio eliminato»).
// Sopravvive al cambio di pagina: lo mostra AvvisoHost, montato una volta sola nell'app.

export interface Avviso {
  title: string
  message: string
}

let current: Avviso | null = null
const listeners = new Set<(a: Avviso | null) => void>()
const emit = () => {
  for (const l of listeners) l(current)
}

export function showAvviso(a: Avviso): void {
  current = a
  emit()
}

export function closeAvviso(): void {
  current = null
  emit()
}

export function useAvviso(): Avviso | null {
  const [a, setA] = useState<Avviso | null>(current)
  useEffect(() => {
    listeners.add(setA)
    return () => void listeners.delete(setA)
  }, [])
  return a
}
