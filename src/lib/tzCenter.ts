// Dove si trova, grosso modo, un fuso orario: serve ad alba/tramonto, meteo e mappa quando il viaggio non ha
// una posizione precisa. Senza questo, un viaggio creato con «Altro» e un fuso a scelta (es. Asia/Shanghai)
// restava con il centro di Roma e calcolava il sole di Roma nell'orario della Cina.
// Sono le città principali di ogni fuso: bastano per ore di luce e meteo, non per navigare.
import { DEFAULT_CENTER } from './tripForm'
import { tzOffsetMinutes } from './sun'

export interface LatLng {
  lat: number
  lng: number
}

const c = (lat: number, lng: number): LatLng => ({ lat, lng })

const CITIES: Record<string, LatLng> = {
  // Europa
  'Europe/Rome': c(41.9, 12.5), 'Europe/London': c(51.51, -0.13), 'Europe/Paris': c(48.86, 2.35), 'Europe/Berlin': c(52.52, 13.4),
  'Europe/Madrid': c(40.42, -3.7), 'Europe/Lisbon': c(38.72, -9.14), 'Europe/Dublin': c(53.35, -6.26), 'Europe/Amsterdam': c(52.37, 4.9),
  'Europe/Brussels': c(50.85, 4.35), 'Europe/Zurich': c(47.38, 8.54), 'Europe/Vienna': c(48.21, 16.37), 'Europe/Prague': c(50.08, 14.44),
  'Europe/Warsaw': c(52.23, 21.01), 'Europe/Budapest': c(47.5, 19.04), 'Europe/Athens': c(37.98, 23.73), 'Europe/Istanbul': c(41.01, 28.98),
  'Europe/Helsinki': c(60.17, 24.94), 'Europe/Stockholm': c(59.33, 18.07), 'Europe/Oslo': c(59.91, 10.75), 'Europe/Copenhagen': c(55.68, 12.57),
  'Europe/Moscow': c(55.76, 37.62), 'Europe/Kyiv': c(50.45, 30.52), 'Europe/Kiev': c(50.45, 30.52), 'Europe/Bucharest': c(44.43, 26.1),
  'Europe/Sofia': c(42.7, 23.32), 'Europe/Belgrade': c(44.79, 20.45), 'Europe/Zagreb': c(45.81, 15.98), 'Europe/Malta': c(35.9, 14.51),
  'Europe/Luxembourg': c(49.61, 6.13), 'Europe/Riga': c(56.95, 24.11), 'Europe/Vilnius': c(54.69, 25.28), 'Europe/Tallinn': c(59.44, 24.75),
  'Europe/Minsk': c(53.9, 27.57), 'Europe/Sarajevo': c(43.86, 18.41), 'Europe/Ljubljana': c(46.06, 14.51), 'Europe/Bratislava': c(48.15, 17.11),
  'Atlantic/Reykjavik': c(64.15, -21.94), 'Atlantic/Azores': c(37.74, -25.67), 'Atlantic/Canary': c(28.12, -15.43), 'Atlantic/Madeira': c(32.65, -16.91),
  'Atlantic/Bermuda': c(32.3, -64.78), 'Atlantic/Cape_Verde': c(14.93, -23.51),
  // Asia
  'Asia/Tokyo': c(35.68, 139.77), 'Asia/Seoul': c(37.57, 126.98), 'Asia/Shanghai': c(31.23, 121.47), 'Asia/Hong_Kong': c(22.32, 114.17),
  'Asia/Macau': c(22.2, 113.54), 'Asia/Taipei': c(25.03, 121.57), 'Asia/Singapore': c(1.35, 103.82), 'Asia/Bangkok': c(13.76, 100.5),
  'Asia/Ho_Chi_Minh': c(10.82, 106.63), 'Asia/Saigon': c(10.82, 106.63), 'Asia/Jakarta': c(-6.21, 106.85), 'Asia/Manila': c(14.6, 120.98),
  'Asia/Kuala_Lumpur': c(3.14, 101.69), 'Asia/Kolkata': c(28.61, 77.21), 'Asia/Calcutta': c(28.61, 77.21), 'Asia/Dubai': c(25.2, 55.27),
  'Asia/Tehran': c(35.69, 51.39), 'Asia/Karachi': c(24.86, 67.01), 'Asia/Dhaka': c(23.81, 90.41), 'Asia/Kathmandu': c(27.72, 85.32),
  'Asia/Katmandu': c(27.72, 85.32), 'Asia/Colombo': c(6.93, 79.86), 'Asia/Yangon': c(16.84, 96.17), 'Asia/Rangoon': c(16.84, 96.17),
  'Asia/Tashkent': c(41.3, 69.24), 'Asia/Almaty': c(43.24, 76.89), 'Asia/Jerusalem': c(31.77, 35.22), 'Asia/Riyadh': c(24.71, 46.68),
  'Asia/Baghdad': c(33.31, 44.36), 'Asia/Qatar': c(25.29, 51.53), 'Asia/Ulaanbaatar': c(47.89, 106.91), 'Asia/Vladivostok': c(43.12, 131.89),
  'Asia/Novosibirsk': c(55.03, 82.92), 'Asia/Yekaterinburg': c(56.84, 60.6), 'Asia/Phnom_Penh': c(11.56, 104.93), 'Asia/Vientiane': c(17.97, 102.63),
  'Asia/Tbilisi': c(41.72, 44.79), 'Asia/Yerevan': c(40.18, 44.51), 'Asia/Baku': c(40.41, 49.87), 'Asia/Beirut': c(33.89, 35.5),
  'Asia/Amman': c(31.95, 35.93), 'Asia/Kabul': c(34.53, 69.17), 'Asia/Brunei': c(4.89, 114.94), 'Asia/Kuwait': c(29.38, 47.99),
  'Asia/Muscat': c(23.59, 58.41), 'Asia/Bahrain': c(26.23, 50.59), 'Asia/Damascus': c(33.51, 36.29), 'Asia/Thimphu': c(27.47, 89.64),
  'Asia/Bishkek': c(42.87, 74.59), 'Asia/Krasnoyarsk': c(56.01, 92.85), 'Asia/Irkutsk': c(52.29, 104.3), 'Asia/Yakutsk': c(62.03, 129.73),
  'Asia/Magadan': c(59.56, 150.8), 'Asia/Kamchatka': c(53.04, 158.65), 'Asia/Omsk': c(54.99, 73.37),
  // Africa
  'Africa/Cairo': c(30.04, 31.24), 'Africa/Johannesburg': c(-26.2, 28.05), 'Africa/Lagos': c(6.52, 3.38), 'Africa/Nairobi': c(-1.29, 36.82),
  'Africa/Casablanca': c(33.57, -7.59), 'Africa/Algiers': c(36.75, 3.06), 'Africa/Tunis': c(36.81, 10.18), 'Africa/Addis_Ababa': c(9.03, 38.74),
  'Africa/Accra': c(5.6, -0.19), 'Africa/Dakar': c(14.72, -17.47), 'Africa/Dar_es_Salaam': c(-6.79, 39.21), 'Africa/Kinshasa': c(-4.44, 15.27),
  'Africa/Luanda': c(-8.84, 13.23), 'Africa/Khartoum': c(15.5, 32.56), 'Africa/Tripoli': c(32.89, 13.19), 'Africa/Maputo': c(-25.97, 32.57),
  'Africa/Harare': c(-17.83, 31.05), 'Africa/Windhoek': c(-22.56, 17.08), 'Africa/Abidjan': c(5.36, -4.01), 'Africa/Kampala': c(0.35, 32.58),
  'Africa/Lusaka': c(-15.39, 28.32), 'Africa/Kigali': c(-1.95, 30.06), 'Africa/Mogadishu': c(2.05, 45.32),
  'Indian/Mauritius': c(-20.16, 57.5), 'Indian/Maldives': c(4.18, 73.51), 'Indian/Reunion': c(-21.12, 55.54), 'Indian/Antananarivo': c(-18.88, 47.51),
  // Americhe
  'America/New_York': c(40.71, -74.01), 'America/Chicago': c(41.88, -87.63), 'America/Denver': c(39.74, -104.99), 'America/Los_Angeles': c(34.05, -118.24),
  'America/Phoenix': c(33.45, -112.07), 'America/Anchorage': c(61.22, -149.9), 'America/Toronto': c(43.65, -79.38), 'America/Vancouver': c(49.28, -123.12),
  'America/Halifax': c(44.65, -63.57), 'America/Edmonton': c(53.55, -113.49), 'America/Winnipeg': c(49.9, -97.14), 'America/St_Johns': c(47.56, -52.71),
  'America/Mexico_City': c(19.43, -99.13), 'America/Cancun': c(21.16, -86.85), 'America/Bogota': c(4.71, -74.07), 'America/Lima': c(-12.05, -77.04),
  'America/Santiago': c(-33.45, -70.67), 'America/Argentina/Buenos_Aires': c(-34.6, -58.38), 'America/Buenos_Aires': c(-34.6, -58.38),
  'America/Sao_Paulo': c(-23.55, -46.63), 'America/Caracas': c(10.48, -66.9), 'America/Havana': c(23.11, -82.37), 'America/Panama': c(8.98, -79.52),
  'America/Costa_Rica': c(9.93, -84.08), 'America/Guatemala': c(14.63, -90.51), 'America/Puerto_Rico': c(18.47, -66.11), 'America/Montevideo': c(-34.9, -56.16),
  'America/La_Paz': c(-16.5, -68.15), 'America/Guayaquil': c(-2.19, -79.89), 'America/Jamaica': c(18.0, -76.79), 'America/Santo_Domingo': c(18.49, -69.93),
  'America/Manaus': c(-3.12, -60.02), 'America/Asuncion': c(-25.26, -57.58), 'America/El_Salvador': c(13.69, -89.19), 'America/Tegucigalpa': c(14.07, -87.19),
  'America/Managua': c(12.11, -86.24), 'America/Nassau': c(25.05, -77.36), 'America/Godthab': c(64.18, -51.72), 'America/Nuuk': c(64.18, -51.72),
  'America/Montreal': c(45.5, -73.57), 'America/Detroit': c(42.33, -83.05), 'America/Boise': c(43.62, -116.2), 'America/Bahia': c(-12.97, -38.5),
  // Oceania e Pacifico
  'Australia/Sydney': c(-33.87, 151.21), 'Australia/Melbourne': c(-37.81, 144.96), 'Australia/Brisbane': c(-27.47, 153.03), 'Australia/Perth': c(-31.95, 115.86),
  'Australia/Adelaide': c(-34.93, 138.6), 'Australia/Darwin': c(-12.46, 130.84), 'Australia/Hobart': c(-42.88, 147.33), 'Pacific/Auckland': c(-36.85, 174.76),
  'Pacific/Fiji': c(-18.14, 178.44), 'Pacific/Guam': c(13.44, 144.79), 'Pacific/Honolulu': c(21.31, -157.86), 'Pacific/Tahiti': c(-17.54, -149.57),
  'Pacific/Port_Moresby': c(-9.44, 147.18), 'Pacific/Tongatapu': c(-21.14, -175.2), 'Pacific/Apia': c(-13.83, -171.76), 'Pacific/Noumea': c(-22.28, 166.46),
  'Pacific/Palau': c(7.5, 134.62), 'Pacific/Chatham': c(-43.95, -176.55), 'Pacific/Easter': c(-27.11, -109.35), 'Pacific/Galapagos': c(-0.74, -90.31),
}

// Latitudine tipica per area, se il fuso non è nell'elenco.
const REGION_LAT: Record<string, number> = {
  Europe: 48, Asia: 30, Africa: 5, America: 25, Australia: -30, Pacific: -10, Atlantic: 35, Indian: -10, Antarctica: -75, Arctic: 75,
}

/**
 * Posizione approssimativa di un fuso IANA: la sua città principale; se il fuso non è nell'elenco, la longitudine
 * viene dallo scarto orario (15° per ora) e la latitudine da quella tipica dell'area.
 */
export function centerForTimezone(timeZone: string, at: Date = new Date()): LatLng {
  const known = CITIES[timeZone]
  if (known) return known
  let offsetMin = 0
  try {
    offsetMin = tzOffsetMinutes(at, timeZone)
  } catch {
    return DEFAULT_CENTER
  }
  const lat = REGION_LAT[timeZone.split('/')[0]] ?? 30
  const lng = Math.max(-180, Math.min(180, (offsetMin / 60) * 15))
  return { lat, lng }
}

/**
 * Il centro da usare per il viaggio. Se resta quello di Roma (il valore di partenza di «Altro») ma il fuso è
 * lontano da Roma, la posizione non è mai stata scelta: si usa quella del fuso. Altrimenti vale quella salvata.
 */
export function tripCenter(trip: { center: LatLng; timezone: string }): LatLng {
  const isDefault = Math.abs(trip.center.lat - DEFAULT_CENTER.lat) < 0.01 && Math.abs(trip.center.lng - DEFAULT_CENTER.lng) < 0.01
  if (!isDefault) return trip.center
  const tz = centerForTimezone(trip.timezone)
  const far = Math.abs(tz.lng - DEFAULT_CENTER.lng) > 20 || Math.abs(tz.lat - DEFAULT_CENTER.lat) > 20
  return far ? tz : trip.center
}
