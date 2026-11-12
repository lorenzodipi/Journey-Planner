import { currencyName } from './money'

// Tutte le valute per i selettori: quelle che conosce il motore del telefono, altrimenti un elenco ISO 4217 di riserva.

const FALLBACK = (
  'AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK ' +
  'DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF ' +
  'KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK ' +
  'PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD ' +
  'UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW ZWG'
).split(' ')

/** In cima, le valute più usate in viaggio. */
export const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'KRW', 'THB', 'ISK', 'NOK', 'SEK', 'DKK']

export function allCurrencies(): string[] {
  let found: string[] = []
  try {
    found = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('currency') ?? []
  } catch {
    found = []
  }
  const base = found.length > 0 ? found : FALLBACK
  return Array.from(new Set([...base, ...FALLBACK]))
}

export interface GruppoValute {
  gruppo: string
  valute: { code: string; label: string }[]
}

/** Per una <select> con tutte le valute: prima le più usate (e quelle in `extra`, es. il valore attuale), poi tutte le altre per codice. Ogni voce è «EUR · Euro». */
export function currencyGroups(...extra: string[]): GruppoValute[] {
  const voce = (code: string) => {
    const nome = currencyName(code)
    return { code, label: nome ? `${code} · ${nome}` : code }
  }
  const valide = (list: string[]) => list.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{3}$/.test(c))
  const prime = Array.from(new Set([...valide(extra).filter((c) => !COMMON_CURRENCIES.includes(c)), ...COMMON_CURRENCIES]))
  const altre = Array.from(new Set(valide(allCurrencies()))).filter((c) => !prime.includes(c)).sort()
  return [
    { gruppo: 'Più usate', valute: prime.map(voce) },
    { gruppo: 'Tutte le valute', valute: altre.map(voce) },
  ]
}
