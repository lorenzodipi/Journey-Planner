import { dismissToast, useToast } from '../state/toast'

export function ToastHost() {
  const toast = useToast()
  if (!toast) return null
  const action = toast.action
  return (
    <div
      role="status"
      class="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
    >
      {/* Senza pulsante: padding simmetrico e testo centrato. Con "Annulla": il pulsante a destra
          porta il suo spazio, quindi il padding sinistro è più largo per bilanciare. */}
      <div
        class={`pointer-events-auto flex min-h-12 max-w-md items-center rounded-full border-2 border-line bg-surface py-1 text-sm leading-snug text-ink shadow-[0_8px_20px_rgb(0_0_0/0.45)] ${action ? 'gap-2 pl-5 pr-1.5' : 'justify-center px-5'}`}
      >
        <span class={`line-clamp-2 min-w-0 ${action ? 'flex-1' : 'text-center'}`}>{toast.message}</span>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.run()
              dismissToast()
            }}
            class="min-h-11 shrink-0 rounded-full px-4 font-extrabold text-pale"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
