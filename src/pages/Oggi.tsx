// Oggi (mock Fa-03…Fa-07, Fa-52…Fa-55; issue #28, #29, #30): prima, durante e dopo il viaggio.
import { doneCount } from '../lib/checklist'
import { MeteoGiornoCard } from './giorno/MeteoGiornoCard'
import { cittaDelGiorno, indiceCittaAdesso } from '../lib/meteoGiorno'
import { ora, useRiferimento } from '../lib/formati'
import { Foglio } from '../faraway/Foglio'
import { Chip, Pulsante } from '../faraway/base'
import { oggiNelViaggio } from '../lib/paesi'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { countryByCode } from '../lib/countries'
import { currencyName } from '../lib/money'
import { dateAddDays, daysBetween, parseYmd } from '../lib/dates'
import { groupDays, rangeText, type DayGroup } from '../lib/dayGroups'
import { soloLettura } from '../lib/ruolo'
import { StepperViaggio, type TappaViaggio } from '../faraway/StepperViaggio'
import { AvvisoNotti } from '../faraway/AvvisoNotti'
import { faseViaggio, notteAlle, prossimeOre } from '../lib/oggi'
import { allerteMeteo, allerteTerremoti, ordinaAllerte } from '../lib/allerte'
import { useTerremoti } from '../state/terremoti'
import { Allerte } from '../faraway/Allerte'
import { isClosed, toMin } from '../lib/tappa'
import { minutesOfDay, sunForDay } from '../lib/sun'
import { tripToday } from '../lib/today'
import { showToast } from '../state/toast'
import { useForecast } from '../state/forecast'
import { cityCenters, useCityForecasts } from '../state/cityForecast'
import { useDaySegments } from '../state/daySegments'
import { useMe } from '../state/me'
import { useAuth } from '../lib/auth'
import { useTrip, useTrips } from '../state/trip'
import type { DayItem, ItemStatus, Trip } from '../types'
import { Ic } from '../ui/Sprite'
import { OggiDopo } from './OggiDopo'
import { Offline } from '../faraway/Offline'
import { DISCHI as CITY_DISCS } from '../faraway/DopoCard'
import { BigliettoPiccolo, ChecklistHome, ContoAllaRovescia, Orologio, Saluto, ValutaPiccola, type VoceHome } from '../faraway/Home'
import { Sv } from '../faraway/icons'
import { Affianca, Colonna, Schermata } from '../faraway/shell'
import { TappeLista } from '../faraway/Tappe'
import { useConferma } from '../faraway/Foglio'
import { LOCALE, t as tt } from '../i18n'

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const longIn = (d: Date, timeZone?: string) => cap(new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', ...(timeZone ? { timeZone } : {}) }).format(d))
const hhmmIn = (d: Date, timeZone: string) => new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(d)
const hourIn = (d: Date, timeZone: string) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(d))
const firstName = (n: string | undefined) => n?.trim().split(/\s+/)[0]
const wdm = (ymd: string) => new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }).format(parseYmd(ymd)).replace(/\./g, '')
const deviceTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export function Oggi() {
  const real = useTrip()
  const now = useNow()
  // più paesi: oggi, fuso, valuta e centro seguono il paese del giorno (#35)
  const { today, trip } = oggiNelViaggio(real, now)
  const fase = faseViaggio(trip, today)
  if (fase === 'pre') return <OggiPrima trip={trip} now={now} today={today} />
  if (fase === 'post') return <OggiDopo trip={trip} now={now} today={today} />
  return <OggiDurante trip={trip} now={now} today={today} />
}

/** Avviso offline in cima (Fa-07 chiaro, #49). */
/* ------------------------------------------------------------------ checklist «Le mie cose» */

function useLeMieCose(trip: Trip, me: string | undefined) {
  const t = useTrips()
  const [, navigate] = useLocation()
  const mine = trip.checklist.filter((c) => !c.travelerId || c.travelerId === me).sort((a, b) => a.position - b.position)
  const done = mine.filter((c) => c.done).length
  const todo = mine.filter((c) => !c.done)
  const items: VoceHome[] = todo.slice(0, 4).map((c) => ({
    id: c.id,
    text: c.text,
    done: c.done,
    tag: c.private || c.travelerId ? tt('Solo io') : tt('Tutti'),
    tagAll: !c.private && !c.travelerId,
    pezzi: (c.quantity ?? 1) > 1 ? { fatti: doneCount(c), totale: c.quantity as number, unita: c.unit || undefined } : undefined,
  }))
  return (
    <ChecklistHome
      done={done}
      total={mine.length}
      items={items}
      rest={Math.max(0, todo.length - items.length)}
      onToggle={async (id) => {
        const c = mine.find((x) => x.id === id)
        if (!c) return
        // con più pezzi la spunta li mette tutti a posto (o li toglie), come nella pagina Checklist
        const m = (c.quantity ?? 1) > 1 ? await t.setChecklistCount(id, c.done ? 0 : (c.quantity as number)) : await t.setChecklistDone(id, !c.done)
        if (m) showToast(m)
      }}
      onCount={async (id, n) => {
        const m = await t.setChecklistCount(id, n)
        if (m) showToast(m)
      }}
      onOpen={() => navigate('/altro/checklist')}
      onCreate={() => navigate('/altro/checklist?nuova=1')}
    />
  )
}

/* ------------------------------------------------------------------ prima del viaggio (#28) */

/** Città del viaggio in ordine, con date e notti: la fine di una città è l'arrivo nella successiva. */
function tappeDelViaggio(groups: DayGroup[]): TappaViaggio[] {
  const citta = groups.filter((g) => g.kind === 'city')
  const colori = new Map<string, string>()
  return citta.map((g) => {
    if (!colori.has(g.title)) colori.set(g.title, CITY_DISCS[colori.size % CITY_DISCS.length])
    const inizio = g.cells[0].day.date
    const ultimo = g.cells[g.cells.length - 1].day.date
    const fine = groups[groups.indexOf(g) + 1]?.cells[0].day.date ?? ultimo
    return { nome: g.title, date: rangeText(inizio, fine), notti: Math.max(0, daysBetween(inizio, fine)), disco: colori.get(g.title) ?? CITY_DISCS[0] }
  })
}

function OggiPrima({ trip, now, today }: { trip: Trip; now: Date; today: string }) {
  const me = useMe(trip)
  // il visualizzatore non è tra i viaggiatori: nel saluto vale il nome del profilo
  const auth = useAuth()
  const days = daysBetween(today, trip.startDate)
  const groups = groupDays(trip, today)
  const meta = groups.find((g) => g.kind === 'city')?.title ?? trip.destination
  const legs = trip.flights.flatMap((f) => f.legs).filter((l) => Date.parse(l.departAt) > now.getTime()).sort((a, b) => a.departAt.localeCompare(b.departAt))
  const leg = legs[0]
  const next = leg ? { from: leg.from, to: (trip.flights.find((f) => f.legs.includes(leg))?.legs.slice(-1)[0] ?? leg).to, date: longIn(new Date(leg.departAt), leg.fromTz) } : undefined
  const lettura = soloLettura(trip)
  const checklist = useLeMieCose(trip, me?.id)
  const tappeViaggio = tappeDelViaggio(groups)
  return (
    <Schermata gap={16} rete={{ pill: false }} fisso fissa={<Saluto date={longIn(now)} greeting={tt('Ciao')} name={firstName(me?.name || auth.profileName)} />}>
      <h1 className="sr-only">{tt('Oggi, {destination}', { destination: trip.destination })}</h1>
      <Offline />
      {/* pieghevole aperto: il biglietto e le tappe a sinistra, «Le mie cose» a destra */}
      <Affianca>
        <Colonna lato="sinistra">
          <ContoAllaRovescia days={days} meta={meta} next={next} />
          {lettura ? null : <AvvisoNotti trip={trip} />}
        </Colonna>
        {/* il visualizzatore (0049) non ha la checklist */}
        {lettura ? null : (
          <Colonna lato="destra" alta>
            {checklist}
          </Colonna>
        )}
        {tappeViaggio.length > 1 ? (
          <Colonna lato="sinistra" mobile>
            <StepperViaggio tappe={tappeViaggio} />
          </Colonna>
        ) : null}
      </Affianca>
    </Schermata>
  )
}

/* ------------------------------------------------------------------ durante il viaggio (#29) */

function OggiDurante({ trip, now, today }: { trip: Trip; now: Date; today: string }) {
  const t = useTrips()
  const me = useMe(trip)
  // il visualizzatore non è tra i viaggiatori: nel saluto vale il nome del profilo
  const auth = useAuth()
  const [, navigate] = useLocation()
  const [openId, setOpenId] = useState<string | null>(null)
  const autoOpened = useRef(false)
  const day = trip.days.find((d) => d.date === today)
  const [rif, setRif] = useRiferimento(trip.id)
  const [sceltaCitta, setSceltaCitta] = useState(false)
  const cittaViaggio = [...new Set(trip.days.map((d) => d.city).filter(Boolean))]
  const tratti = day ? cittaDelGiorno(trip, day) : []
  const cittaProgramma = tratti.length ? tratti[indiceCittaAdesso(tratti, minutesOfDay(now, trip.timezone))].city : null
  const city = (rif && cittaViaggio.includes(rif) ? rif : null) || cittaProgramma || day?.city || trip.destination
  const { segments } = useDaySegments(trip, day)
  const nowMin = minutesOfDay(now, trip.timezone)
  const ctx = { isToday: true, isPast: false, nowMin, timeZone: trip.timezone }

  // meteo: la città del giorno (centro dei suoi luoghi), altrimenti il centro del viaggio
  const cityForecasts = useCityForecasts(trip, [city])
  const tripForecast = useForecast(trip)
  const forecast = cityForecasts.get(city) ?? tripForecast.days
  const center = cityCenters(trip, [city])[0] ?? trip.center
  const sun = sunForDay(today, center.lat, center.lng, trip.timezone)
  const hour = hourIn(now, trip.timezone)
  const ore = prossimeOre(forecast, today, hour, 24)
  const nightNow = notteAlle(hour, sun)
  // allerte: dal meteo già scaricato e dai terremoti recenti vicino alla città (una richiesta piccola, ogni 15 minuti al massimo)
  const terremoti = useTerremoti(true)
  const allerte = ordinaAllerte([...allerteMeteo(ore, today, city), ...allerteTerremoti(terremoti, [{ city, lat: center.lat, lng: center.lng }], now.getTime(), trip.timezone)])

  // orologi: solo se il fuso di casa è diverso da quello del viaggio
  const homeTz = trip.originTimezone || deviceTz()
  const showClocks = homeTz !== trip.timezone && hhmmIn(now, homeTz) !== hhmmIn(now, trip.timezone)
  const homeName = countryByCode(trip.originCountry)?.name ?? tt('Casa')
  const homeHour = hourIn(now, homeTz)

  // la tappa in corso si apre da sola (una volta)
  const items = day?.items ?? []
  const current = items.find((i) => !isClosed(i) && toMin(i.time) !== null && nowMin >= (toMin(i.time) as number))
  useEffect(() => {
    if (autoOpened.current || !day) return
    const live = items.filter((i) => !isClosed(i) && toMin(i.time) !== null && (toMin(i.time) as number) <= nowMin).pop()
    if (live) {
      setOpenId(live.id)
      autoOpened.current = true
    }
  }, [day?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  void current

  const lastEnd = items.reduce((m, i) => Math.max(m, toMin(i.endTime) ?? toMin(i.time) ?? 0), 0)
  const finished = items.length > 0 && (items.every(isClosed) || (lastEnd > 0 && nowMin > lastEnd + 60))
  const tomorrow = trip.days.find((d) => d.date === dateAddDays(today, 1))
  const firstTomorrow = tomorrow?.items.find((i) => i.time)

  // prossima prenotazione di oggi o domani
  const nextBooking = trip.bookings
    .filter((b) => b.validFrom && Date.parse(b.validFrom) > now.getTime() && daysBetween(today, tripToday({ timezone: trip.timezone }, new Date(b.validFrom))) <= 1)
    .sort((a, b) => (a.validFrom as string).localeCompare(b.validFrom as string))[0]

  const rate = trip.fxRate
  const lettura = soloLettura(trip)
  const showFx = !lettura && trip.localCurrency && trip.localCurrency !== trip.baseCurrency && rate

  const [ask, confirmNode] = useConferma()
  const onStatus = async (item: DayItem, status: ItemStatus) => {
    if (status === 'postponed') return navigate(`/giorni/${day?.id}`)
    const m = await t.setItemStatus(trip.id, item.id, status)
    if (m) showToast(m)
  }
  const onDelete = async (item: DayItem) => {
    const ok = await ask({ title: tt('Eliminare la tappa?'), message: tt('{title} sparisce dal programma di oggi. Non si può annullare.', { title: item.title }), confirm: tt('Elimina la tappa'), cancel: tt('Tieni la tappa') })
    if (!ok) return
    const m = await t.setItemDeleted(item.id, true)
    if (m) showToast(m)
  }

  const finishedCard = finished ? (
    <section className="fa-card xl" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 16px', display: 'grid', gap: 8 }}>
        <div className="fa-sech" style={{ minHeight: 0 }}>
          <h2 className="fa-h3">{tt('Giornata finita')}</h2>
          <span className="fa-c">
            {tt('{length} {v1} su {length2}', { length: items.filter((i) => i.status === 'done' || i.done).length, v1: items.length === 1 ? tt('tappa') : tt('tappe'), length2: items.length })}
          </span>
        </div>
        <div className="fa-pbar" role="progressbar" aria-label={tt('Tappe fatte')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
          <i style={{ width: '100%' }} />
        </div>
      </div>
      {tomorrow ? (
        <>
          <div className="fa-hr" />
          <button type="button" className="fa-row" onClick={() => navigate(`/giorni/${tomorrow.id}`)}>
            <Ic name="i-nav-calendar" size={44} />
            <span>
              <span className="t" style={{ display: 'block' }}>
                {tt('Domani · {v0}', { v0: wdm(tomorrow.date) })}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {[tomorrow.city, `${tomorrow.items.length} ${tomorrow.items.length === 1 ? tt('tappa') : tt('tappe')}`, firstTomorrow ? tt('si parte alle {v0}', { v0: ora(firstTomorrow.time) }) : null].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="end">
              <Sv name="chevr" size={20} />
            </span>
          </button>
        </>
      ) : null}
    </section>
  ) : null

  return (
    <Schermata gap={16} rete={{ pill: false }} fisso fissa={<Saluto date={longIn(now, trip.timezone)} greeting={tt('Ciao')} name={firstName(me?.name || auth.profileName)} />}>
      <h1 className="sr-only">{tt('Oggi, {destination}', { destination: trip.destination })}</h1>
      <Offline />
      {/* pieghevole aperto: a sinistra ora, meteo, prossima prenotazione e cambio; a destra il programma di oggi */}
      <Affianca>
      <Colonna lato="sinistra">
      {showClocks ? (
        <Orologio
          here={{ label: city, time: hhmmIn(now, trip.timezone), night: nightNow, sub: nightNow ? tt('Notte') : tt('Giorno') }}
          home={{ label: homeName, time: hhmmIn(now, homeTz), night: homeHour < 6 || homeHour >= 20 }}
        />
      ) : null}
      {cittaViaggio.length > 1 ? (
        <Pulsante color="tertiary" size="sm" iconLeading="pin" onPress={() => setSceltaCitta(true)}>
          {rif && cittaViaggio.includes(rif) ? tt('Località scelta: {rif}', { rif }) : tt('Cambia località di riferimento')}
        </Pulsante>
      ) : null}
      <Foglio open={sceltaCitta} title={tt('Località di riferimento')} onClose={() => setSceltaCitta(false)}>
        <div style={{ display: 'grid', gap: 16 }}>
          <p className="fa-m" style={{ margin: 0 }}>{tt('Ora e meteo di Oggi seguono questa città, senza usare il GPS.')}</p>
          <div className="fa-chips wrap">
            <Chip on={!rif} onPress={() => (setRif(null), setSceltaCitta(false))}>{tt('Segui il giorno')}</Chip>
            {cittaViaggio.map((c) => (
              <Chip key={c} on={rif === c} onPress={() => (setRif(c), setSceltaCitta(false))}>{c}</Chip>
            ))}
          </div>
        </div>
      </Foglio>
      {/* stessa card della giornata: una per città, scorrevoli, a partire da quella di adesso. Con una località scelta, solo quella. */}
      <MeteoGiornoCard trip={trip} day={day && !(rif && cittaViaggio.includes(rif)) ? day : { date: today, city, items: [] }} />
      <Allerte allerte={allerte} />
      </Colonna>

      <Colonna lato="destra" alta>
      {finishedCard}
      {!finished && day && items.length > 0 ? (
        <div className="fa-stack" style={{ gap: 0 }}>
          <TappeLista
            trip={trip}
            day={day}
            header={{ title: tt('Il programma di oggi'), date: wdm(today) }}
            ctx={ctx}
            segments={segments}
            openId={openId}
            onToggle={(id) => setOpenId((c) => (c === id ? null : id))}
            onStatus={(i, s) => void onStatus(i, s)}
            onEdit={() => navigate(`/giorni/${day.id}`)}
            onMove={() => navigate(`/giorni/${day.id}`)}
            onDelete={(i) => void onDelete(i)}
            onReorder={lettura ? undefined : (i, to) => void t.moveItemTo(day.id, i.id, to).then((m) => m && showToast(m))}
            readOnly={lettura}
          />
        </div>
      ) : null}
      {!finished && day && items.length === 0 ? (
        <section className="fa-card pad" style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
          <h2 className="fa-h3">{tt('Giornata libera')}</h2>
          <p className="fa-m">{lettura ? tt('Oggi non c\'è niente in programma.') : tt('Oggi non c\'è niente in programma. Aggiungi una tappa se ti va.')}</p>
          {lettura ? null : <button type="button" className="fa-btn soft" style={{ width: 'auto', minHeight: 44, padding: '0 16px', fontSize: 14 }} onClick={() => navigate(`/giorni/${day.id}?aggiungi=1`)}>
            {tt('Aggiungi una tappa')}
          </button>}
        </section>
      ) : null}
      </Colonna>

      <Colonna lato="sinistra" mobile>
      {nextBooking ? (
        <section style={{ display: 'grid', gap: 8 }}>
          <div className="fa-sech">
            <h2 className="fa-h3">{tt('Prossima prenotazione')}</h2>
          </div>
          <BigliettoPiccolo
            glyph={nextBooking.type === 'hotel' ? 'g-cat-stay' : nextBooking.type === 'train' ? 'g-tra-train' : nextBooking.type === 'flight' ? 'g-tra-plane' : 'g-cat-food'}
            title={nextBooking.title}
            sub={nextBooking.notes?.split('\n')[0]}
            right={ora(hhmmIn(new Date(nextBooking.validFrom as string), trip.timezone))}
            rightSub={nextBooking.code}
            label={`${nextBooking.title}, ${ora(hhmmIn(new Date(nextBooking.validFrom as string), trip.timezone))}`}
            onPress={() => navigate(`/altro/prenotazioni?apri=${nextBooking.id}`)}
          />
        </section>
      ) : null}

      {showFx ? (
        <section style={{ display: 'grid', gap: 8 }}>
          <div className="fa-sech">
            <h2 className="fa-h3">{tt('Cambio valuta')}</h2>
          </div>
          <ValutaPiccola base={trip.baseCurrency} local={trip.localCurrency as string} rate={rate as number} baseName={cap(currencyName(trip.baseCurrency) ?? trip.baseCurrency)} localName={cap(currencyName(trip.localCurrency as string) ?? (trip.localCurrency as string))} />
        </section>
      ) : null}
      </Colonna>
      </Affianca>
      {confirmNode}
    </Schermata>
  )
}
