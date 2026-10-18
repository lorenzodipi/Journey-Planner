// Ordine di apertura dei <dialog>: serve al gesto "indietro" dell'app per chiudere quello più in alto,
// che non è per forza l'ultimo nel documento (un popup di conferma può stare prima di un pannello già aperto).
let counter = 0

/** Si chiama quando si apre un dialog con showModal(). */
export function stampOpen(dialog: HTMLDialogElement): void {
  dialog.dataset.openSeq = String(++counter)
}

/** Il dialog aperto più in alto (aperto per ultimo), se ce n'è uno. */
export function topDialog(root: ParentNode = document): HTMLDialogElement | undefined {
  let top: HTMLDialogElement | undefined
  let best = -1
  for (const d of root.querySelectorAll<HTMLDialogElement>('dialog[open]')) {
    const seq = Number(d.dataset.openSeq ?? 0)
    if (seq >= best) {
      best = seq
      top = d
    }
  }
  return top
}
