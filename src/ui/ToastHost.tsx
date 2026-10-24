import { dismissToast, useToast } from '../state/toast'

export function ToastHost() {
  const toast = useToast()
  if (!toast) return null
  const action = toast.action
  return (
    <div
      role="status"
      class="toast-host"
      style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
    >
      <div class={`toast${action ? ' has-act' : ''}`}>
        <span class="toast-t">{toast.message}</span>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.run()
              dismissToast()
            }}
            class="toast-b"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
