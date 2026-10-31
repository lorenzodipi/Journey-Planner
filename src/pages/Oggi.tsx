// Oggi (mock Fa-03…Fa-07, Fa-52…Fa-55; issue #28, #29, #30): prima, durante e dopo il viaggio.
import { ora, useRiferimento } from '../lib/formati'
import { Foglio } from '../faraway/Foglio'
import { Chip, Pulsante } from '../faraway/base'
import { RimborsiOggi } from './spese/Rimborsi'
import { oggiNelViaggio } from '../lib/paesi'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { countryByCode } from '../lib/countries'
import { currencyName, formatMoney, round2 } from '../lib/money'
import { dateAddDays, daysBetween, parseYmd } from '../lib/dates'
import { groupDays, rangeText } from '../lib/dayGroups'
import { alGiorno, riassunto } from '../lib/spese'
import { cittaPreviste } from '../lib/gestioneViaggio'
import { AvvisoNotti } from '../faraway/AvvisoNotti'
import { avvisoPioggia, descrizione, faseViaggio, momento, notteAlle, numeriViaggio, prossimeOre, rigaSole } from '../lib/oggi'
import { isClosed, toMin } from '../lib/tappa'
import { minutesOfDay, sunForDay } from '../lib/sun'
import { tripToday } from '../lib/today'
import { showToast } from '../state/toast'
import { useForecast } from '../state/forecast'
import { cityCenters, useCityForecasts } from '../state/cityForecast'
import { useDaySegments } from '../state/daySegments'
import { discOf, useMe } from '../state/me'
import { savedAtText, useOnline } from '../state/online'
import { useTrip, useTrips } from '../state/trip'
import type { DayItem, ItemStatus, Trip } from '../types'
import { Ic } from '../ui/Sprite'
import { Banner } from '../faraway/base'
import { AvvisoPioggia, BigliettoPiccolo, ChecklistHome, ContoAllaRovescia, DueValori, MeteoCard, Orologio, Riepilogo, Saluto, SaldoPersone, SimboloPiatto, ValutaPiccola, type VoceHome } from '../faraway/Home'
import { Sv } from '../faraway/icons'
import { RigaApribile, useUnaAperta } from '../faraway/Righe'
import { Schermata } from '../faraway/shell'
import { TappeLista } from '../faraway/Tappe'
import { useConferma } from '../faraway/Foglio'

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const longIn = (d: Date, timeZone?: string) => cap(new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', ...(timeZone ? { timeZone } : {}) }).format(d))
const hhmmIn = (d: Date, timeZone: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(d)
const hourIn = (d: Date, timeZone: string) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(d))
const firstName = (n: string | undefined) => n?.trim().split(/\s+/)[0]
const wdm = (ymd: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(parseYmd(ymd)).replace(/\./g, '')
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
function Offline() {
  const online = useOnline()
  if (online) return null
  const at = savedAtText()
  return (
    <>
      {at ? (
        <div className="fa-off">
          <Sv name="wifi" size={16} />
          Aggiornato alle {at}
        </div>
      ) : null}
      <Banner tone="az" icon="wifi" title="Sei offline.">
        Vedi i dati salvati sul telefono. Le modifiche partono quando torna la rete.
      </Banner>
    </>
  )
}

/* ------------------------------------------------------------------ checklist «Le mie cose» */

function useLeMieCose(trip: Trip, me: string | undefined) {
  const t = useTrips()
  const [, navigate] = useLocation()
  const mine = trip.checklist.filter((c) => !c.travelerId || c.travelerId === me).sort((a, b) => a.position - b.position)
  const done = mine.filter((c) => c.done).length
  const todo = mine.filter((c) => !c.done)
  const items: VoceHome[] = todo.slice(0, 4).map((c) => ({ id: c.id, text: c.text, done: c.done, tag: c.private || c.travelerId ? 'Solo io' : 'Tutti', tagAll: !c.private && !c.travelerId }))
  return (
    <ChecklistHome
      done={done}
      total={mine.length}
      items={items}
      rest={Math.max(0, todo.length - items.length)}
      onToggle={async (id) => {
        const c = mine.find((x) => x.id === id)
        if (!c) return
        const m = await t.setChecklistDone(id, !c.done)
        if (m) showToast(m)
      }}
      onOpen={() => navigate('/altro/checklist')}
      onCreate={() => navigate('/altro/checklist?nuova=1')}
    />
  )
}

/* ------------------------------------------------------------------ prima del viaggio (#28) */

function OggiPrima({ trip, now, today }: { trip: Trip; now: Date; today: string }) {
  const me = useMe(trip)
  const days = daysBetween(today, trip.startDate)
  const groups = groupDays(trip, today)
  const meta = groups.find((g) => g.kind === 'city')?.title ?? trip.destination
  const legs = trip.flights.flatMap((f) => f.legs).filter((l) => Date.parse(l.departAt) > now.getTime()).sort((a, b) => a.departAt.localeCompare(b.departAt))
  const leg = legs[0]
  const next = leg ? { from: leg.from, to: (trip.flights.find((f) => f.legs.includes(leg))?.legs.slice(-1)[0] ?? leg).to, date: longIn(new Date(leg.departAt), leg.fromTz) } : undefined
  const checklist = useLeMieCose(trip, me?.id)
  return (
    <Schermata gap={15} rete={{ pill: false }}>
      <Saluto date={longIn(now)} greeting="Ciao" name={firstName(me?.name)} />
      <Offline />
      <ContoAllaRovescia days={days} meta={meta} next={next} />
      <AvvisoNotti trip={trip} />
      {cittaPreviste(trip).length > 1 ? (
        <section aria-label="Città previste" style={{ display: 'grid', gap: 4 }}>
          <h2 className="fa-h3" style={{ margin: 0 }}>Città previste</h2>
          <p className="fa-m" style={{ margin: 0 }}>{cittaPreviste(trip).join(' → ')}</p>
        </section>
      ) : null}
      {checklist}
    </Schermata>
  )
}

/* ------------------------------------------------------------------ durante il viaggio (#29) */

function OggiDurante({ trip, now, today }: { trip: Trip; now: Date; today: string }) {
  const t = useTrips()
  const me = useMe(trip)
  const [, navigate] = useLocation()
  const [openId, setOpenId] = useState<string | null>(null)
  const autoOpened = useRef(false)
  const day = trip.days.find((d) => d.date === today)
  const [rif, setRif] = useRiferimento(trip.id)
  const [sceltaCitta, setSceltaCitta] = useState(false)
  const cittaViaggio = [...new Set(trip.days.map((d) => d.city).filter(Boolean))]
  const city = (rif && cittaViaggio.includes(rif) ? rif : null) || day?.city || trip.destination
  const { segments } = useDaySegments(trip, day)
  const nowMin = minutesOfDay(now, trip.timezone)
  const ctx = { isToday: true, isPast: false, nowMin, timeZone: trip.timezone }

  // meteo: la città del giorno (centro dei suoi luoghi), altrimenti il centro del viaggio
  const cityForecasts = useCityForecasts(trip, [city])
  const tripForecast = useForecast(trip)
  const forecast = cityForecasts.get(city) ?? tripForecast.days
  const center = cityCenters(trip, [city])[0] ?? trip.center
  const sun = sunForDay(today, center.lat, center.lng, trip.timezone)
  const sunTomorrow = sunForDay(dateAddDays(today, 1), center.lat, center.lng, trip.timezone)
  const hour = hourIn(now, trip.timezone)
  const ore = prossimeOre(forecast, today, hour, 24)
  const oggiMeteo = forecast.find((d) => d.date === today)
  const nightNow = notteAlle(hour, sun)
  const rain = avvisoPioggia(ore.slice(0, 12))

  // orologi: solo se il fuso di casa è diverso da quello del viaggio
  const homeTz = trip.originTimezone || deviceTz()
  const showClocks = homeTz !== trip.timezone && hhmmIn(now, homeTz) !== hhmmIn(now, trip.timezone)
  const homeName = countryByCode(trip.originCountry)?.name ?? 'Casa'
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
  const showFx = trip.localCurrency && trip.localCurrency !== trip.baseCurrency && rate

  const [ask, confirmNode] = useConferma()
  const onStatus = async (item: DayItem, status: ItemStatus) => {
    if (status === 'postponed') return navigate(`/giorni/${day?.id}`)
    const m = await t.setItemStatus(trip.id, item.id, status)
    if (m) showToast(m)
  }
  const onDelete = async (item: DayItem) => {
    const ok = await ask({ title: 'Eliminare la tappa?', message: `${item.title} sparisce dal programma di oggi. Non si può annullare.`, confirm: 'Elimina la tappa', cancel: 'Tieni la tappa' })
    if (!ok) return
    const m = await t.setItemDeleted(item.id, true)
    if (m) showToast(m)
  }

  const finishedCard = finished ? (
    <section className="fa-card xl" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 12px', display: 'grid', gap: 8 }}>
        <div className="fa-sech" style={{ minHeight: 0 }}>
          <h2 className="fa-h3">Giornata finita</h2>
          <span className="fa-c">
            {items.filter((i) => i.status === 'done' || i.done).length} {items.length === 1 ? 'tappa' : 'tappe'} su {items.length}
          </span>
        </div>
        <div className="fa-pbar" role="progressbar" aria-label="Tappe fatte" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
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
                Domani · {wdm(tomorrow.date)}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {[tomorrow.city, `${tomorrow.items.length} ${tomorrow.items.length === 1 ? 'tappa' : 'tappe'}`, firstTomorrow ? `si parte alle ${ora(firstTomorrow.time)}` : null].filter(Boolean).join(' · ')}
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
    <Schermata gap={15} rete={{ pill: false }}>
      <Saluto date={longIn(now, trip.timezone)} greeting="Ciao" name={firstName(me?.name)} />
      <Offline />
      {showClocks ? (
        <Orologio
          here={{ label: city, time: hhmmIn(now, trip.timezone), night: nightNow, sub: nightNow ? 'Notte' : 'Giorno' }}
          home={{ label: `${homeName}, ${momento(homeHour)}`, time: hhmmIn(now, homeTz), night: homeHour < 6 || homeHour >= 20 }}
        />
      ) : null}
      {cittaViaggio.length > 1 ? (
        <Pulsante color="tertiary" size="sm" iconLeading="pin" onPress={() => setSceltaCitta(true)}>
          {rif && cittaViaggio.includes(rif) ? `Località scelta: ${rif}` : 'Cambia località di riferimento'}
        </Pulsante>
      ) : null}
      <Foglio open={sceltaCitta} title="Località di riferimento" onClose={() => setSceltaCitta(false)}>
        <div style={{ display: 'grid', gap: 12 }}>
          <p className="fa-m" style={{ margin: 0 }}>Ora e meteo di Oggi seguono questa città, senza usare il GPS.</p>
          <div className="fa-chips wrap">
            <Chip on={!rif} onPress={() => (setRif(null), setSceltaCitta(false))}>Segui il giorno</Chip>
            {cittaViaggio.map((c) => (
              <Chip key={c} on={rif === c} onPress={() => (setRif(c), setSceltaCitta(false))}>{c}</Chip>
            ))}
          </div>
        </div>
      </Foglio>
      {oggiMeteo && ore.length > 0 ? (
        <MeteoCard
          city={city}
          t={ore[0].t}
          code={ore[0].code}
          night={nightNow}
          desc={descrizione(ore[0].code, oggiMeteo.min, nightNow)}
          hours={ore.map((h, i) => ({ label: i === 0 ? 'Ora' : `${String(h.h).padStart(2, '0')}:00`, t: h.t, code: h.code, night: notteAlle(h.h, h.date === today ? sun : sunTomorrow), rain: (h.rain ?? 0) >= 50 || (h.mm ?? 0) >= 0.5, now: i === 0 }))}
          sun={rigaSole(sun, sunTomorrow, nowMin)}
        />
      ) : null}
      {rain ? <AvvisoPioggia title={rain.title} text={rain.text} /> : null}

      {finishedCard}
      {!finished && day && items.length > 0 ? (
        <div className="fa-stack" style={{ gap: 0 }}>
          <TappeLista
            trip={trip}
            day={day}
            header={{ title: 'Il programma di oggi', date: wdm(today) }}
            ctx={ctx}
            segments={segments}
            openId={openId}
            onToggle={(id) => setOpenId((c) => (c === id ? null : id))}
            onStatus={(i, s) => void onStatus(i, s)}
            onEdit={() => navigate(`/giorni/${day.id}`)}
            onMove={() => navigate(`/giorni/${day.id}`)}
            onDelete={(i) => void onDelete(i)}
          />
        </div>
      ) : null}
      {!finished && day && items.length === 0 ? (
        <section className="fa-card pad" style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
          <h2 className="fa-h3">Giornata libera</h2>
          <p className="fa-m">Oggi non c'è niente in programma. Aggiungi una tappa se ti va.</p>
          <button type="button" className="fa-btn soft" style={{ width: 'auto', height: 44, padding: '0 16px', fontSize: 14 }} onClick={() => navigate(`/giorni/${day.id}?aggiungi=1`)}>
            Aggiungi una tappa
          </button>
        </section>
      ) : null}

      {nextBooking ? (
        <section style={{ display: 'grid', gap: 8 }}>
          <div className="fa-sech">
            <h2 className="fa-h3">Prossima prenotazione</h2>
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
            <h2 className="fa-h3">Cambio valuta</h2>
          </div>
          <ValutaPiccola base={trip.baseCurrency} local={trip.localCurrency as string} rate={rate as number} baseName={cap(currencyName(trip.baseCurrency) ?? trip.baseCurrency)} localName={cap(currencyName(trip.localCurrency as string) ?? (trip.localCurrency as string))} />
        </section>
      ) : null}
      {confirmNode}
    </Schermata>
  )
}

/* ------------------------------------------------------------------ dopo il viaggio (#30) */

const CITY_DISCS = ['viola', 'corallo', 'turchese', 'azzurro', 'menta', 'glicine', 'rosa', 'cielo']

function OggiDopo({ trip, now, today }: { trip: Trip; now: Date; today: string }) {
  const me = useMe(trip)
  const [, navigate] = useLocation()
  const r = riassunto(trip, me?.id)
  const groups = useMemo(() => groupDays(trip, today), [trip, today])
  const n = numeriViaggio(trip)
  const open = useUnaAperta()
  const ticket = useRef<HTMLElement>(null)
  const nDays = trip.days.length || daysBetween(trip.startDate, trip.endDate) + 1
  const nights = Math.max(0, daysBetween(trip.startDate, trip.endDate))
  const people = trip.travelers.map((p) => ({ name: p.name, n: discOf(trip, p.id) }))
  const giorno = alGiorno(r.speso, trip, today)
  const avanzo = r.limit ? round2(r.limit - r.speso) : null
  const cityGroups = groups.filter((g) => g.kind === 'city')
  const colorOf = new Map<string, string>()
  for (const g of cityGroups) if (!colorOf.has(g.title)) colorOf.set(g.title, CITY_DISCS[colorOf.size % CITY_DISCS.length])
  const legend = [...colorOf.entries()].map(([c, col]) => ({ c, col, n: cityGroups.filter((g) => g.title === c).reduce((s, g) => s + g.cells.length, 0) }))

  async function condividi() {
    const text = `${nDays} giorni in ${trip.destination} con Faraway`
    const el = ticket.current
    try {
      const blob = el ? await nodeToPng(el) : null
      const file = blob ? new File([blob], 'faraway-viaggio.png', { type: 'image/png' }) : null
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text })
      } else if (file) {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(file)
        a.download = file.name
        a.click()
        showToast('Immagine scaricata')
      } else if (navigator.share) await navigator.share({ text })
    } catch {
      // condivisione annullata
    }
  }

  return (
    <Schermata gap={15} rete={{ pill: false }}>
      <Saluto date={longIn(now)} greeting="Bentornato" name={firstName(me?.name)} />
      <Offline />
      <RimborsiOggi trip={trip} />
      <Riepilogo
        dove={trip.destination}
        speso={r.speso}
        currency={trip.baseCurrency}
        limit={r.limit}
        second={
          r.solo ? (
            <DueValori
              a={{ l: 'Al giorno', v: formatMoney(giorno.perDay, trip.baseCurrency), c: `in ${giorno.days} ${giorno.days === 1 ? 'giorno' : 'giorni'}` }}
              b={avanzo === null ? undefined : avanzo >= 0 ? { l: 'Avanzati del budget', v: formatMoney(avanzo, trip.baseCurrency), c: 'non spesi' } : { l: 'Oltre il budget', v: formatMoney(-avanzo, trip.baseCurrency), c: 'in più' }}
            />
          ) : (
            <SaldoPersone saldo={r.mioSaldo} currency={trip.baseCurrency} people={people} />
          )
        }
      />

      <section ref={ticket} aria-label="Il viaggio in numeri" className="fa-r2 fa-tkt" role="group">
        <div className="tp hero">
          <SimboloPiatto style={{ right: 14, top: 14, width: 40 }} />
          <span className="k">Il viaggio in numeri</span>
          <div className="n">
            <b>{nDays}</b>
            <span>
              {nDays === 1 ? 'giorno' : 'giorni'} in <br />
              {trip.destination}
            </span>
          </div>
          <span className="s">
            {rangeText(trip.startDate, trip.endDate)} · {nights} {nights === 1 ? 'notte' : 'notti'}
          </span>
          {groups.length > 0 ? (
            <>
              <div className="seg" role="img" aria-label="Giorni per città">
                {groups.map((g, i) => (
                  <i key={i} style={{ flex: g.cells.length, background: g.kind === 'city' ? `var(--disco-${colorOf.get(g.title)})` : 'var(--disco-ardesia)' }} />
                ))}
              </div>
              <div className="leg">
                {legend.map((l) => (
                  <span key={l.c}>
                    <i style={{ background: `var(--disco-${l.col})` }} /> {l.c} <b>{l.n}</b>
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="bt">
          <div className="grp">Sul posto</div>
          <div className="r2">
            <Ic name="i-nav-route" size={48} />
            <div className="tx">
              <div className="t">Tappe fatte</div>
              <div className="m">
                {n.tappeFatte} su {n.tappePianificate} pianificate
              </div>
            </div>
            <div className="rg" role="img" aria-label={`${n.tappeFatte} (${n.tappePianificate ? Math.round((n.tappeFatte / n.tappePianificate) * 100) : 0}%)`} style={{ ['--p' as string]: n.tappePianificate ? Math.round((n.tappeFatte / n.tappePianificate) * 100) : 0 } as React.CSSProperties}>
              <b>{n.tappeFatte}</b>
            </div>
          </div>
          <div className="r2">
            <Ic name="i-cat-temple" size={48} />
            <div className="tx">
              <div className="t">Luoghi visitati</div>
              <div className="m">
                {n.luoghiVisitati} su {n.luoghiSalvati} salvati
              </div>
            </div>
            <div className="rg" role="img" aria-label={`${n.luoghiVisitati} (${n.luoghiSalvati ? Math.round((n.luoghiVisitati / n.luoghiSalvati) * 100) : 0}%)`} style={{ ['--p' as string]: n.luoghiSalvati ? Math.round((n.luoghiVisitati / n.luoghiSalvati) * 100) : 0 } as React.CSSProperties}>
              <b>{n.luoghiVisitati}</b>
            </div>
          </div>
          <div className="r2">
            <Ic name="i-cat-stay" size={48} />
            <div className="tx">
              <div className="t">Notti</div>
              <div className="m">
                in {n.alloggi} {n.alloggi === 1 ? 'alloggio' : 'alloggi'}
              </div>
            </div>
            <div className="nc">{n.notti}</div>
          </div>
          {n.spostamenti > 0 ? <div className="grp">Spostamenti</div> : null}
          {n.voli > 0 ? (
            <div className="r2">
              <Ic name="i-tra-plane" size={48} />
              <div className="tx">
                <div className="t">Voli</div>
                <div className="m">{n.cittaVoli.join(', ')}</div>
              </div>
              <div className="nc">{n.voli}</div>
            </div>
          ) : null}
          {n.treni > 0 ? (
            <div className="r2">
              <Ic name="i-tra-train" size={48} />
              <div className="tx">
                <div className="t">Treni</div>
                <div className="m">corse in treno</div>
              </div>
              <div className="nc">{n.treni}</div>
            </div>
          ) : null}
          {n.metroBus > 0 ? (
            <div className="r2">
              <Ic name="i-tra-metro" size={48} />
              <div className="tx">
                <div className="t">Metro e bus</div>
                <div className="m">corse con biglietto</div>
              </div>
              <div className="nc">{n.metroBus}</div>
            </div>
          ) : null}
          <div className="ft">
            <div aria-hidden="true" className="cd" />
            <div className="fr">
              <div>
                <b>
                  {n.spostamenti} {n.spostamenti === 1 ? 'spostamento' : 'spostamenti'}
                </b>
                <span>
                  in {nDays} {nDays === 1 ? 'giorno' : 'giorni'}
                </span>
              </div>
              <button type="button" className="fa-btn" onClick={() => void condividi()}>
                <Sv name="share" size={18} />
                Condividi
              </button>
            </div>
          </div>
        </div>
      </section>

      {r.limit ? (
        <button type="button" className="fa-card xl fa-bc" aria-label={`Budget del viaggio: ${avanzo !== null && avanzo >= 0 ? `sotto di ${Math.round(avanzo)} euro` : `oltre di ${Math.round(-(avanzo ?? 0))} euro`}. Apri il dettaglio`} onClick={() => navigate('/spese')}>
          <div className="top">
            <Ic name="i-sez-budget" size={44} />
            <div className="tx">
              <div className="t">Budget del viaggio</div>
              <div className="m">
                {formatMoney(Math.round(r.speso), trip.baseCurrency).replace(/,00/, '')} spesi su {formatMoney(r.limit, trip.baseCurrency).replace(/,00/, '')}
              </div>
            </div>
            <span style={{ color: 'var(--ink-muted)' }}>
              <Sv name="chevr" size={20} />
            </span>
          </div>
          <div className="bar" role="img" aria-label={`${Math.round((r.speso / r.limit) * 100)}% del budget speso`}>
            <i style={{ width: `${Math.min(100, Math.round((r.speso / r.limit) * 100))}%` }} />
          </div>
          <div className="ft">
            {avanzo !== null && avanzo >= 0 ? (
              <span className="fa-st ok">
                <Sv name="check" size={16} />
                Sotto il budget
              </span>
            ) : (
              <span className="fa-st ba">
                <Sv name="warn" size={16} />
                Oltre il budget
              </span>
            )}
            <b>{avanzo !== null && avanzo >= 0 ? `${formatMoney(Math.round(avanzo), trip.baseCurrency).replace(/,00/, '')} avanzati` : `${formatMoney(Math.round(-(avanzo ?? 0)), trip.baseCurrency).replace(/,00/, '')} in più`}</b>
          </div>
        </button>
      ) : null}

      {cityGroups.length > 0 ? (
        <section className="fa-card xl" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 4px' }}>
            <h2 className="fa-h3">Rivedi i giorni</h2>
          </div>
          {cityGroups.map((g, i) => {
            const id = `${i}-${g.cells[0].day.id}`
            const tappe = g.cells.reduce((s, c) => s + c.day.items.length, 0)
            return (
              <RigaApribile key={id} icon="i-nav-calendar" title={`${g.title} · ${rangeText(g.cells[0].day.date, g.cells[g.cells.length - 1].day.date)}`} sub={`${g.cells.length} ${g.cells.length === 1 ? 'giorno' : 'giorni'} · ${tappe} ${tappe === 1 ? 'tappa' : 'tappe'}`} open={open.isOpen(id)} onToggle={() => open.toggle(id)}>
                <div className="fa-list">
                  {g.cells.map((c) => (
                    <button key={c.day.id} type="button" className="fa-row" style={{ minHeight: 52, gridTemplateColumns: 'minmax(0,1fr) auto' }} onClick={() => navigate(`/giorni/${c.day.id}`)}>
                      <span>
                        <span className="t" style={{ display: 'block' }}>
                          {cap(wdm(c.day.date))}
                        </span>
                        <span className="s" style={{ display: 'block' }}>
                          {c.label} · {c.day.items.length} {c.day.items.length === 1 ? 'tappa' : 'tappe'}
                        </span>
                      </span>
                      <span className="end">
                        <Sv name="chevr" size={20} />
                      </span>
                    </button>
                  ))}
                </div>
              </RigaApribile>
            )
          })}
        </section>
      ) : null}
    </Schermata>
  )
}

/** Immagine PNG di un elemento (per «Condividi»): copia il DOM con gli stili in un SVG e lo disegna su un canvas. */
async function nodeToPng(node: HTMLElement): Promise<Blob | null> {
  const rect = node.getBoundingClientRect()
  const clone = node.cloneNode(true) as HTMLElement
  const inline = (src: Element, dst: Element) => {
    const cs = getComputedStyle(src)
    let css = ''
    for (let i = 0; i < cs.length; i++) css += `${cs[i]}:${cs.getPropertyValue(cs[i])};`
    dst.setAttribute('style', css)
    for (let i = 0; i < src.children.length; i++) inline(src.children[i], dst.children[i])
  }
  inline(node, clone)
  clone.querySelectorAll('button').forEach((b) => b.remove())
  const sprite = document.querySelector('svg defs')?.outerHTML ?? ''
  const w = Math.ceil(rect.width)
  const h = Math.ceil(rect.height)
  const xml = new XMLSerializer().serializeToString(clone)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><svg width="0" height="0">${sprite}</svg><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await img.decode()
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(scale, scale)
  ctx.drawImage(img, 0, 0)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

