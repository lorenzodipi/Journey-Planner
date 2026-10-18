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
