// Biglietto orizzontale di un trasporto (componente TicketOrizzontale, mock Fa-40 e Fa-41, #37): intestazione con nome, data,
// fermate e stato (Pagato / Non pagato); percorso con orari, durata e «Maps» su partenza e arrivo. Aperto in linea:
// prezzo, a testa, codice, passeggeri, nota e azioni. «Mostra il codice» compare solo se c'è un codice salvato (#38).
import type { ReactNode } from 'react'
import { ora } from '../lib/formati'
import { formatWhen, transportWhen } from '../lib/logistics'
import { formatMoney } from '../lib/money'
import { MODE_NOME, durataTrasporto, fermate, prezzoDi } from '../lib/trasporti'
import type { Transport, Trip } from '../types'
import { MovementIcon } from '../ui/MovementIcon'
import { Pulsante } from './base'
import { cx } from './cx'
import { Sv } from './icons'
import { PersoneRiga } from './Persone'

/** Un solo «Maps» per il tragitto: indicazioni da partenza ad arrivo (con le coordinate, se ci sono). */
const direzioni = (t: Transport) => {
  const pt = (lat: number | undefined, lng: number | undefined, nome: string) => encodeURIComponent(lat != null && lng != null ? `${lat},${lng}` : nome)
  return `https://www.google.com/maps/dir/?api=1&origin=${pt(t.fromLat, t.fromLng, t.from)}&destination=${pt(t.toLat, t.toLng, t.to)}`
}

interface Props {
  trip: Trip
  transport: Transport
  open: boolean
  onToggle: () => void
  onEdit: (focus?: 'prezzo') => void
  onDelete: () => void
  /** visualizzatore (0049): niente prezzo, «Pagato», Modifica ed Elimina */
  lettura?: boolean
  /** «Mostra il codice» (#38): senza codice salvato porta a «Nessun codice associato». */
  onCode: () => void
}

export function CartaTrasporto({ trip, transport: t, open, onToggle, onEdit, onDelete, onCode, lettura }: Props) {
  const w = transportWhen(t, trip.timezone, trip.days)
  const dur = durataTrasporto(t)
  const prezzo = prezzoDi(t, trip.travelers.length)
  const ids = t.forTravelers?.length ? t.forTravelers : trip.travelers.map((p) => p.id)
  const people = ids.map((id) => trip.travelers.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
  const cur = t.currency
  const dataBreve = w.depart ? formatWhen({ date: w.depart.date, time: '' }, trip.timezone) : MODE_NOME[t.mode]
  const sub = [dataBreve, fermate(t)].filter(Boolean).join(' · ')
  const manca = prezzo.totale === null
  const rows: [string, ReactNode][] = [
    ['Codice', t.refCode ?? ''],
    ['Operatore', t.operator ?? ''],
    ['Terminal', t.terminal ?? ''],
    ['Binario', t.platform ?? ''],
    ['Passeggeri', people.length ? <PersoneRiga trip={trip} ids={people.map((p) => p.id)} /> : ''],
    ...(lettura ? [] : [['Prezzo', manca ? 'Non ancora inserito' : prezzo.persone > 1 && prezzo.aTesta !== null ? `${prezzo.persone} × ${formatMoney(prezzo.aTesta, cur)}` : formatMoney(prezzo.totale as number, cur)] as [string, ReactNode]]),
    ['Bagaglio', t.baggage ?? ''],
    ['Cambio e rimborso', t.policy ?? ''],
    ['Nota', t.notes ?? ''],
  ]
  return (
    <div className="k-TicketOrizzontale">
      <div className={cx('tk tv th', !t.bought && !lettura && 'todo', open && 'open')}>
        <div className="a v-top">
          <button type="button" className="hdl" aria-expanded={open} onClick={onToggle}>
            <span className="kd" aria-hidden="true">
              <MovementIcon event={{ kind: 'transport', mode: t.mode, title: '' }} size={22} />
            </span>
            <span className="ti">
              {t.title?.trim() ? <b>{t.title.trim()}</b> : null}
              <span>{sub}</span>
            </span>
            {lettura ? null : (
              <span className={cx('pl3b', t.bought ? 'ok' : 'td')}>
                <Sv name={t.bought ? 'check' : 'clock'} size={16} />
                {t.bought ? 'Pagato' : 'Non pagato'}
              </span>
            )}
            <span className="chv" aria-hidden="true">
              <Sv name="chev" size={20} />
            </span>
          </button>
          <div className="hz2">
            <div className="hs l">
              <span className="tm">{ora(w.depart?.time) || '—'}</span>
              <b>{t.from}</b>
            </div>
            <div className="rt2" aria-hidden="true">
              <span className="rl">
                <i className="dot" />
                <span className="ln" />
                <span className="pl">
                  <MovementIcon event={{ kind: 'transport', mode: t.mode, title: '' }} size={18} />
                </span>
                <span className="ln" />
                <i className="hole" />
              </span>
              <span className="dr">{dur}</span>
            </div>
            <div className="hs r">
              <span className="tm">{ora(w.arrive?.time) || '—'}</span>
              <b>{t.to}</b>
            </div>
          </div>
        </div>
        {open ? (
          <div className="b">
            {/* visualizzatore: niente prezzo, e le persone sono già in «Passeggeri» qui sotto */}
            {lettura ? null : (
            <div className="pr">
                <div>
                  {lettura ? null : (
                    <div className="pv" style={manca ? { color: 'var(--ink-muted)' } : undefined}>
                      {manca ? 'Prezzo non inserito' : formatMoney(prezzo.totale as number, cur)}
                    </div>
                  )}
                  {/* le persone (con i pallini) sono in «Passeggeri» qui sotto: qui solo quante e quanto a testa */}
                  <div className="pn">
                    <span>
                      {people.length === 1 ? '1 persona' : `${people.length} persone`}
                      {!lettura && !manca && prezzo.persone > 1 && prezzo.aTesta !== null ? ` · ${formatMoney(prezzo.aTesta, cur)} a testa` : ''}
                    </span>
                  </div>
                </div>
                {manca && !lettura ? (
                  <Pulsante size="sm" iconLeading="plus" onPress={() => onEdit('prezzo')}>
                    Aggiungi prezzo
                  </Pulsante>
                ) : null}
              </div>
            )}
            <dl className="dl" style={lettura ? { marginTop: 0, borderTop: 0, paddingTop: 0 } : undefined}>
              {rows
                .filter(([k, v]) => v || (k === 'Prezzo' && !lettura))
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            <div className="acts2">
              <Pulsante size="sm" color="secondary" iconLeading="pin" href={direzioni(t)} target="_blank" aria-label={`Maps: da ${t.from} a ${t.to}`}>
                Maps
              </Pulsante>
              <Pulsante size="sm" color="secondary" iconLeading="qr" onPress={onCode}>
                Codice
              </Pulsante>
              {lettura ? null : (
                <>
                  <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={() => onEdit()}>
                    Modifica
                  </Pulsante>
                  <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={onDelete}>
                    Elimina
                  </Pulsante>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
