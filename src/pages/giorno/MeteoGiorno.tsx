// Meteo del Giorno (#65): card scorrevoli in orizzontale, una per città del giorno; la città di adesso (secondo il programma)
// è la principale e quella successiva sta a destra. Con percepita, vento, precipitazioni, alba/tramonto, località e «Aggiornato alle».
import { useEffect, useMemo, useRef } from 'react'
import { gradi, leggiFormati, ora } from '../../lib/formati'
import { cittaDelGiorno, indiceCittaAdesso, mmDelGiorno, oraDelMeteo } from '../../lib/meteoGiorno'
import { minutesOfDay, sunForDay } from '../../lib/sun'
import { tripToday } from '../../lib/today'
import { forecastKey, loadForecast, weatherLabel } from '../../lib/weather'
import { cityCenters, useCityForecasts } from '../../state/cityForecast'
import type { Day, Trip } from '../../types'
import { Pillola } from '../../faraway/base'

const hm = (min: number | null) => (min === null ? '—' : ora(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`))

export function MeteoGiorno({ trip, day }: { trip: Trip; day: Day }) {
  const tratti = useMemo(() => cittaDelGiorno(trip, day), [trip, day])
  const citta = tratti.map((t) => t.city)
  const previsioni = useCityForecasts(trip, citta)
  const centri = cityCenters(trip, citta)
  const oggi = day.date === tripToday(trip)
  const nowMin = oggi ? minutesOfDay(new Date(), trip.timezone) : null
  const adesso = indiceCittaAdesso(tratti, nowMin)
  const riga = useRef<HTMLDivElement>(null)
  const principale = useRef<HTMLDivElement>(null)
  const fmt = leggiFormati()

  useEffect(() => {
    const r = riga.current
    const p = principale.current
    if (r && p) r.scrollTo({ left: p.offsetLeft - r.offsetLeft, behavior: 'auto' })
  }, [adesso, citta.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  const card = tratti.map((t, i) => {
    const giorni = previsioni.get(t.city)
    const g = giorni?.find((d) => d.date === day.date)
    const centro = centri.find((c) => c.city === t.city)
    const salvata = centro ? loadForecast(forecastKey(centro.lat, centro.lng, trip.timezone)) : null
    // ora di riferimento: adesso se è oggi nella città di adesso; altrimenti l'ora d'arrivo nella città o il primo pomeriggio
    const ref = i === adesso && nowMin !== null ? Math.floor(nowMin / 60) : Math.floor((t.da ?? 14 * 60) / 60) || 14
    const h = oraDelMeteo(g, ref)
    const sole = centro ? sunForDay(day.date, centro.lat, centro.lng, trip.timezone) : null
    const vento = h?.wind == null ? null : fmt.distanza === 'mi' ? `${Math.round(h.wind * 0.621)} mph` : `${Math.round(h.wind)} km/h`
    return { t, g, h, salvata, sole, vento, i }
  })

  return (
    <section aria-label="Meteo del giorno" style={{ display: 'grid', gap: 8 }}>
      <div ref={riga} role="group" aria-label="Meteo per città, scorri in orizzontale" tabIndex={0} style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain', paddingBottom: 4 }}>
        {card.map(({ t, g, h, salvata, sole, vento, i }) => (
          <div key={t.city} ref={i === adesso ? principale : undefined} className="fa-card xl pad" style={{ flex: '0 0 ' + (card.length > 1 ? '86%' : '100%'), scrollSnapAlign: 'start', display: 'grid', gap: 8 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className="fa-h3">{t.city}</span>
              {i === adesso ? <Pillola tone="acq">{oggi ? 'Adesso' : 'Inizio giornata'}</Pillola> : i === adesso + 1 ? <Pillola tone="soft">{t.da !== null ? `Dalle ${hm(t.da)}` : 'Dopo'}</Pillola> : i > adesso ? <Pillola tone="mut">Dopo</Pillola> : <Pillola tone="mut">Prima</Pillola>}
            </span>
            {g ? (
              <>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ font: '500 36px/40px var(--font-display)' }}>{gradi(h?.t ?? g.max)}</span>
                  <span className="fa-m">{weatherLabel(h?.code ?? g.code).label} · min {gradi(g.min)} · max {gradi(g.max)}</span>
                </span>
                <span className="fa-m">
                  {[h?.feels != null ? `Percepita ${gradi(h.feels)}` : null, vento ? `Vento ${vento}` : null, `Pioggia ${g.rainPct ?? 0}%${mmDelGiorno(g) > 0 ? ` · ${mmDelGiorno(g)} mm` : ''}`].filter(Boolean).join(' · ')}
                </span>
                {sole && sole.sunrise !== null ? <span className="fa-m">Alba {hm(sole.sunrise)} · tramonto {hm(sole.sunset)}</span> : null}
                <span className="fa-c" style={{ color: 'var(--ink-muted)' }}>
                  {t.city}
                  {salvata ? ` · aggiornato alle ${ora(new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(salvata.savedAt)))}` : ''}
                </span>
              </>
            ) : (
              <span className="fa-m">Previsioni non ancora disponibili per questo giorno (arrivano circa 16 giorni prima).</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
