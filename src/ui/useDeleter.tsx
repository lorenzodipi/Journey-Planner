import type { ReactNode } from 'react'
import { showToast } from '../state/toast'
import { useConfirm } from './ConfirmDialog'

export interface DeleteRequest {
  /** Domanda del popup, es. «Eliminare "Hotel Sakura"?» */
  title: string
  /** Riga di spiegazione sotto il titolo (cosa succede, se si può annullare). */
  text?: string
  /** Messaggio dopo l'eliminazione, es. "Alloggio eliminato". */
  done: string
  run: () => Promise<string | null>
  /** Testo del pulsante che conferma (di base "Elimina"). */
  confirmLabel?: string
  /** Se c'è, nel messaggio compare "Annulla". */
  undo?: () => Promise<string | null>
}

/**
 * Elimina con conferma: mostra il popup, poi esegue `run` e avvisa con un messaggio (con "Annulla" se possibile).
 * Uso: `const [del, delDialog] = useDeleter()` + `{delDialog}` nel JSX + `<TrashButton onClick={() => del({...})} />`.
 */
export function useDeleter(): [(req: DeleteRequest) => Promise<boolean>, ReactNode] {
  const [confirm, dialog] = useConfirm()
  async function del(req: DeleteRequest): Promise<boolean> {
    const ok = await confirm({ title: req.title, text: req.text ?? (req.undo ? 'Puoi annullare subito dopo.' : undefined), confirmLabel: req.confirmLabel })
    if (!ok) return false
    const message = await req.run()
    if (message) {
      showToast(message)
      return false
    }
    const { undo } = req
    showToast(req.done, undo ? { label: 'Annulla', run: () => void undo().then((m) => m && showToast(m)) } : undefined)
    return true
  }
  return [del, dialog]
}
