// Comodità del singolo utente (es. sezione aperta o chiusa): sta solo in questo telefono, mai nei dati del viaggio.

export function readFlag(key: string): boolean | null {
  try {
    const v = localStorage.getItem(key)
    return v === '1' ? true : v === '0' ? false : null
  } catch {
    return null
  }
}

export function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* niente: la scelta vale solo finché la pagina resta aperta */
  }
}
