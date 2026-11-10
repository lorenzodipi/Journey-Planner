// Foglio «Nuovo viaggio» e «Modifica viaggio» (mock Fa-13, #35): da dove parti, dove vai (più paesi con date e cambio),
// quando, budget, chi viene. «Elimina viaggio» solo in modifica e solo per chi organizza.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../../lib/auth'
import { COUNTRIES, countryByCode, countryByName, themeForCountry } from '../../lib/countries'
import { currencyName, parseAmount, parseRate } from '../../lib/money'
import { fetchFxRate } from '../../lib/moneyApi'
import { formatShort } from '../../lib/dates'
import { fieldText } from '../../lib/fx'
import { paesePrincipale, validaPaesi } from '../../lib/paesi'
import { TRAVELER_COLORS, cleanPeople, nameFromEmail, validateTrip } from '../../lib/tripForm'
import type { TripInput, TripPeople } from '../../lib/tripApi'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import { impattoDate } from '../../lib/gestioneViaggio'
import type { MezzoViaggio, Trip, TripCountry } from '../../types'

/** Soglie per andare a piedi, in minuti (0 = mai). */
const SOGLIE: [number, string][] = [[5, 'Fino a 5 min'], [10, 'Fino a 10 min'], [15, 'Fino a 15 min'], [20, 'Fino a 20 min'], [30, 'Fino a 30 min'], [0, 'Mai']]
import { Avatars, Banner, Campo, Chip, Pulsante } from '../../faraway/base'
import { CampoPaese } from '../../faraway/CampoPaese'
import { CampoValuta } from '../../faraway/CampoValuta'
import { Riquadri } from '../../faraway/Moduli'
import { mezzoSuggerito, SOGLIA_PIEDI_MIN } from '../../lib/spostamenti'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { useConfermaCentrata } from '../../faraway/Modale'
import { showAvviso } from '../../state/avviso'
import { Sv } from '../../faraway/icons'
import { initials } from '../../state/me'
import { useInCorso } from '../../faraway/Attesa'

type Fonte = 'salvato' | 'oggi' | 'mano' | 'errore' | 'attesa'
interface Bozza {
  id: string
  country: string
  name: string
  currency: string
  timezone: string
  startDate: string
  endDate: string
  /** «1 € = N valuta locale» come testo del campo */
  rate: string
  fonte: Fonte
  quando: boolean
  cambio: boolean
  error?: string
}

const nomeValuta = (c: string) => {
  const n = currencyName(c)
  return n ? `${n.charAt(0).toUpperCase()}${n.slice(1)} · ${c}` : c
}
const symbolOf = (cur: string) => {
  try {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? cur
  } catch {
    return cur
  }
}
/** Intervallo breve: «22 nov – 9 dic», o «21 – 22 nov» nello stesso mese. */
function intervallo(a: string, b: string): string {
  if (!a || !b) return 'Scegli le date'
  if (a === b) return formatShort(a)
  const [da, ma] = formatShort(a).split(' ')
  const [db, mb] = formatShort(b).split(' ')
  return ma === mb ? `${da} – ${db} ${mb}` : `${da} ${ma} – ${db} ${mb}`
}
/** Dal cambio salvato (unità di valuta di casa per 1 di valuta locale) al testo «1 € = N locale». */
const rateText = (fx: number | undefined) => (fx && fx > 0 ? fieldText(1 / fx) : '')

function daPaese(c: TripCountry, fonte: Fonte): Bozza {
  return { id: c.id, country: c.country, name: c.name, currency: c.currency, timezone: c.timezone, startDate: c.startDate, endDate: c.endDate, rate: rateText(c.fxRate), fonte, quando: false, cambio: false }
}

interface Props {
  /** Presente in modifica. */
  trip?: Trip
  open: boolean
  onClose: () => void
  onDone?: (id?: string) => void
}

export function ViaggioSheet({ trip, open, onClose, onDone }: Props) {
  const t = useTrips()
  const auth = useAuth()
  const [, navigate] = useLocation()
  const [ask, confirmNode] = useConferma()
  const [askCentro, confermaCentro] = useConfermaCentrata()
  const editing = Boolean(trip)
  const ownEmail = auth.session?.user.email ?? undefined
  const meta = auth.session?.user.user_metadata as { full_name?: string; name?: string } | undefined

  const [title, setTitle] = useState(trip?.title ?? '')
  const [origin, setOrigin] = useState(trip?.originCountry ?? '')
  const [home, setHome] = useState(trip?.baseCurrency ?? 'EUR')
  const [startDate, setStartDate] = useState(trip?.startDate ?? '')
  const [endDate, setEndDate] = useState(trip?.endDate ?? '')
  const [budget, setBudget] = useState(trip?.budgetLimit ? String(trip.budgetLimit).replace('.', ',') : '')
  const [paesi, setPaesi] = useState<Bozza[]>(() => {
    if (!trip) return []
    const base = trip.countries && trip.countries.length > 0 ? trip.countries : [{ id: 'unico', country: countryByName(trip.destination)?.code ?? '', name: trip.destination, currency: trip.localCurrency ?? '', timezone: trip.timezone, startDate: trip.startDate, endDate: trip.endDate, fxRate: trip.fxRate, position: 0 }]
    return base.map((c) => daPaese(c, 'salvato'))
  })
  const [selfName, setSelfName] = useState(meta?.full_name || meta?.name || (ownEmail ? nameFromEmail(ownEmail) : auth.status === 'demo' ? 'Tu' : ''))
  const [others, setOthers] = useState<{ email: string; name: string }[]>([])
  const [invito, setInvito] = useState<{ email: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // spostamenti tra le tappe (0045): senza scelta si propone il mezzo suggerito (auto in Islanda, con un noleggio…)
  const [mezzo, setMezzo] = useState<MezzoViaggio | ''>(trip?.moveMode ?? '')
  const [soglia, setSoglia] = useState<number>(trip?.walkMaxMin ?? SOGLIA_PIEDI_MIN)
  const suggerito = mezzoSuggerito({
    destination: paesi[0]?.name ?? trip?.destination ?? '',
    countries: paesi.map((p, i) => ({ id: p.id, country: p.country, name: p.name, currency: p.currency, timezone: p.timezone, startDate: p.startDate, endDate: p.endDate, position: i })),
    bookings: trip?.bookings ?? [],
    transports: trip?.transports ?? [],
  })
  /** Il mezzo mostrato: quello scelto, altrimenti il suggerito, altrimenti «Con i mezzi» (come prima della 0045). */
  const mezzoScelto: MezzoViaggio = mezzo || suggerito?.mezzo || 'transit'
  const nextId = useRef(0)

  const dateOk = !startDate || !endDate || endDate >= startDate
  const nomiPaesi = useMemo(() => COUNTRIES.map((c) => c.name), [])
  const persone = trip ? trip.travelers.map((p, i) => ({ initials: initials(p.name), n: i + 1 })) : [{ initials: initials(selfName || '?'), n: 1 }, ...others.map((o, i) => ({ initials: initials(o.name || nameFromEmail(o.email) || o.email), n: i + 2 }))]

  // il tasso si legge da solo (BCE, poi ripiego), ma solo se non è già salvato o scritto a mano
  useEffect(() => {
    let alive = true
    for (const p of paesi) {
      if (p.fonte !== 'attesa' || !p.currency || p.currency === home) continue
      fetchFxRate(p.currency, home)
        .then((r) => alive && setPaesi((cur) => cur.map((x) => (x.id === p.id && x.fonte === 'attesa' ? { ...x, rate: fieldText(1 / r), fonte: 'oggi' } : x))))
        .catch(() => alive && setPaesi((cur) => cur.map((x) => (x.id === p.id && x.fonte === 'attesa' ? { ...x, fonte: 'errore' } : x))))
    }
    return () => {
      alive = false
    }
  }, [paesi.map((p) => `${p.id}:${p.currency}:${p.fonte}`).join('|'), home]) // eslint-disable-line react-hooks/exhaustive-deps

  function setPaese(id: string, patch: Partial<Bozza>) {
    setPaesi((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  function scegliPaese(id: string, name: string) {
    const c = countryByName(name)
    if (!c) return setPaese(id, { name, country: '' })
    // la valuta e il fuso si propongono dal paese; il cambio si rilegge se la valuta è diversa da quella di casa
    setPaese(id, { name: c.name, country: c.code, currency: c.currency, timezone: c.timezone, rate: '', fonte: c.currency === home ? 'salvato' : 'attesa' })
  }
  function aggiungiPaese() {
    const last = paesi[paesi.length - 1]
    const start = last?.endDate || startDate
    setPaesi([...paesi, { id: `nuovo-${nextId.current++}`, country: '', name: '', currency: '', timezone: '', startDate: start && endDate && start > endDate ? endDate : start, endDate: endDate, rate: '', fonte: 'attesa', quando: false, cambio: false }])
  }
  function cambiaCasa(code: string) {
    setOrigin(code)
    const c = countryByCode(code)
    if (c) {
      setHome(c.currency)
      setPaesi((cur) => cur.map((p) => (p.fonte === 'mano' ? p : { ...p, rate: '', fonte: p.currency === c.currency ? 'salvato' : 'attesa' })))
    }
  }
  // cambiando le date del viaggio, i paesi appena aggiunti (con le stesse date) le seguono
  function cambiaDate(s: string, e: string) {
    setStartDate(s)
    setEndDate(e)
    setDateError(null)
    setPaesi((cur) => (cur.length === 1 && (!cur[0].startDate || cur[0].startDate === startDate) && (!cur[0].endDate || cur[0].endDate === endDate) ? [{ ...cur[0], startDate: s, endDate: e }] : cur))
  }

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    if (!dateOk) return setDateError(`La fine è prima dell'inizio. Scegli una data dopo il ${formatShort(startDate)}.`)
    let budgetLimit: number | null | undefined
    if (budget.trim()) {
      const n = parseAmount(budget)
      if (n === null || n <= 0 || n >= 1e11) return setError('Il budget è un importo maggiore di zero (esempio: 3000).')
      budgetLimit = n
    } else if (trip?.budgetLimit) budgetLimit = null

    const list: TripCountry[] = paesi.map((p, i) => {
      const r = p.currency && p.currency !== home ? parseRate(p.rate) : null
      return { id: p.id, country: p.country, name: p.name.trim(), currency: p.currency, timezone: p.timezone, startDate: p.startDate, endDate: p.endDate, ...(r ? { fxRate: 1 / r } : {}), position: i }
    })
    const problem = validaPaesi(list, startDate, endDate)
    if (problem) {
      if (problem.index !== null) setPaesi((cur) => cur.map((p, i) => ({ ...p, error: i === problem.index ? problem.message : undefined })))
      else setError(problem.message)
      return
    }
    const mancano = list.find((c) => c.currency && c.currency !== home && !c.fxRate)
    if (mancano) {
      setPaesi((cur) => cur.map((p) => (p.id === mancano.id ? { ...p, cambio: true, error: `Manca il cambio di ${mancano.currency}: scrivi quante ${mancano.currency} valgono 1 ${symbolOf(home)}.` } : p)))
      return
    }
    setPaesi((cur) => cur.map((p) => ({ ...p, error: undefined })))

    const principale = paesePrincipale({ destination: '', timezone: '', center: { lat: 0, lng: 0 }, startDate, endDate, countries: list })
    const paeseInfo = countryByCode(principale.country)
    const altri: Record<string, number> = { ...(trip?.fxRates ?? {}) }
    for (const c of list) if (c.id !== principale.id && c.currency && c.currency !== home && c.fxRate) altri[c.currency] = c.fxRate
    const origine = countryByCode(origin)
    const input: TripInput = {
      title: title.trim() || principale.name,
      destination: principale.name,
      startDate,
      endDate,
      timezone: principale.timezone,
      theme: paeseInfo ? themeForCountry(paeseInfo.code) : (trip?.theme ?? 'default'),
      baseCurrency: home,
      localCurrency: principale.currency && principale.currency !== home ? principale.currency : '',
      center: paeseInfo?.center ?? trip?.center ?? { lat: 41.9028, lng: 12.4964 },
      ...(budgetLimit !== undefined ? { budgetLimit } : {}),
      ...(origine ? { originCountry: origine.code, originTimezone: origine.timezone } : trip?.originCountry ? { originCountry: null, originTimezone: null } : {}),
      countries: list,
      fxRate: principale.currency && principale.currency !== home ? (principale.fxRate ?? null) : null,
      fxRates: altri,
      // scritti solo se cambiano, così senza la migrazione 0045 il resto si salva lo stesso
      ...(mezzoScelto !== (trip?.moveMode ?? 'transit') || (trip?.moveMode === undefined && mezzo) ? { moveMode: mezzoScelto } : {}),
      ...(soglia !== (trip?.walkMaxMin ?? SOGLIA_PIEDI_MIN) ? { walkMaxMin: soglia } : {}),
    }
    const invalid = validateTrip(input)
    if (invalid) return setError(invalid)

    let people: TripPeople = { self: { name: '', color: TRAVELER_COLORS[0] }, others: [] }
    if (!editing) {
      const cleaned = cleanPeople(selfName, others, ownEmail)
      if (cleaned.error) return setError(cleaned.error)
      people = { self: { name: cleaned.self, color: TRAVELER_COLORS[0] }, others: cleaned.others.map((o, i) => ({ ...o, color: TRAVELER_COLORS[(i + 1) % TRAVELER_COLORS.length] })) }
    }

    // TRIP-007: prima di cambiare le date, cosa cambia
    if (editing && trip && (trip.startDate !== startDate || trip.endDate !== endDate)) {
      const impatto = impattoDate(trip, startDate, endDate)
      if (impatto.length) {
        const ok = await ask({ title: 'Cambiare le date?', message: `${impatto.join('. ')}. Niente viene eliminato: i giorni tolti tornano se rimetti le date.`, confirm: 'Cambia le date', cancel: 'Non cambiare', destructive: false })
        if (!ok) return
      }
    }
    setBusy(true)
    const message = editing && trip ? await t.updateTrip(trip.id, input) : await t.createTrip(input, people)
    setBusy(false)
    if (message) return setError(message)
    showToast(editing ? 'Viaggio aggiornato' : 'Viaggio creato')
    onDone?.()
    onClose()
  }

  const [occ, faiOcc] = useInCorso()
  async function invita() {
    if (!invito) return
    if (editing && trip) {
      const email = invito.email.trim().toLowerCase()
      if (!email) return setError('Scrivi l’email dell’account della persona.')
      const message = await faiOcc('invita', () => t.addTraveler(trip.id, { email, name: invito.name.trim() || nameFromEmail(email), color: TRAVELER_COLORS[trip.travelers.length % TRAVELER_COLORS.length] }))
      if (message) return setError(message)
      showToast('Persona aggiunta')
    } else {
      const cleaned = cleanPeople(selfName || 'Tu', [...others, invito], ownEmail)
      if (cleaned.error) return setError(cleaned.error)
      setOthers([...others, invito])
    }
    setError(null)
    setInvito(null)
  }

  async function elimina() {
    if (!trip) return
    // azione definitiva: conferma al centro dello schermo, non dal basso
    const ok = await askCentro({
      title: `Eliminare «${trip.title}»?`,
      message: `Tappe, luoghi, spese e documenti spariscono per tutti i viaggiatori. Non si può annullare.`,
      confirm: 'Elimina il viaggio',
      cancel: 'Tieni il viaggio',
    })
    if (!ok) return
    const titolo = trip.title
    const message = await faiOcc('elimina', () => t.deleteTrip(trip.id))
    if (message) return setError(message)
    onClose()
    // si torna a «Tutti i viaggi», mai dentro un altro viaggio scelto da noi
    navigate('/viaggi', { replace: true })
    showAvviso({ title: 'Viaggio eliminato', message: `«${titolo}» non c'è più, per te e per chi viaggiava con te. Scegli un altro viaggio o creane uno nuovo.` })
  }

  const organizza = !trip || trip.myRole === undefined || trip.myRole === 'owner'
  const casaSym = symbolOf(home)

  return (
    <Foglio open={open} full title={editing ? 'Modifica viaggio' : 'Nuovo viaggio'} onClose={onClose}>
      <form id="viaggio-form" onSubmit={submit} noValidate className="fa-stack" style={{ gap: 'var(--gap-sezioni)' }}>
        {!dateOk ? (
          <Banner tone="cor" icon="err" title="Controlla le date.">
            Il viaggio non può finire prima di cominciare.
          </Banner>
        ) : null}
        {error ? (
          <Banner tone="cor" icon="err">
            {error}
          </Banner>
        ) : null}

        <Campo label="Nome del viaggio (facoltativo)" value={title} onChange={setTitle} placeholder="Se vuoto, il paese principale" maxLength={80} />

        <section className="fa-sez">
          <h2 className="fa-h3">Da dove parti</h2>
          <CampoPaese label="Paese di partenza" value={origin} onChange={cambiaCasa} />
          <CampoValuta label="Valuta di casa" value={home} onChange={setHome} tutte hint="Gli importi del viaggio si convertono in questa valuta." />
        </section>

        <section className="fa-sez">
          <h2 className="fa-h3">Dove vai</h2>
          {paesi.map((p, i) => {
            const stessa = !p.currency || p.currency === home
            const n = parseRate(p.rate)
            return (
              <div key={p.id} className="fa-card xl" style={{ display: 'grid', gap: 16, padding: 16 }}>
                {p.name && countryByName(p.name) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: 'var(--azzurro-soft)', color: 'var(--azzurro-ink)' }}>
                      <Sv name="globe" size={22} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fa-b">{p.name}</div>
                      <div className="fa-m" style={{ color: 'var(--ink-muted)' }}>{p.currency ? nomeValuta(p.currency) : 'Senza valuta'}</div>
                    </div>
                    {paesi.length > 1 ? (
                      <button type="button" className="fa-lnk" style={{ color: 'var(--danger)' }} onClick={() => setPaesi(paesi.filter((x) => x.id !== p.id))}>
                        Rimuovi
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <Campo label="Paese" icon="globe" value={p.name} onChange={(v) => scegliPaese(p.id, v)} list="paesi-elenco" autoComplete="off" placeholder="Scegli il paese" autoFocus={!editing} />
                    {paesi.length > 1 ? (
                      <button type="button" className="fa-lnk" style={{ color: 'var(--danger)', justifySelf: 'start' }} onClick={() => setPaesi(paesi.filter((x) => x.id !== p.id))}>
                        Rimuovi
                      </button>
                    ) : null}
                  </div>
                )}
                {p.name && countryByName(p.name) ? (
                  <div style={{ display: 'grid', gap: 0, borderTop: '1px solid var(--hairline)', paddingTop: 8 }}>
                    <button type="button" aria-expanded={p.quando} onClick={() => setPaese(p.id, { quando: !p.quando })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, background: 'none', border: 0, padding: '4px 0', minHeight: 32, font: 'inherit', color: 'inherit', textAlign: 'left' }}>
                      <span className="fa-m">Quando</span>
                      <span className="fa-b">{intervallo(p.startDate, p.endDate)}{paesi.some((x, j) => j !== i && x.startDate <= p.endDate && x.endDate >= p.startDate && p.startDate === x.endDate) ? ' · scalo' : ''}</span>
                    </button>
                    {p.quando ? (
                      <div className="fa-2c" style={{ margin: '8px 0 16px' }}>
                        <Campo label="Dal" type="date" icon="cal" value={p.startDate} onChange={(v) => setPaese(p.id, { startDate: v, endDate: p.endDate < v ? v : p.endDate })} min={startDate || undefined} max={endDate || undefined} />
                        <Campo label="Al" type="date" icon="cal" value={p.endDate} onChange={(v) => setPaese(p.id, { endDate: v })} min={p.startDate || undefined} max={endDate || undefined} />
                      </div>
                    ) : null}
                    {!stessa ? (
                      <>
                        <button type="button" aria-expanded={p.cambio} onClick={() => setPaese(p.id, { cambio: !p.cambio })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, background: 'none', border: 0, padding: '4px 0', minHeight: 32, font: 'inherit', color: 'inherit', textAlign: 'left' }}>
                          <span className="fa-m">Cambio</span>
                          <span className="fa-b" style={{ fontVariantNumeric: 'tabular-nums' }}>{n ? `1 ${casaSym} = ${p.rate} ${symbolOf(p.currency)}` : p.fonte === 'attesa' ? 'Lo leggo…' : 'Da scrivere'}</span>
                        </button>
                        {p.cambio ? (
                          <div style={{ display: 'grid', gap: 8, margin: '8px 0' }}>
                            <Campo label={`1 ${casaSym} = ? ${p.currency}`} inputMode="decimal" value={p.rate} onChange={(v) => setPaese(p.id, { rate: v, fonte: 'mano' })} placeholder="es. 4,02" />
                            <Pulsante size="sm" color="secondary" iconLeading="refresh" onPress={() => setPaese(p.id, { fonte: 'attesa', rate: '' })}>
                              Aggiorna dal servizio
                            </Pulsante>
                          </div>
                        ) : null}
                        <div className="fa-c" style={{ color: 'var(--ink-muted)' }}>
                          {p.fonte === 'oggi' ? 'Tasso aggiornato oggi · puoi cambiarlo a mano' : p.fonte === 'mano' ? 'Tasso scritto a mano' : p.fonte === 'errore' ? 'Non riesco a leggere il tasso: scrivilo a mano' : p.fonte === 'attesa' ? 'Sto leggendo il tasso del giorno' : 'Tasso salvato · puoi cambiarlo a mano'}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {p.error ? (
                  <span className="fa-help bad" role="alert">
                    <Sv name="err" size={16} />
                    {p.error}
                  </span>
                ) : null}
              </div>
            )
          })}
          <Pulsante color="secondary" iconLeading="plus" onPress={aggiungiPaese}>
            {paesi.length === 0 ? 'Aggiungi un paese' : 'Aggiungi un altro paese'}
          </Pulsante>
        </section>

        <section className="fa-sez">
          <h2 className="fa-h3">Quando</h2>
          <div className="fa-2c">
            <Campo label="Dal" type="date" icon="cal" value={startDate} onChange={(v) => cambiaDate(v, endDate)} />
            <Campo label="Al" type="date" icon="cal" value={endDate} onChange={(v) => cambiaDate(startDate, v)} error={!dateOk ? (dateError ?? `La fine è prima dell'inizio. Scegli una data dopo il ${formatShort(startDate)}.`) : undefined} />
          </div>
        </section>

        <section className="fa-sez">
          <h2 className="fa-h3">Budget</h2>
          <Campo
            label="Budget totale (facoltativo)"
            icon="bag"
            inputMode="decimal"
            value={budget}
            onChange={setBudget}
            placeholder="es. 3.000"
            maxLength={12}
            trailing={<span className="fa-suf" aria-hidden="true">{home}</span>}
            hint={`In ${currencyName(home) ? `${currencyName(home)} (${home})` : home}, la tua valuta di casa.`}
          />
        </section>

        <section className="fa-sez">
          <h2 className="fa-h3">Spostamenti tra le tappe</h2>
          <Riquadri<MezzoViaggio>
            label="Di solito vi spostate"
            cols={3}
            value={mezzoScelto}
            onChange={(m) => m && setMezzo(m)}
            options={[
              { value: 'car', label: 'In auto', glifo: 'g-tra-car', sub: 'Tempi su strada' },
              { value: 'transit', label: 'Con i mezzi', glifo: 'g-tra-metro', sub: 'Metro, bus, treni' },
              { value: 'walk', label: 'A piedi', glifo: 'g-tra-walk', sub: 'Sempre a piedi' },
            ]}
          >
            <span className="fa-help">
              {!mezzo && suggerito ? `Suggerito: ${suggerito.perche.charAt(0).toLowerCase()}${suggerito.perche.slice(1)} ` : ''}
              Ogni spostamento si può cambiare dalla sua riga nel giorno.
            </span>
          </Riquadri>
          {mezzoScelto !== 'walk' ? (
            <div className="fa-fld" role="group" aria-label="Tragitti brevi a piedi">
              Tragitti brevi a piedi
              <div className="fa-chips wrap">
                {SOGLIE.map(([v, l]) => (
                  <Chip key={v} on={soglia === v} onPress={() => setSoglia(v)}>
                    {l}
                  </Chip>
                ))}
              </div>
              <span className="fa-help">
                {soglia === 0
                  ? `Tra una tappa e l'altra si va sempre ${mezzoScelto === 'car' ? 'in auto' : 'con i mezzi'}, anche se è vicina.`
                  : `Se la tappa successiva è a ${soglia} minuti di cammino o meno ci si va a piedi; se è più lontana, ${mezzoScelto === 'car' ? 'in auto' : 'con i mezzi'}.`}
              </span>
            </div>
          ) : null}
        </section>

        <section className="fa-sez">
          <h2 className="fa-h3">Chi viene</h2>
          {!editing ? <Campo label="Il tuo nome" value={selfName} onChange={setSelfName} maxLength={40} autoComplete="off" /> : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatars people={persone} />
            <span className="fa-m" style={{ color: 'var(--ink-muted)' }}>{persone.length === 1 ? 'Solo tu' : `Tu e altre ${persone.length - 1 === 1 ? 'una persona' : `${persone.length - 1} persone`}`}</span>
          </div>
          {invito ? (
            <div className="fa-card xl" style={{ display: 'grid', gap: 16, padding: 16 }}>
              <Campo label="Email dell'account" type="email" inputMode="email" value={invito.email} onChange={(v) => setInvito({ ...invito, email: v })} autoComplete="off" placeholder="Email del suo account" autoFocus />
              <Campo label="Nome (facoltativo)" value={invito.name} onChange={(v) => setInvito({ ...invito, name: v })} maxLength={40} autoComplete="off" />
              <div style={{ display: 'flex', gap: 8 }}>
                <Pulsante size="sm" isLoading={occ === 'invita'} onPress={() => void invita()}>
                  {editing ? 'Aggiungi al viaggio' : 'Aggiungi'}
                </Pulsante>
                <Pulsante size="sm" color="secondary" onPress={() => setInvito(null)}>
                  Annulla
                </Pulsante>
              </div>
              <span className="fa-m" style={{ color: 'var(--ink-muted)' }}>La persona deve avere già un account: potrà vedere e modificare il viaggio.</span>
            </div>
          ) : (
            <Pulsante color="secondary" iconLeading="plus" onPress={() => setInvito({ email: '', name: '' })}>
              Invita una persona
            </Pulsante>
          )}
        </section>

        {/* i pulsanti di fine foglio stanno insieme: non prendono lo spazio tra le sezioni */}
        <div style={{ display: 'grid', gap: 8 }}>
          <Pulsante type="submit" isLoading={busy}>
            {editing ? 'Salva modifiche' : 'Crea il viaggio'}
          </Pulsante>
          {editing && organizza ? (
            <Pulsante color="tertiary-destructive" iconLeading="trash" isLoading={occ === 'elimina'} onPress={() => void elimina()}>
              Elimina viaggio
            </Pulsante>
          ) : null}
        </div>
        <datalist id="paesi-elenco">
          {nomiPaesi.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </form>
      {confirmNode}
      {confermaCentro}
    </Foglio>
  )
}
