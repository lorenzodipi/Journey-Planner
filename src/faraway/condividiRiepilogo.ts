// «Condividi il riepilogo»: l'immagine della card viola con il testo; se il telefono non condivide file la scarica.
import { t as tt } from '../i18n'
import { showToast } from '../state/toast'
import { nodeToPng } from './condividiImmagine'

export async function condividiRiepilogo(el: HTMLElement | null, text: string): Promise<void> {
  try {
    const blob = el ? await nodeToPng(el) : null
    const file = blob ? new File([blob], 'faraway-viaggio.png', { type: 'image/png' }) : null
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text })
    } else if (file) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file)
      a.download = file.name
      a.click()
      showToast(tt('Immagine scaricata'))
    } else if (navigator.share) await navigator.share({ text })
  } catch {
    // condivisione annullata
  }
}
