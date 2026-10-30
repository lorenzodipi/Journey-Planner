// Tiene aggiornate le notifiche locali (#46): a ogni apertura e a ogni modifica di tappe, checklist, spese o scelte
// cancella e riprogramma. Non disegna nulla.
import { useEffect, useMemo } from 'react'
import { useLocation } from 'wouter'
import { avvisoBudget, pianoAvvisi } from '../lib/notifiche'
import { ascoltaTocchi, mostraOra, programma } from '../lib/notificheDevice'
import { prossimeOre } from '../lib/oggi'
import { useNotifichePrefs } from '../lib/prefs'
import { riassunto } from '../lib/spese'
import { tripToday } from '../lib/today'
import type { Trip } from '../types'
import { useMe } from './me'
import { useCityForecasts } from './cityForecast'

const hourIn = (d: Date, timeZone: string) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(d))
const keyBudget = (id: string) => `jp.notif.budget.${id}`
const leggiSoglia = (id: string): number => {
  try {
    return Number(localStorage.getItem(keyBudget(id))) || 0
  } catch {
    return 0
  }
}
const scriviSoglia = (id: string, n: number) => {
  try {
    localStorage.setItem(keyBudget(id), String(n))
  } catch {
    // ignorato
  }
}

export function NotificheHost({ trip }: { trip: Trip }) {
  const [, navigate] = useLocation()
  const [prefs] = useNotifichePrefs()
  const me = useMe(trip)
  const today = tripToday(trip)
  const city = trip.days.find((d) => d.date === today)?.city || ''
  const inViaggio = today >= trip.startDate && today <= trip.endDate
  const forecast = useCityForecasts(trip, city ? [city] : [])
  const ore = useMemo(() => (inViaggio && prefs.pioggia ? prossimeOre(forecast.get(city), today, hourIn(new Date(), trip.timezone), 24) : undefined), [forecast, city, today, inViaggio, prefs.pioggia, trip.timezone])

  // tocco su una notifica → pagina giusta
  useEffect(() => ascoltaTocchi((route) => navigate(route)), [navigate])

  // avvisi programmati: si ricalcolano quando cambiano i dati che li generano
  const piano = useMemo(() => pianoAvvisi(trip, prefs, new Date(), { meId: me?.id, ore, city }), [trip, prefs, me?.id, ore, city])
  const firma = piano.map((a) => `${a.id}@${a.at.getTime()}`).join('|')
  useEffect(() => {
    void programma(piano)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])

  // budget: scatta quando si supera l'80% o il 100%
  const r = useMemo(() => riassunto(trip, me?.id), [trip, me?.id])
  useEffect(() => {
    if (!prefs.budget) return
    const { avviso, soglia } = avvisoBudget(trip, r.speso, r.limit, leggiSoglia(trip.id), new Date())
    if (soglia !== leggiSoglia(trip.id)) scriviSoglia(trip.id, soglia)
    if (avviso) void mostraOra(avviso)
  }, [prefs.budget, trip.id, trip.baseCurrency, r.speso, r.limit]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
