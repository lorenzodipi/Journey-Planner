// Oggi dopo il viaggio, «Com'è andata» (#30): la card viola con i giorni e le città, poi sei posti con le card che hanno
// i dati veri del viaggio. Quali e dove: `src/lib/dopoViaggio.ts`. Niente soldi qui: stanno in Spese.
import { useMemo, useRef } from 'react'
import { condividiRiepilogo } from '../faraway/condividiRiepilogo'
import { CardChecklist, CardCitta, CardDaVedere, CardDormito, CardMossi, CardPaesi, CardPieno, CardTappe, CardVisto, CardVolo, disco } from '../faraway/DopoCard'
import { Offline } from '../faraway/Offline'
import { PulsanteIcona, Pulsante } from '../faraway/base'
import { Affianca, Schermata } from '../faraway/shell'
import { LOCALE, t as tt } from '../i18n'
import { groupDays, rangeText } from '../lib/dayGroups'
import { parseYmd } from '../lib/dates'
import { datiDopo, righeDopo, type Dati } from '../lib/dopoViaggio'
import { soloLettura } from '../lib/ruolo'
import type { Trip } from '../types'

const giornoBreve = (ymd: string) => new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric' }).format(parseYmd(ymd)).replace(/\./g, '')

export function OggiDopo({ trip, today }: { trip: Trip; now?: Date; today: string }) {
  const dati = useMemo(() => datiDopo(trip, { checklist: !soloLettura(trip) }), [trip])
  const righe = useMemo(() => righeDopo(dati), [dati])
  const groups = useMemo(() => groupDays(trip, today), [trip, today])
  const viola = useRef<HTMLElement>(null)

  // colore di ogni città, uguale nella barra, nella mappa e negli alloggi
  const colori = new Map<string, number>()
  for (const nome of dati.citta) colori.set(nome.toLowerCase(), colori.size)
  const coloreCitta = (nome: string, resto: number) => (colori.has(nome.trim().toLowerCase()) ? disco(colori.get(nome.trim().toLowerCase()) as number) : disco(colori.size + resto))
  const coloreGruppo = (g: (typeof groups)[number]) => (g.kind === 'city' ? coloreCitta(g.title, 0) : 'var(--disco-ardesia)')
  const legenda: { c: string; col: string; n: number }[] = []
  for (const g of groups) {
    const l = legenda.find((x) => x.c === g.title)
    if (l) l.n += g.cells.length
    else legenda.push({ c: g.title, col: coloreGruppo(g), n: g.cells.length })
  }
  const conCitta = dati.citta.length > 0

  const condividi = () => void condividiRiepilogo(viola.current, tt('{nDays} giorni in {destination} con Faraway', { nDays: dati.giorni, destination: trip.destination }))

  return (
    <Schermata
      gap={16}
      rete={{ pill: false }}
      fisso
      fissa={
        <div className="k-Copertina">
          <header>
            <div>
              <div className="m">
                {trip.destination} · {rangeText(trip.startDate, trip.endDate)}
              </div>
              <h2>{tt('Com’è andata')}</h2>
            </div>
            <PulsanteIcona icon="share" label={tt('Condividi il riepilogo')} onPress={condividi} />
          </header>
        </div>
      }
    >
      <h1 className="sr-only">{tt('Com’è andata, {destination}', { destination: trip.destination })}</h1>
      <Offline />
      <Affianca uguali className="fa-dp">
        <section ref={viola} className="dp-c lav" aria-label={tt('Giorni e città')}>
          <div className="dp-big">
            <b>{dati.giorni}</b>
            <span>
              {dati.giorni === 1 ? tt('giorno') : tt('giorni')}
              {dati.citta.length > 0 ? (dati.citta.length === 1 ? tt(', 1 città') : tt(', {n} città', { n: dati.citta.length })) : ''}
            </span>
          </div>
          {groups.length > 0 && conCitta ? (
            <>
              <div className="dp-traccia" role="img" aria-label={tt('Giorni per città')}>
                {groups.map((g, i) => (
                  <i key={i} style={{ flex: g.cells.length, background: coloreGruppo(g) }} />
                ))}
              </div>
              <ul className="dp-legh">
                {legenda.map((l) => (
                  <li key={l.c}>
                    <i style={{ background: l.col }} aria-hidden="true" />
                    {l.c} · {l.n} {l.n === 1 ? tt('giorno') : tt('giorni')}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
        {righe.map((r) =>
          r.tipo === 'larga' ? (
            <Larga key={r.id} id={r.id} dati={dati} trip={trip} coloreCitta={coloreCitta} />
          ) : (
            <div key={r.id.join('+')} className="dp-coppia">
              {r.id.map((id) => (
                <Stretta key={id} id={id} dati={dati} />
              ))}
            </div>
          ),
        )}
      </Affianca>
      <Pulsante iconLeading="share" onPress={condividi}>
        {tt('Condividi il riepilogo')}
      </Pulsante>
    </Schermata>
  )
}

function Larga({ id, dati, trip, coloreCitta }: { id: string; dati: Dati; trip: Trip; coloreCitta: (c: string, i: number) => string }) {
  const l = dati.larghe
  if (id === 'citta' && l.citta) return <CardCitta dati={l.citta} />
  if (id === 'visto' && l.visto) return <CardVisto dati={l.visto} />
  if (id === 'davedere' && l.davedere) return <CardDaVedere dati={l.davedere} />
  if (id === 'volo' && l.volo) return <CardVolo dati={l.volo} destinazione={trip.destination} />
  if (id === 'dormito' && l.dormito) return <CardDormito dati={l.dormito} colore={coloreCitta} />
  if (id === 'mossi' && l.mossi) return <CardMossi dati={l.mossi} />
  return null
}

function Stretta({ id, dati }: { id: string; dati: Dati }) {
  const s = dati.strette
  if (id === 'paesi' && s.paesi) return <CardPaesi dati={s.paesi} />
  if (id === 'tappe' && s.tappe) return <CardTappe dati={s.tappe} />
  if (id === 'pieno' && s.pieno) return <CardPieno dati={s.pieno} giorno={giornoBreve(s.pieno.date)} />
  if (id === 'checklist' && s.checklist) return <CardChecklist dati={s.checklist} />
  return null
}

