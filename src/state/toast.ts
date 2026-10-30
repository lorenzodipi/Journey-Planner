import { useEffect, useState } from 'react'

// Messaggio breve in basso (es. "Tappa eliminata · Annulla"). Un solo toast alla volta.

export interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

let current: Toast | null = null
let counter = 0
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<(t: Toast | null) => void>()

function emit() {
  for (const l of listeners) l(current)
}

export function showToast(message: string, action?: Toast['action'], ms = 6000): void {
  clearTimeout(timer)
  current = { id: ++counter, message, action }
  emit()
  timer = setTimeout(dismissToast, ms)
}

export function dismissToast(): void {
  clearTimeout(timer)
  current = null
  emit()
}

export function useToast(): Toast | null {
  const [toast, setToast] = useState<Toast | null>(current)
  useEffect(() => {
    listeners.add(setToast)
    return () => void listeners.delete(setToast)
  }, [])
  return toast
}
