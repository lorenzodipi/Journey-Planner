// Avvisi in basso (regione degli avvisi di react-aria-components) con lo stile Faraway: sopra la barra delle schede,
// in fondo dove non ci sono schede, accanto alla barra laterale sugli schermi grandi (regole .fa-toasts / .fa-toast).
import { Button, Text, UNSTABLE_Toast as Toast, UNSTABLE_ToastContent as ToastContent, UNSTABLE_ToastRegion as ToastRegion } from 'react-aria-components'
import { codaAvvisi } from '../state/toast'

export function ToastHost() {
  return (
    <ToastRegion queue={codaAvvisi} className="fa-toasts" aria-label="Avvisi">
      {({ toast }) => (
        <Toast toast={toast} className="fa-toast">
          <ToastContent className="t">
            <Text slot="title">{toast.content.message}</Text>
          </ToastContent>
          {toast.content.action ? (
            <Button
              className="a"
              onPress={() => {
                toast.content.action?.run()
                codaAvvisi.close(toast.key)
              }}
            >
              {toast.content.action.label}
            </Button>
          ) : null}
        </Toast>
      )}
    </ToastRegion>
  )
}
