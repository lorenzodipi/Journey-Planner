// Il tasto Invio (o «Fine» della tastiera del telefono) in un campo di un modulo non invia il modulo: chiude solo la tastiera.
// I moduli si salvano con il loro pulsante. Fa eccezione un modulo con `data-invio` (l'accesso), dove Invio è comodo.

const NON_TESTO = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color'])

/** Vero se Invio in questo elemento deve solo chiudere la tastiera invece di inviare il modulo. */
export function bloccaInvio(el: EventTarget | null): el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement)) return false
  if (NON_TESTO.has(el.type)) return false
  const form = el.form
  return !!form && !form.hasAttribute('data-invio')
}

/**
 * Vero se questo invio del modulo va fermato: il modulo non è dell'accesso e l'invio non viene da un suo pulsante (cioè è
 * l'invio «implicito» del tasto Invio o «Vai»). Sul telefono Invio mentre la tastiera sta completando una parola non
 * arriva come tasto Invio e il blocco sul tasto non basta: questo è l'ultimo controllo, sull'invio vero e proprio.
 */
export function bloccaInvioModulo(e: Event): boolean {
  const form = e.target
  if (!(form instanceof HTMLFormElement) || form.hasAttribute('data-invio')) return false
  if (!('submitter' in e)) return false // browser vecchio: resta solo il blocco sul tasto
  const mittente = (e as SubmitEvent).submitter
  return !(mittente instanceof HTMLButtonElement || (mittente instanceof HTMLInputElement && (mittente.type === 'submit' || mittente.type === 'image')))
}

export function setupInvioSenzaInvio(doc: Document = document): () => void {
  const premi = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.isComposing || e.defaultPrevented) return
    if (!bloccaInvio(e.target)) return
    e.preventDefault()
    // sul telefono si chiude la tastiera; con mouse e tastiera il focus resta dov'è
    if (matchMedia('(pointer: coarse)').matches) e.target.blur()
  }
  // la tastiera del telefono mostra «Fine» invece di «Vai»/«Invia», così il tasto dice quello che fa
  const entra = (e: FocusEvent) => {
    if (bloccaInvio(e.target) && !e.target.hasAttribute('enterkeyhint')) e.target.setAttribute('enterkeyhint', 'done')
  }
  const invia = (e: Event) => {
    if (!bloccaInvioModulo(e)) return
    e.preventDefault()
    e.stopImmediatePropagation()
    const campo = doc.activeElement
    if (campo instanceof HTMLInputElement && matchMedia('(pointer: coarse)').matches) campo.blur()
  }
  doc.addEventListener('keydown', premi, true)
  doc.addEventListener('submit', invia, true)
  doc.addEventListener('focusin', entra, true)
  return () => {
    doc.removeEventListener('submit', invia, true)
    doc.removeEventListener('keydown', premi, true)
    doc.removeEventListener('focusin', entra, true)
  }
}
