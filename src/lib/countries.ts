import type { ThemeName } from '../types'

// Tutti i paesi (ISO 3166-1) con valuta, fuso principale e capitale. Servono a proporre i valori di un nuovo viaggio
// (fuso, valuta locale, centro mappa) e a scegliere il paese di origine: restano tutti modificabili.
// L'elenco dei codici è statico perché le API Intl non lo enumerano; i nomi in italiano li dà Intl.DisplayNames.

export interface Country {
  code: string
  /** nome in italiano */
  name: string
  currency: string
  /** fuso principale */
  timezone: string
  /** capitale, per centrare la mappa */
  center: { lat: number; lng: number }
}

// codice | valuta | fuso principale | lat | lng (capitale)
const RAW = `
AD|EUR|Europe/Andorra|42.51|1.52
AE|AED|Asia/Dubai|24.45|54.38
AF|AFN|Asia/Kabul|34.53|69.17
AG|XCD|America/Antigua|17.12|-61.85
AI|XCD|America/Anguilla|18.22|-63.07
AL|ALL|Europe/Tirane|41.33|19.82
AM|AMD|Asia/Yerevan|40.18|44.51
AO|AOA|Africa/Luanda|-8.84|13.23
AQ|USD|Antarctica/McMurdo|-77.85|166.67
AR|ARS|America/Argentina/Buenos_Aires|-34.60|-58.38
AS|USD|Pacific/Pago_Pago|-14.28|-170.70
AT|EUR|Europe/Vienna|48.21|16.37
AU|AUD|Australia/Sydney|-35.28|149.13
AW|AWG|America/Aruba|12.52|-70.03
AX|EUR|Europe/Mariehamn|60.10|19.94
AZ|AZN|Asia/Baku|40.41|49.87
BA|BAM|Europe/Sarajevo|43.86|18.41
BB|BBD|America/Barbados|13.10|-59.61
BD|BDT|Asia/Dhaka|23.81|90.41
BE|EUR|Europe/Brussels|50.85|4.35
BF|XOF|Africa/Ouagadougou|12.37|-1.52
BG|EUR|Europe/Sofia|42.70|23.32
BH|BHD|Asia/Bahrain|26.23|50.59
BI|BIF|Africa/Bujumbura|-3.38|29.36
BJ|XOF|Africa/Porto-Novo|6.50|2.63
BL|EUR|America/St_Barthelemy|17.90|-62.85
BM|BMD|Atlantic/Bermuda|32.30|-64.78
BN|BND|Asia/Brunei|4.89|114.94
BO|BOB|America/La_Paz|-16.50|-68.15
BQ|USD|America/Kralendijk|12.15|-68.27
BR|BRL|America/Sao_Paulo|-15.79|-47.88
BS|BSD|America/Nassau|25.05|-77.35
BT|BTN|Asia/Thimphu|27.47|89.64
BV|NOK|Europe/Oslo|-54.42|3.36
BW|BWP|Africa/Gaborone|-24.65|25.91
BY|BYN|Europe/Minsk|53.90|27.57
BZ|BZD|America/Belize|17.25|-88.77
CA|CAD|America/Toronto|45.42|-75.70
CC|AUD|Indian/Cocos|-12.16|96.83
CD|CDF|Africa/Kinshasa|-4.44|15.27
CF|XAF|Africa/Bangui|4.36|18.56
CG|XAF|Africa/Brazzaville|-4.27|15.28
CH|CHF|Europe/Zurich|46.95|7.45
CI|XOF|Africa/Abidjan|6.82|-5.28
CK|NZD|Pacific/Rarotonga|-21.21|-159.78
CL|CLP|America/Santiago|-33.45|-70.67
CM|XAF|Africa/Douala|3.87|11.52
CN|CNY|Asia/Shanghai|39.90|116.41
CO|COP|America/Bogota|4.71|-74.07
CR|CRC|America/Costa_Rica|9.93|-84.08
CU|CUP|America/Havana|23.11|-82.37
CV|CVE|Atlantic/Cape_Verde|14.93|-23.51
CW|ANG|America/Curacao|12.12|-68.93
CX|AUD|Indian/Christmas|-10.42|105.68
CY|EUR|Asia/Nicosia|35.17|33.36
CZ|CZK|Europe/Prague|50.08|14.44
DE|EUR|Europe/Berlin|52.52|13.40
DJ|DJF|Africa/Djibouti|11.59|43.15
DK|DKK|Europe/Copenhagen|55.68|12.57
DM|XCD|America/Dominica|15.30|-61.39
DO|DOP|America/Santo_Domingo|18.49|-69.93
DZ|DZD|Africa/Algiers|36.75|3.06
EC|USD|America/Guayaquil|-0.18|-78.47
EE|EUR|Europe/Tallinn|59.44|24.75
EG|EGP|Africa/Cairo|30.04|31.24
EH|MAD|Africa/El_Aaiun|27.15|-13.20
ER|ERN|Africa/Asmara|15.32|38.93
ES|EUR|Europe/Madrid|40.42|-3.70
ET|ETB|Africa/Addis_Ababa|9.03|38.74
FI|EUR|Europe/Helsinki|60.17|24.94
FJ|FJD|Pacific/Fiji|-18.14|178.44
FK|FKP|Atlantic/Stanley|-51.70|-57.85
FM|USD|Pacific/Pohnpei|6.92|158.16
FO|DKK|Atlantic/Faroe|62.01|-6.77
FR|EUR|Europe/Paris|48.86|2.35
GA|XAF|Africa/Libreville|0.42|9.47
GB|GBP|Europe/London|51.51|-0.13
GD|XCD|America/Grenada|12.06|-61.75
GE|GEL|Asia/Tbilisi|41.72|44.79
GF|EUR|America/Cayenne|4.92|-52.31
GG|GBP|Europe/Guernsey|49.45|-2.54
GH|GHS|Africa/Accra|5.60|-0.19
GI|GIP|Europe/Gibraltar|36.14|-5.35
GL|DKK|America/Nuuk|64.18|-51.72
GM|GMD|Africa/Banjul|13.45|-16.58
GN|GNF|Africa/Conakry|9.64|-13.58
GP|EUR|America/Guadeloupe|16.24|-61.53
GQ|XAF|Africa/Malabo|3.75|8.78
GR|EUR|Europe/Athens|37.98|23.73
GS|GBP|Atlantic/South_Georgia|-54.28|-36.51
GT|GTQ|America/Guatemala|14.63|-90.51
GU|USD|Pacific/Guam|13.44|144.79
GW|XOF|Africa/Bissau|11.86|-15.60
GY|GYD|America/Guyana|6.80|-58.16
HK|HKD|Asia/Hong_Kong|22.32|114.17
HM|AUD|Indian/Kerguelen|-53.10|73.52
HN|HNL|America/Tegucigalpa|14.07|-87.19
HR|EUR|Europe/Zagreb|45.81|15.98
HT|HTG|America/Port-au-Prince|18.54|-72.34
HU|HUF|Europe/Budapest|47.50|19.04
ID|IDR|Asia/Jakarta|-6.21|106.85
IE|EUR|Europe/Dublin|53.35|-6.26
IL|ILS|Asia/Jerusalem|31.77|35.21
IM|GBP|Europe/Isle_of_Man|54.15|-4.48
IN|INR|Asia/Kolkata|28.61|77.21
IO|USD|Indian/Chagos|-7.31|72.42
IQ|IQD|Asia/Baghdad|33.31|44.37
IR|IRR|Asia/Tehran|35.69|51.39
IS|ISK|Atlantic/Reykjavik|64.15|-21.94
IT|EUR|Europe/Rome|41.90|12.50
JE|GBP|Europe/Jersey|49.19|-2.11
JM|JMD|America/Jamaica|18.00|-76.79
JO|JOD|Asia/Amman|31.95|35.93
JP|JPY|Asia/Tokyo|35.68|139.77
KE|KES|Africa/Nairobi|-1.29|36.82
KG|KGS|Asia/Bishkek|42.87|74.59
KH|KHR|Asia/Phnom_Penh|11.56|104.93
KI|AUD|Pacific/Tarawa|1.45|173.03
KM|KMF|Indian/Comoro|-11.70|43.26
KN|XCD|America/St_Kitts|17.30|-62.72
KP|KPW|Asia/Pyongyang|39.04|125.76
KR|KRW|Asia/Seoul|37.57|126.98
KW|KWD|Asia/Kuwait|29.38|47.99
KY|KYD|America/Cayman|19.29|-81.37
KZ|KZT|Asia/Almaty|51.17|71.43
LA|LAK|Asia/Vientiane|17.97|102.63
LB|LBP|Asia/Beirut|33.89|35.50
LC|XCD|America/St_Lucia|14.01|-60.99
LI|CHF|Europe/Vaduz|47.14|9.52
LK|LKR|Asia/Colombo|6.93|79.86
LR|LRD|Africa/Monrovia|6.30|-10.80
LS|LSL|Africa/Maseru|-29.31|27.48
LT|EUR|Europe/Vilnius|54.69|25.28
LU|EUR|Europe/Luxembourg|49.61|6.13
LV|EUR|Europe/Riga|56.95|24.11
LY|LYD|Africa/Tripoli|32.89|13.19
MA|MAD|Africa/Casablanca|34.02|-6.84
MC|EUR|Europe/Monaco|43.74|7.42
MD|MDL|Europe/Chisinau|47.01|28.86
ME|EUR|Europe/Podgorica|42.44|19.26
MF|EUR|America/Marigot|18.07|-63.08
MG|MGA|Indian/Antananarivo|-18.88|47.51
MH|USD|Pacific/Majuro|7.09|171.38
MK|MKD|Europe/Skopje|42.00|21.43
ML|XOF|Africa/Bamako|12.64|-8.00
MM|MMK|Asia/Yangon|19.76|96.08
MN|MNT|Asia/Ulaanbaatar|47.89|106.91
MO|MOP|Asia/Macau|22.20|113.54
MP|USD|Pacific/Saipan|15.21|145.75
MQ|EUR|America/Martinique|14.60|-61.07
MR|MRU|Africa/Nouakchott|18.08|-15.98
MS|XCD|America/Montserrat|16.71|-62.21
MT|EUR|Europe/Malta|35.90|14.51
MU|MUR|Indian/Mauritius|-20.16|57.50
MV|MVR|Indian/Maldives|4.18|73.51
MW|MWK|Africa/Blantyre|-13.96|33.77
MX|MXN|America/Mexico_City|19.43|-99.13
MY|MYR|Asia/Kuala_Lumpur|3.14|101.69
MZ|MZN|Africa/Maputo|-25.97|32.57
NA|NAD|Africa/Windhoek|-22.56|17.08
NC|XPF|Pacific/Noumea|-22.28|166.46
NE|XOF|Africa/Niamey|13.51|2.11
NF|AUD|Pacific/Norfolk|-29.05|167.96
NG|NGN|Africa/Lagos|9.08|7.40
NI|NIO|America/Managua|12.11|-86.24
NL|EUR|Europe/Amsterdam|52.37|4.90
NO|NOK|Europe/Oslo|59.91|10.75
NP|NPR|Asia/Kathmandu|27.72|85.32
NR|AUD|Pacific/Nauru|-0.55|166.92
NU|NZD|Pacific/Niue|-19.06|-169.92
NZ|NZD|Pacific/Auckland|-41.29|174.78
OM|OMR|Asia/Muscat|23.59|58.41
PA|PAB|America/Panama|8.98|-79.52
PE|PEN|America/Lima|-12.05|-77.04
PF|XPF|Pacific/Tahiti|-17.54|-149.57
PG|PGK|Pacific/Port_Moresby|-9.44|147.18
PH|PHP|Asia/Manila|14.60|120.98
PK|PKR|Asia/Karachi|33.69|73.05
PL|PLN|Europe/Warsaw|52.23|21.01
PM|EUR|America/Miquelon|46.78|-56.18
PN|NZD|Pacific/Pitcairn|-25.07|-130.10
PR|USD|America/Puerto_Rico|18.47|-66.11
PS|ILS|Asia/Gaza|31.90|35.20
PT|EUR|Europe/Lisbon|38.72|-9.14
PW|USD|Pacific/Palau|7.50|134.62
PY|PYG|America/Asuncion|-25.26|-57.58
QA|QAR|Asia/Qatar|25.29|51.53
RE|EUR|Indian/Reunion|-20.88|55.45
RO|RON|Europe/Bucharest|44.43|26.10
RS|RSD|Europe/Belgrade|44.79|20.45
RU|RUB|Europe/Moscow|55.76|37.62
RW|RWF|Africa/Kigali|-1.95|30.06
SA|SAR|Asia/Riyadh|24.71|46.68
SB|SBD|Pacific/Guadalcanal|-9.43|159.95
SC|SCR|Indian/Mahe|-4.62|55.45
SD|SDG|Africa/Khartoum|15.50|32.56
SE|SEK|Europe/Stockholm|59.33|18.07
SG|SGD|Asia/Singapore|1.35|103.82
SH|SHP|Atlantic/St_Helena|-15.97|-5.72
SI|EUR|Europe/Ljubljana|46.06|14.51
SJ|NOK|Arctic/Longyearbyen|78.22|15.63
SK|EUR|Europe/Bratislava|48.15|17.11
SL|SLE|Africa/Freetown|8.48|-13.23
SM|EUR|Europe/San_Marino|43.94|12.45
SN|XOF|Africa/Dakar|14.72|-17.47
SO|SOS|Africa/Mogadishu|2.05|45.32
SR|SRD|America/Paramaribo|5.85|-55.20
SS|SSP|Africa/Juba|4.85|31.58
ST|STN|Africa/Sao_Tome|0.34|6.73
SV|USD|America/El_Salvador|13.69|-89.19
SX|ANG|America/Lower_Princes|18.02|-63.05
SY|SYP|Asia/Damascus|33.51|36.29
SZ|SZL|Africa/Mbabane|-26.31|31.14
TC|USD|America/Grand_Turk|21.46|-71.14
TD|XAF|Africa/Ndjamena|12.13|15.06
TF|EUR|Indian/Kerguelen|-49.35|70.22
TG|XOF|Africa/Lome|6.13|1.22
TH|THB|Asia/Bangkok|13.76|100.50
TJ|TJS|Asia/Dushanbe|38.56|68.77
TK|NZD|Pacific/Fakaofo|-9.38|-171.25
TL|USD|Asia/Dili|-8.56|125.57
TM|TMT|Asia/Ashgabat|37.96|58.33
TN|TND|Africa/Tunis|36.81|10.18
TO|TOP|Pacific/Tongatapu|-21.14|-175.20
TR|TRY|Europe/Istanbul|39.93|32.86
TT|TTD|America/Port_of_Spain|10.66|-61.52
TV|AUD|Pacific/Funafuti|-8.52|179.20
TW|TWD|Asia/Taipei|25.03|121.57
TZ|TZS|Africa/Dar_es_Salaam|-6.16|35.75
UA|UAH|Europe/Kyiv|50.45|30.52
UG|UGX|Africa/Kampala|0.35|32.58
UM|USD|Pacific/Wake|19.28|166.65
US|USD|America/New_York|38.91|-77.04
UY|UYU|America/Montevideo|-34.90|-56.19
UZ|UZS|Asia/Tashkent|41.30|69.24
VA|EUR|Europe/Vatican|41.90|12.45
VC|XCD|America/St_Vincent|13.16|-61.23
VE|VES|America/Caracas|10.48|-66.90
VG|USD|America/Tortola|18.43|-64.62
VI|USD|America/St_Thomas|18.34|-64.93
VN|VND|Asia/Ho_Chi_Minh|21.03|105.85
VU|VUV|Pacific/Efate|-17.73|168.32
WF|XPF|Pacific/Wallis|-13.28|-176.17
WS|WST|Pacific/Apia|-13.83|-171.76
YE|YER|Asia/Aden|15.37|44.19
YT|EUR|Indian/Mayotte|-12.78|45.23
ZA|ZAR|Africa/Johannesburg|-25.75|28.19
ZM|ZMW|Africa/Lusaka|-15.39|28.32
ZW|ZWG|Africa/Harare|-17.83|31.05
`

/** Paesi con più fusi orari: oltre al principale (il primo), gli altri tra cui scegliere. */
const ZONES: Record<string, string[]> = {
  US: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'],
  CA: ['America/Toronto', 'America/Halifax', 'America/St_Johns', 'America/Winnipeg', 'America/Edmonton', 'America/Vancouver'],
  BR: ['America/Sao_Paulo', 'America/Manaus', 'America/Fortaleza', 'America/Rio_Branco', 'America/Noronha'],
  AU: ['Australia/Sydney', 'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Darwin', 'Australia/Perth', 'Australia/Hobart'],
  RU: ['Europe/Moscow', 'Europe/Kaliningrad', 'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk', 'Asia/Yakutsk', 'Asia/Vladivostok', 'Asia/Magadan', 'Asia/Kamchatka'],
  MX: ['America/Mexico_City', 'America/Cancun', 'America/Hermosillo', 'America/Tijuana'],
  ID: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'],
  KZ: ['Asia/Almaty', 'Asia/Aqtobe'],
  PT: ['Europe/Lisbon', 'Atlantic/Azores'],
  ES: ['Europe/Madrid', 'Atlantic/Canary'],
  CL: ['America/Santiago', 'America/Punta_Arenas', 'Pacific/Easter'],
  EC: ['America/Guayaquil', 'Pacific/Galapagos'],
  NZ: ['Pacific/Auckland', 'Pacific/Chatham'],
  CN: ['Asia/Shanghai', 'Asia/Urumqi'],
  MN: ['Asia/Ulaanbaatar', 'Asia/Hovd'],
  CD: ['Africa/Kinshasa', 'Africa/Lubumbashi'],
  GL: ['America/Nuuk', 'America/Thule'],
  FR: ['Europe/Paris'],
  DK: ['Europe/Copenhagen'],
}

const collator = new Intl.Collator('it')

function regionName(code: string): string {
  for (const lang of ['it', 'en']) {
    try {
      const n = new Intl.DisplayNames(lang, { type: 'region' }).of(code)
      if (n && n !== code) return n
    } catch {
      /* lingua o codice non gestiti: si prova la prossima */
    }
  }
  return code
}

export const COUNTRIES: Country[] = RAW.trim()
  .split('\n')
  .map((line) => {
    const [code, currency, timezone, lat, lng] = line.split('|')
    return { code, name: regionName(code), currency, timezone, center: { lat: Number(lat), lng: Number(lng) } }
  })
  .sort((a, b) => collator.compare(a.name, b.name))

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]))
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const byName = new Map(COUNTRIES.map((c) => [norm(c.name), c]))

export function countryByCode(code: string | undefined | null): Country | undefined {
  return code ? byCode.get(code.toUpperCase()) : undefined
}

/** Il paese con questo nome (in italiano, senza badare a maiuscole e accenti); undefined per un testo libero. */
export function countryByName(name: string | undefined | null): Country | undefined {
  return name ? byName.get(norm(name)) : undefined
}

/** I fusi tra cui scegliere per un paese: uno solo per quasi tutti, più d'uno per i paesi grandi. */
export function zonesOf(code: string): string[] {
  const c = countryByCode(code)
  if (!c) return []
  const zones = ZONES[c.code]
  return zones && zones.length > 1 ? zones : [c.timezone]
}

/** Il tema dell'app che segue il paese. */
export function themeForCountry(code: string): ThemeName {
  return code === 'JP' ? 'japan' : code === 'IS' ? 'iceland' : 'default'
}
