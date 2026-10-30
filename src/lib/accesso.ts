// Accesso (#48, mock Fa-01/Fa-02): controllo dell'email prima dell'invio.
/** Messaggio per l'email, o `null` se va bene. Vuota = nessun messaggio (lo dice il pulsante disattivato). */
export function erroreEmail(email: string): string | null {
  const v = email.trim()
  if (!v) return null
  const i = v.indexOf('@')
  if (i < 0) return 'Manca la chiocciola. Controlla l’indirizzo.'
  if (i === 0) return 'Manca la parte prima della chiocciola. Controlla l’indirizzo.'
  const dominio = v.slice(i + 1)
  if (!dominio || !dominio.includes('.') || dominio.startsWith('.') || dominio.endsWith('.')) return 'Manca la parte dopo la chiocciola. Controlla l’indirizzo.'
  if (/\s/.test(v) || v.indexOf('@', i + 1) >= 0) return 'L’indirizzo non è scritto bene. Controllalo.'
  return null
}
