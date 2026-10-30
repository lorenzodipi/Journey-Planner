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
import type { Trip, TripCountry } from '../../types'
import { Avatars, Banner, Campo, Pulsante } from '../../faraway/base'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { initials } from '../../state/me'

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
  const editing = Boolean(trip)
  const ownEmail = auth.session?.user.email ?? undefined
  const meta = auth.session?.user.user_metadata as { full_name?: string; name?: string } | undefined

  const [title, setTitle] = useState(trip?.title ?? '')
  const [origin, setOrigin] = useState(countryByCode(trip?.originCountry)?.name ?? '')
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
  function cambiaCasa(name: string) {
    setOrigin(name)
    const c = countryByName(name)
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
    const origine = countryByName(origin)
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
    }
    const invalid = validateTrip(input)
    if (invalid) return setError(invalid)

    let people: TripPeople = { self: { name: '', color: TRAVELER_COLORS[0] }, others: [] }
    if (!editing) {
      const cleaned = cleanPeople(selfName, others, ownEmail)
      if (cleaned.error) return setError(cleaned.error)
      people = { self: { name: cleaned.self, color: TRAVELER_COLORS[0] }, others: cleaned.others.map((o, i) => ({ ...o, color: TRAVELER_COLORS[(i + 1) % TRAVELER_COLORS.length] })) }
    }

    setBusy(true)
    const message = editing && trip ? await t.updateTrip(trip.id, input) : await t.createTrip(input, people)
    setBusy(false)
    if (message) return setError(message)
    showToast(editing ? 'Viaggio aggiornato' : 'Viaggio creato')
    onDone?.()
    onClose()
  }

  async function invita() {
    if (!invito) return
    if (editing && trip) {
      const email = invito.email.trim().toLowerCase()
      if (!email) return setError('Scrivi l’email dell’account della persona.')
      const message = await t.addTraveler(trip.id, { email, name: invito.name.trim() || nameFromEmail(email), color: TRAVELER_COLORS[trip.travelers.length % TRAVELER_COLORS.length] })
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
    const ok = await ask({
      title: `Eliminare ${trip.title}?`,
      message: `Perderai tappe, spese e biglietti di ${trip.title} per tutti i viaggiatori. Non si può annullare.`,
      confirm: 'Elimina viaggio',
      cancel: 'Tieni il viaggio',
      destructive: true,
    })
    if (!ok) return
    const message = await t.deleteTrip(trip.id)
    if (message) return setError(message)
    onClose()
    navigate('/')
  }

  const organizza = !trip || trip.myRole === undefined || trip.myRole === 'owner'
  const casaSym = symbolOf(home)

  return (
    <Foglio open={open} full title={editing ? 'Modifica viaggio' : 'Nuovo viaggio'} onClose={onClose}>
      <form id="viaggio-form" onSubmit={submit} noValidate className="fa-stack" style={{ gap: 24 }}>
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

        <section style={{ display: 'grid', gap: 12 }}>
          <h2 className="fa-h3">Da dove parti</h2>
          <Campo label="Paese di partenza" icon="globe" value={origin} onChange={cambiaCasa} list="paesi-elenco" autoComplete="off" placeholder="Scegli il paese" />
          <Campo label="Valuta di casa" icon="bag" value={home} onChange={(v) => setHome(v.trim().toUpperCase().slice(0, 3))} placeholder="EUR" maxLength={3} hint={`${/^[A-Z]{3}$/.test(home) ? `${nomeValuta(home)}. ` : ''}Gli importi del viaggio si convertono in questa valuta.`} />
        </section>

        <section style={{ display: 'grid', gap: 12 }}>
          <h2 className="fa-h3">Dove vai</h2>
          {paesi.map((p, i) => {
            const stessa = !p.currency || p.currency === home
            const n = parseRate(p.rate)
            return (
              <div key={p.id} className="fa-card xl" style={{ display: 'grid', gap: 12, padding: 16 }}>
                {p.name && countryByName(p.name) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                  <div style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
                    <button type="button" aria-expanded={p.quando} onClick={() => setPaese(p.id, { quando: !p.quando })} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: 'none', border: 0, padding: '4px 0', minHeight: 32, font: 'inherit', color: 'inherit', textAlign: 'left' }}>
                      <span className="fa-m">Quando</span>
                      <span className="fa-b">{intervallo(p.startDate, p.endDate)}{paesi.some((x, j) => j !== i && x.startDate <= p.endDate && x.endDate >= p.startDate && p.startDate === x.endDate) ? ' · scalo' : ''}</span>
                    </button>
                    {p.quando ? (
                      <div className="fa-2c">
                        <Campo label="Dal" type="date" icon="cal" value={p.startDate} onChange={(v) => setPaese(p.id, { startDate: v, endDate: p.endDate < v ? v : p.endDate })} min={startDate || undefined} max={endDate || undefined} />
                        <Campo label="Al" type="date" icon="cal" value={p.endDate} onChange={(v) => setPaese(p.id, { endDate: v })} min={p.startDate || undefined} max={endDate || undefined} />
                      </div>
                    ) : null}
                    {!stessa ? (
                      <>
                        <button type="button" aria-expanded={p.cambio} onClick={() => setPaese(p.id, { cambio: !p.cambio })} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: 'none', border: 0, padding: '4px 0', minHeight: 32, font: 'inherit', color: 'inherit', textAlign: 'left' }}>
                          <span className="fa-m">Cambio</span>
                          <span className="fa-b" style={{ fontVariantNumeric: 'tabular-nums' }}>{n ? `1 ${casaSym} = ${p.rate} ${symbolOf(p.currency)}` : p.fonte === 'attesa' ? 'Lo leggo…' : 'Da scrivere'}</span>
                        </button>
                        {p.cambio ? (
                          <div style={{ display: 'grid', gap: 8 }}>
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

        <section style={{ display: 'grid', gap: 12 }}>
          <h2 className="fa-h3">Quando</h2>
          <div className="fa-2c">
            <Campo label="Dal" type="date" icon="cal" value={startDate} onChange={(v) => cambiaDate(v, endDate)} />
            <Campo label="Al" type="date" icon="cal" value={endDate} onChange={(v) => cambiaDate(startDate, v)} error={!dateOk ? (dateError ?? `La fine è prima dell'inizio. Scegli una data dopo il ${formatShort(startDate)}.`) : undefined} />
          </div>
        </section>

        <section style={{ display: 'grid', gap: 12 }}>
          <h2 className="fa-h3">Budget</h2>
          <Campo label="Budget (facoltativo)" icon="bag" inputMode="decimal" value={budget} onChange={setBudget} placeholder={`es. 3.000 ${casaSym}`} maxLength={12} />
        </section>

        <section style={{ display: 'grid', gap: 12 }}>
          <h2 className="fa-h3">Chi viene</h2>
          {!editing ? <Campo label="Il tuo nome" value={selfName} onChange={setSelfName} maxLength={40} autoComplete="off" /> : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatars people={persone} />
            <span className="fa-m" style={{ color: 'var(--ink-muted)' }}>{persone.length === 1 ? 'Solo tu' : `Tu e altre ${persone.length - 1 === 1 ? 'una persona' : `${persone.length - 1} persone`}`}</span>
          </div>
          {invito ? (
            <div className="fa-card xl" style={{ display: 'grid', gap: 12, padding: 16 }}>
              <Campo label="Email dell'account" type="email" inputMode="email" value={invito.email} onChange={(v) => setInvito({ ...invito, email: v })} autoComplete="off" placeholder="Email del suo account" autoFocus />
              <Campo label="Nome (facoltativo)" value={invito.name} onChange={(v) => setInvito({ ...invito, name: v })} maxLength={40} autoComplete="off" />
              <div style={{ display: 'flex', gap: 8 }}>
                <Pulsante size="sm" onPress={() => void invita()}>
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

        <Pulsante type="submit" isLoading={busy}>
          {busy ? 'Salvataggio…' : editing ? 'Salva modifiche' : 'Crea il viaggio'}
        </Pulsante>

        {editing && organizza ? (
          <Pulsante color="tertiary-destructive" iconLeading="trash" onPress={() => void elimina()}>
            Elimina viaggio
          </Pulsante>
        ) : null}
        <datalist id="paesi-elenco">
          {nomiPaesi.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </form>
      {confirmNode}
    </Foglio>
  )
}
