// Fusi orari IANA per i selettori: prima quelli più usati in viaggio, poi tutti gli altri.

export const allTimezones: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? []
  } catch {
    return []
  }
})()

const COMMON = ['Europe/Rome', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Dubai', 'Europe/London', 'Atlantic/Reykjavik', 'America/New_York']

export function timezoneOptions(...first: string[]): { value: string; label: string }[] {
  const seen = new Set<string>()
  const out: { value: string; label: string }[] = []
  for (const z of [...first, ...COMMON, ...allTimezones]) {
    if (z && !seen.has(z)) {
      seen.add(z)
      out.push({ value: z, label: z })
    }
  }
  return out
}

/** «Asia/Tokyo» → «Tokyo (UTC+9)»: nome leggibile con la differenza dal meridiano di Greenwich di oggi. */
export function etichettaFuso(zone: string, now: Date = new Date()): string {
  const citta = zone.split('/').slice(1).join(' · ').replace(/_/g, ' ') || zone
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(now)
    const off = parts.find((p) => p.type === 'timeZoneName')?.value.replace('GMT', 'UTC') ?? ''
    return `${citta} (${off === 'UTC' ? 'UTC' : off})`
  } catch {
    return citta
  }
}

/** Fusi raggruppati per area («Europe», «Asia»…), con quelli indicati (usati nel viaggio) in testa. */
export function fusiRaggruppati(...usati: string[]): { gruppo: string; zone: { value: string; label: string }[] }[] {
  const visti = new Set<string>()
  const voce = (z: string) => ({ value: z, label: etichettaFuso(z) })
  const top = [...usati, ...COMMON].filter((z) => z && !visti.has(z) && (visti.add(z), true)).map(voce)
  const aree = new Map<string, { value: string; label: string }[]>()
  for (const z of allTimezones) {
    if (visti.has(z)) continue
    const area = z.includes('/') ? z.split('/')[0] : 'Altri'
    aree.set(area, [...(aree.get(area) ?? []), voce(z)])
  }
  return [{ gruppo: 'Usati più spesso', zone: top }, ...[...aree.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([gruppo, zone]) => ({ gruppo, zone }))]
}
