import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { stampOpen } from './dialogStack'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ComponentChildren
}

/**
 * Pannello che sale dal basso (bottom sheet) basato sul <dialog> nativo:
 * focus intrappolato, tasto Esc e sfondo oscurato gestiti dal browser.
 */
export function Sheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      stampOpen(dialog)
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  if (!open) return <dialog ref={ref} />

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // un tocco sullo sfondo oscurato chiude il pannello
        if (e.target === e.currentTarget) onClose()
      }}
      class="sheet fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-x-0 border-b-0 border-t-2 border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/55"
    >
      <div class="px-5 pb-6 pt-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <span aria-hidden="true" class="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-line" />
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="font-display text-2xl font-extrabold leading-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            class="min-h-11 shrink-0 rounded-full px-3 text-sm font-bold text-muted"
          >
            Chiudi
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
