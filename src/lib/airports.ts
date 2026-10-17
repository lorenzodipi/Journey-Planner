// Aeroporti più comuni con il fuso IANA: precompila il fuso quando si scrive il codice IATA.
// Non è un elenco completo: per gli altri il fuso si scrive a mano (resta sempre modificabile).

export const AIRPORT_TZ: Record<string, string> = {
  MXP: 'Europe/Rome', LIN: 'Europe/Rome', BGY: 'Europe/Rome', FCO: 'Europe/Rome', CIA: 'Europe/Rome',
  VCE: 'Europe/Rome', BLQ: 'Europe/Rome', NAP: 'Europe/Rome', PSA: 'Europe/Rome', TRN: 'Europe/Rome',
  LHR: 'Europe/London', LGW: 'Europe/London', CDG: 'Europe/Paris', ORY: 'Europe/Paris',
  FRA: 'Europe/Berlin', MUC: 'Europe/Berlin', AMS: 'Europe/Amsterdam', MAD: 'Europe/Madrid',
  BCN: 'Europe/Madrid', ZRH: 'Europe/Zurich', VIE: 'Europe/Vienna', IST: 'Europe/Istanbul',
  DOH: 'Asia/Qatar', DXB: 'Asia/Dubai', AUH: 'Asia/Dubai', HEL: 'Europe/Helsinki', KEF: 'Atlantic/Reykjavik',
  PEK: 'Asia/Shanghai', PKX: 'Asia/Shanghai', PVG: 'Asia/Shanghai', SHA: 'Asia/Shanghai',
  CAN: 'Asia/Shanghai', CTU: 'Asia/Shanghai', HKG: 'Asia/Hong_Kong', TPE: 'Asia/Taipei',
  ICN: 'Asia/Seoul', GMP: 'Asia/Seoul', SIN: 'Asia/Singapore', BKK: 'Asia/Bangkok',
  HND: 'Asia/Tokyo', NRT: 'Asia/Tokyo', KIX: 'Asia/Tokyo', ITM: 'Asia/Tokyo', NGO: 'Asia/Tokyo',
  FUK: 'Asia/Tokyo', CTS: 'Asia/Tokyo', OKA: 'Asia/Tokyo',
  JFK: 'America/New_York', EWR: 'America/New_York', BOS: 'America/New_York', ATL: 'America/New_York',
  ORD: 'America/Chicago', DFW: 'America/Chicago', LAX: 'America/Los_Angeles', SFO: 'America/Los_Angeles',
  SEA: 'America/Los_Angeles', YYZ: 'America/Toronto', SYD: 'Australia/Sydney', MEL: 'Australia/Melbourne',
}

/** Fuso noto per un codice IATA (maiuscole/minuscole indifferenti), altrimenti `undefined`. */
export function timezoneForAirport(code: string): string | undefined {
  return AIRPORT_TZ[code.trim().toUpperCase()]
}

export const isIata = (code: string) => /^[A-Za-z]{3}$/.test(code.trim())
