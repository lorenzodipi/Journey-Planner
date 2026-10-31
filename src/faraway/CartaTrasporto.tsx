// Biglietto orizzontale di un trasporto (componente TicketOrizzontale, mock Fa-40 e Fa-41, #37): intestazione con nome, data,
// fermate e stato (Pagato / Non pagato); percorso con orari, durata e «Maps» su partenza e arrivo. Aperto in linea:
// prezzo, a testa, codice, passeggeri, nota e azioni. «Mostra il codice» compare solo se c'è un codice salvato (#38).
import { formatWhen, transportWhen } from '../lib/logistics'
import { formatMoney } from '../lib/money'
import { MODE_NOME, durataTrasporto, fermate, nomeTrasporto, prezzoDi } from '../lib/trasporti'
import { discOf, initials } from '../state/me'
import type { Transport, Trip } from '../types'
import { MovementIcon } from '../ui/MovementIcon'
import { Pulsante } from './base'
import { cx } from './cx'
import { Sv } from './icons'

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']
const maps = (t: Transport, side: 'from' | 'to') => {
  const lat = side === 'from' ? t.fromLat : t.toLat
  const lng = side === 'from' ? t.fromLng : t.toLng
  const label = side === 'from' ? t.from : t.to
  return `https://www.google.com/maps/search/?api=1&query=${lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(label)}`
}

interface Props {
  trip: Trip
  transport: Transport
  open: boolean
  onToggle: () => void
  onEdit: (focus?: 'prezzo') => void
  onDelete: () => void
  /** «Mostra il codice» (#38): senza codice salvato porta a «Nessun codice associato». */
  onCode: () => void
}

export function CartaTrasporto({ trip, transport: t, open, onToggle, onEdit, onDelete, onCode }: Props) {
  const w = transportWhen(t, trip.timezone, trip.days)
  const dur = durataTrasporto(t)
  const prezzo = prezzoDi(t, trip.travelers.length)
  const ids = t.forTravelers?.length ? t.forTravelers : trip.travelers.map((p) => p.id)
  const people = ids.map((id) => trip.travelers.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
  const cur = t.currency
  const dataBreve = w.depart ? formatWhen({ date: w.depart.date, time: '' }, trip.timezone) : MODE_NOME[t.mode]
  const sub = [dataBreve, fermate(t)].filter(Boolean).join(' · ')
  const manca = prezzo.totale === null
  const rows: [string, string][] = [
    ['Codice', t.refCode ?? ''],
    ['Operatore', t.operator ?? ''],
    ['Terminal', t.terminal ?? ''],
    ['Binario', t.platform ?? ''],
    ['Passeggeri', people.map((p) => p.name.split(/\s+/)[0]).join(', ')],
    ['Prezzo', manca ? 'Non ancora inserito' : prezzo.persone > 1 && prezzo.aTesta !== null ? `${prezzo.persone} × ${formatMoney(prezzo.aTesta, cur)}` : formatMoney(prezzo.totale as number, cur)],
    ['Bagaglio', t.baggage ?? ''],
    ['Cambio e rimborso', t.policy ?? ''],
    ['Nota', t.notes ?? ''],
  ]
  return (
    <div className="k-TicketOrizzontale">
      <div className={cx('tk tv th', !t.bought && 'todo', open && 'open')}>
        <div className="a v-top">
          <button type="button" className="hdl" aria-expanded={open} onClick={onToggle}>
            <span className="kd" aria-hidden="true">
              <MovementIcon event={{ kind: 'transport', mode: t.mode, title: '' }} size={22} />
            </span>
            <span className="ti">
              <b>{nomeTrasporto(t)}</b>
              <span>{sub}</span>
            </span>
            <span className={cx('pl3b', t.bought ? 'ok' : 'td')}>
              <Sv name={t.bought ? 'check' : 'clock'} size={16} />
              {t.bought ? 'Pagato' : 'Non pagato'}
            </span>
            <span className="chv" aria-hidden="true">
              <Sv name="chev" size={20} />
            </span>
          </button>
          <div className="hz">
            <div className="hs l">
              <span className="tm">{w.depart?.time || '—'}</span>
              <b>{t.from}</b>
              <a className="btn mp" href={maps(t, 'from')} target="_blank" rel="noreferrer" aria-label={`Apri ${t.from} su Maps`}>
                <Sv name="pin" size={20} />
                Maps
              </a>
            </div>
            <div className="hm">
              <span className="hd2">{dur}</span>
              <span aria-hidden="true" className="hl" />
            </div>
            <div className="hs r">
              <span className="tm">{w.arrive?.time || '—'}</span>
              <b>{t.to}</b>
              <a className="btn mp" href={maps(t, 'to')} target="_blank" rel="noreferrer" aria-label={`Apri ${t.to} su Maps`}>
                <Sv name="pin" size={20} />
                Maps
              </a>
            </div>
          </div>
        </div>
        {open ? (
          <div className="b">
            <div className="pr">
              <div>
                <div className="pv" style={manca ? { color: 'var(--ink-muted)' } : undefined}>
                  {manca ? 'Prezzo non inserito' : formatMoney(prezzo.totale as number, cur)}
                </div>
                <div className="pn">
                  <span aria-hidden="true" className="avs">
                    {people.slice(0, 4).map((p) => (
                      <span key={p.id} style={{ background: `var(--disco-${COL[(discOf(trip, p.id) - 1) % 5]})` }}>
                        {initials(p.name)}
                      </span>
                    ))}
                  </span>
                  <span>
                    {people.length === 1 ? '1 persona' : `${people.length} persone`}
                    {!manca && prezzo.persone > 1 && prezzo.aTesta !== null ? ` · ${formatMoney(prezzo.aTesta, cur)} a testa` : ''}
                  </span>
                </div>
              </div>
            </div>
            <dl className="dl">
              {rows
                .filter(([k, v]) => v || k === 'Prezzo')
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            <div className="acts2">
              {manca ? (
                <Pulsante size="sm" iconLeading="plus" onPress={() => onEdit('prezzo')}>
                  Aggiungi prezzo
                </Pulsante>
              ) : null}
              <Pulsante size="sm" color="secondary" iconLeading="qr" onPress={onCode}>
                Mostra il codice
              </Pulsante>
              <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={() => onEdit()}>
                Modifica
              </Pulsante>
              <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={onDelete}>
                Elimina
              </Pulsante>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
