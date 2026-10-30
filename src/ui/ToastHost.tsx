import { dismissToast, useToast } from '../state/toast'

export function ToastHost() {
  const toast = useToast()
  if (!toast) return null
  const action = toast.action
  return (
    <div
      role="status"
      className="toast-host"
      style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className={`toast${action ? ' has-act' : ''}`}>
        <span className="toast-t">{toast.message}</span>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.run()
              dismissToast()
            }}
            className="toast-b"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
