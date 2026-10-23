import { currencyName, currencySymbol } from './money'
import type { SelectOption } from '../ui/Select'

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

/** Opzioni per il selettore: le più comuni, poi tutte le altre in ordine alfabetico; `extra` (es. il valore attuale) non va perso. */
export function currencyOptions(...extra: string[]): SelectOption[] {
  const codes = new Set<string>()
  const add = (c: string) => {
    const code = c.trim().toUpperCase()
    if (/^[A-Z]{3}$/.test(code)) codes.add(code)
  }
  extra.forEach(add)
  COMMON_CURRENCIES.forEach(add)
  allCurrencies().sort().forEach(add)
  return Array.from(codes).map((code) => {
    const name = currencyName(code)
    const symbol = currencySymbol(code)
    return { value: code, label: code, hint: [name, symbol !== code ? symbol : ''].filter(Boolean).join(' · ') || undefined }
  })
}
