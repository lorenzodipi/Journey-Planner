// Meteo del Giorno: la stessa card della Home (temperatura, ora per ora, alba e tramonto), per il giorno aperto.
// Oggi parte dall'ora attuale; per gli altri giorni mostra tutte le ore del giorno. Un giorno con più città ha una card per città.
import { useMemo } from 'react'
import { MeteoCard } from '../../faraway/Home'
import { descrizione, notteAlle, rigaSole } from '../../lib/oggi'
import { cittaDelGiorno, oraDelMeteo } from '../../lib/meteoGiorno'
import { minutesOfDay, sunForDay } from '../../lib/sun'
import { dateAddDays } from '../../lib/dates'
import { tripToday } from '../../lib/today'
import { cityCenters, useCityForecasts } from '../../state/cityForecast'
import type { Day, Trip } from '../../types'

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

export function MeteoGiornoCard({ trip, day }: { trip: Trip; day: Day }) {
  const tratti = useMemo(() => cittaDelGiorno(trip, day), [trip, day])
  const citta = tratti.map((t) => t.city)
  const previsioni = useCityForecasts(trip, citta)
  const centri = cityCenters(trip, citta)
  const oggi = day.date === tripToday(trip)
  const nowMin = minutesOfDay(new Date(), trip.timezone)
  return (
    <>
      {citta.map((c) => {
        const giorni = previsioni.get(c)
        const g = giorni?.find((d) => d.date === day.date)
        const centro = centri.find((x) => x.city === c) ?? trip.center
        const ore = (g?.hours ?? []).filter((h) => !oggi || h.h >= Math.floor(nowMin / 60))
        if (!g || ore.length === 0) return null
        const sole = sunForDay(day.date, centro.lat, centro.lng, trip.timezone)
        const domani = sunForDay(dateAddDays(day.date, 1), centro.lat, centro.lng, trip.timezone)
        const primo = oggi ? ore[0] : (oraDelMeteo(g, 14) ?? ore[0])
        const notte = notteAlle(primo.h, sole)
        const luce = sole.sunrise !== null && sole.sunset !== null ? sole.sunset - sole.sunrise : null
        // oggi: stessa riga della Home; altri giorni: alba e tramonto di quel giorno con le ore di luce
        const riga = oggi
          ? rigaSole(sole, domani, nowMin)
          : sole.sunrise !== null && sole.sunset !== null
            ? { first: { k: 'Alba', v: hhmm(sole.sunrise), down: false }, second: { k: 'Tramonto', v: hhmm(sole.sunset), down: true }, next: 'Luce', inText: `${Math.floor((luce ?? 0) / 60)} h ${(luce ?? 0) % 60} min`, pct: 50, moon: false }
            : undefined
        return (
          <MeteoCard
            key={c}
            city={c}
            t={primo.t}
            code={primo.code}
            night={notte}
            desc={descrizione(primo.code, g.min, notte)}
            hours={ore.map((h, i) => ({ label: oggi && i === 0 ? 'Ora' : `${pad(h.h)}:00`, t: h.t, code: h.code, night: notteAlle(h.h, sole), rain: (h.rain ?? 0) >= 50 || (h.mm ?? 0) >= 0.5, now: oggi && i === 0 }))}
            sun={riga}
          />
        )
      })}
    </>
  )
}
