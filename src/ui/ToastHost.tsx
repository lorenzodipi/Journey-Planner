import { dismissToast, useToast } from '../state/toast'

export function ToastHost() {
  const toast = useToast()
  if (!toast) return null
  return (
    <div
      role="status"
      class="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
    >
      <div class="pointer-events-auto flex min-h-12 max-w-md items-center gap-3 rounded-full border-2 border-line bg-surface py-1 pl-5 pr-2 text-sm text-ink shadow-[0_8px_20px_rgb(0_0_0/0.45)]">
        <span class="min-w-0 flex-1 truncate">{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.run()
              dismissToast()
            }}
            class="min-h-11 shrink-0 rounded-full px-4 font-extrabold text-pale"
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}
