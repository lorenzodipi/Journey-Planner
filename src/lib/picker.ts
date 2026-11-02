// Apre il selettore dell'orario del browser al tocco o al clic sul campo (da computer serve un clic sull'icona, qui basta il campo).
export function apriSelettore(el: HTMLInputElement): void {
  try {
    el.showPicker?.()
  } catch {
    // il browser non lo permette (es. fuori da un gesto dell'utente): resta il campo normale
  }
}
