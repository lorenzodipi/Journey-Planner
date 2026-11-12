import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components'

// Messaggio breve in basso (es. "Tappa eliminata · Annulla"). Un solo avviso alla volta: uno nuovo prende il posto del precedente.
// La coda è quella di react-aria-components: il tempo si ferma se ci si passa sopra o lo si raggiunge con il focus,
// F6 porta agli avvisi da tastiera e il lettore di schermo li legge. Si mostrano con ToastHost (src/ui/ToastHost.tsx).

export interface Avviso {
  message: string
  action?: { label: string; run: () => void }
}

export const codaAvvisi = new ToastQueue<Avviso>({ maxVisibleToasts: 1 })

export function showToast(message: string, action?: Avviso['action'], ms = 6000): void {
  codaAvvisi.clear()
  codaAvvisi.add({ message, action }, { timeout: ms })
}

export function dismissToast(): void {
  codaAvvisi.clear()
}
