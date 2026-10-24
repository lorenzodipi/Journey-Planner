import { useEffect, useRef, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { stampOpen } from './dialogStack'
import { TrashG } from './glyphs'

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
      class="fdialog"
    >
      <div class="fdialog-in">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span class="fdialog-ic">
            <TrashG size={22} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 class="h-md">{title}</h2>
            {text && <p class="b-sm muted" style={{ marginTop: '4px' }}>{text}</p>}
          </div>
        </div>
        <div class="grid2">
          <button type="button" onClick={() => onAnswer(false)} class="btn line">
            Annulla
          </button>
          <button type="button" onClick={() => onAnswer(true)} class="btn" style={{ background: 'var(--danger)', color: 'var(--canvas)' }}>
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
      class="rbtn sm trash"
    >
      <TrashG size={20} />
    </button>
  )
}
