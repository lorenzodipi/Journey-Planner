// Notifiche locali (#46). Qui solo il permesso: lo si chiede quando si attiva il primo interruttore (#45).
export type EsitoPermesso = { ok: true } | { ok: false; motivo: string }

export async function attivaNotifica(): Promise<EsitoPermesso> {
  return { ok: true }
}
