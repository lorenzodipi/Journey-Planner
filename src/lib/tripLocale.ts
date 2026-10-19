import type { Trip } from '../types'

// Le etichette in giapponese (come 設定 accanto a «Altro») hanno senso solo in un viaggio in Giappone:
// altrove sarebbero caratteri senza significato.
const JAPAN_WORDS = /giappon|japan|日本|tokyo|tokio|kyoto|osaka|hokkaid|okinawa/i

/** Il viaggio è in Giappone? Lo dicono il fuso orario della destinazione o il suo nome. */
export function isJapanTrip(trip: Pick<Trip, 'timezone' | 'destination'>): boolean {
  return trip.timezone === 'Asia/Tokyo' || JAPAN_WORDS.test(trip.destination ?? '')
}
