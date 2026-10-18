import { useEffect, useRef, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { stampOpen } from './dialogStack'
import { TrashIcon } from './Icons'

export interface ConfirmOptions {
  title: string
  text?: string
  /** Testo del pulsante che conferma (di base "Elimina"). */
  confirmLabel?: string
}

interface PendingState extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

function ConfirmDialog({ title, text, confirmLabel = 'Elimina', onAnswer }: ConfirmOptions & { onAnswer: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) {
      dialog.showModal()
      stampOpen(dialog)
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // Esc o gesto "indietro": è un "no"
      onClose={() => onAnswer(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onAnswer(false)
      }}
      class="fixed inset-0 m-auto w-[min(92vw,22rem)] rounded-3xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/45"
    >
      <div class="space-y-4 p-5">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <TrashIcon size={20} />
          </span>
          <div class="min-w-0">
            <h2 class="font-display text-xl font-semibold leading-tight">{title}</h2>
            {text && <p class="mt-1 text-sm text-muted">{text}</p>}
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onAnswer(false)} class="min-h-12 rounded-full border border-line px-4 font-medium">
            Annulla
          </button>
          <button type="button" onClick={() => onAnswer(true)} class="min-h-12 rounded-full bg-danger px-4 font-semibold text-white">
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

/**
 * Popup di conferma. Uso: `const [confirm, confirmDialog] = useConfirm()`, poi
 * `if (!(await confirm({ title: 'Eliminare…?' }))) return` e `{confirmDialog}` nel JSX.
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ComponentChildren] {
  const [pending, setPending] = useState<PendingState | null>(null)
  const pendingRef = useRef<PendingState | null>(null)

  function answer(ok: boolean) {
    const current = pendingRef.current
    if (!current) return // già risposto (la chiusura del dialog richiama onClose)
    pendingRef.current = null
    setPending(null)
    current.resolve(ok)
  }

  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const next = { ...options, resolve }
      pendingRef.current?.resolve(false)
      pendingRef.current = next
      setPending(next)
    })
  }

  const dialog = pending ? (
    <ConfirmDialog key={pending.title + pending.text} title={pending.title} text={pending.text} confirmLabel={pending.confirmLabel} onAnswer={answer} />
  ) : null
  return [confirm, dialog]
}

/** Icona cestino da mettere in fondo a una riga: apre il popup di conferma (lo decide chi la usa). */
export function TrashButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      class="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-danger active:text-danger disabled:opacity-40"
    >
      <TrashIcon size={20} />
    </button>
  )
}
