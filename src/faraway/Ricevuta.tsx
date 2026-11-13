// Ricevuta del riepilogo spese (componente Ricevuta, mock Fa-23…Fa-26): per categoria (toccando una riga si
// imposta il previsto), totali, saldo a persona e «Per pareggiare», con il bordo dentellato in fondo.
import { useState } from 'react'
import { formatMoney, parseAmount } from '../lib/money'
import type { Ricevuta as Dati, RigaCategoria } from '../lib/ricevuta'
import { discOf, initials } from '../state/me'
import type { Trip } from '../types'
import { Ic } from '../ui/Sprite'
import { Campo, Pulsante } from './base'
import { cx } from './cx'

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']
const segno = (n: number, cur: string) => `${n > 0.004 ? '+' : n < -0.004 ? '−' : ''}${formatMoney(Math.abs(n), cur)}`

interface Props {
  trip: Trip
  dati: Dati
  sub: string
  onPlanned: (c: RigaCategoria, planned: number | null) => Promise<string | null>
  onRename: (c: RigaCategoria, label: string) => Promise<string | null>
  onDelete: (c: RigaCategoria) => Promise<void>
  /** «Bilancia tutte le spese» accanto alle righe di «Per pareggiare» che mi riguardano: `con` = le persone per cui c'è qualcosa da chiudere */
  bilancia?: { me: string; con: ReadonlySet<string>; onPress: (otherId: string) => void }
  /** chi usa l'app: sotto «Già pagato» compare «La tua quota» (la sua parte delle spese, a prescindere da chi ha pagato) */
  io?: string
}

function RigaCat({ c, cur, open, onToggle, onPlanned, onRename, onDelete }: { c: RigaCategoria; cur: string; open: boolean; onToggle: () => void } & Pick<Props, 'onPlanned' | 'onRename' | 'onDelete'>) {
  const [planned, setPlanned] = useState(c.plannedSet ? String(c.planned).replace('.', ',') : '')
  const [label, setLabel] = useState(c.label)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    const n = planned.trim() ? parseAmount(planned) : null
    if (planned.trim() && (n === null || n < 0)) return setError('Il previsto non è chiaro: scrivi un importo, per esempio 600.')
    setBusy(true)
    let m: string | null = null
    if (c.personale && label.trim() && label.trim() !== c.label) m = await onRename(c, label.trim())
    if (!m && (n !== (c.plannedSet ? c.planned : null))) m = await onPlanned(c, n)
    setBusy(false)
    setError(m)
    if (!m) onToggle()
  }

  return (
    <div className={cx('fa-rcat', open && 'open')}>
      <button type="button" className="cat" aria-expanded={open} onClick={onToggle}>
        <Ic name={c.icon} size={32} />
        <div>
          <div className="ln">
            <span className="l">{c.label}</span>
            <span className="d" />
            <span className="v">{formatMoney(c.spent, cur)}</span>
          </div>
          {c.sub ? <div className="sub">{c.sub}</div> : null}
          {c.previstoTesto ? <div className="sub">{c.previstoTesto}</div> : null}
        </div>
      </button>
      {open ? (
        <div className="fa-rcat-ed">
          {c.personale ? <Campo label="Nome della categoria" value={label} onChange={setLabel} maxLength={40} /> : null}
          <Campo
            label="Previsto"
            icon="bag"
            inputMode="decimal"
            value={planned}
            onChange={setPlanned}
            placeholder={`Per esempio ${formatMoney(c.planned || 100, cur)}`}
            hint={c.plannedSet ? undefined : c.planned > 0 ? `Senza una cifra conta ${formatMoney(c.planned, cur)}, calcolato dai costi inseriti.` : 'Quanto pensi di spendere per questa categoria.'}
            error={error}
          />
          <div className="acts">
            <Pulsante size="sm" iconLeading="save" onPress={() => void save()} isLoading={busy}>
              Salva
            </Pulsante>
            {c.personale && c.id ? (
              <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={() => void onDelete(c)}>
                Elimina
              </Pulsante>
            ) : (
              <Pulsante size="sm" color="secondary" onPress={onToggle}>
                Annulla
              </Pulsante>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function Ricevuta({ trip, dati, sub, onPlanned, onRename, onDelete, bilancia, io }: Props) {
  const cur = trip.baseCurrency
  const [open, setOpen] = useState<string | null>(null)
  const gruppo = trip.travelers.length > 1
  const mio = gruppo && io ? dati.persone.find((p) => p.travelerId === io) : undefined
  const nome = (id: string) => trip.travelers.find((t) => t.id === id)?.name.split(/\s+/)[0] ?? '—'
  return (
    <div className="k-Ricevuta">
      <div className="rc" role="group" aria-label="Ricevuta del riepilogo spese">
        <div className="rb">
          <div className="rh">
            <span className="br">Faraway</span>
            <span className="t">Riepilogo spese</span>
            <span className="s">{sub}</span>
          </div>
          <div className="sc">Per categoria</div>
          <div className="cats">
            {dati.categorie.map((c) => (
              <RigaCat key={`${c.key}:${c.planned}:${c.label}`} c={c} cur={cur} open={open === c.key} onToggle={() => setOpen(open === c.key ? null : c.key)} onPlanned={onPlanned} onRename={onRename} onDelete={onDelete} />
            ))}
          </div>
          <div className="tot">
            <div className="ln m">
              <span className="l">Previsto</span>
              <span className="d" />
              <span className="v">{formatMoney(dati.previsto, cur)}</span>
            </div>
            <div className="ln m">
              <span className="l">Già pagato</span>
              <span className="d" />
              <span className="v">{formatMoney(dati.pagato, cur)}</span>
            </div>
            {mio ? (
              <div className="ln m">
                <span className="l">La tua quota</span>
                <span className="d" />
                <span className="v">{formatMoney(mio.quota, cur)}</span>
              </div>
            ) : null}
            <div className="ln b">
              <span className="l">Da pagare</span>
              <span className="d" />
              <span className="v">{formatMoney(dati.daPagare, cur)}</span>
            </div>
          </div>
          {gruppo ? (
            <div className="per">
              <div className="sc">Saldo a persona</div>
              {dati.persone.map((p) => {
                const t = trip.travelers.find((x) => x.id === p.travelerId)
                const tone = p.net > 0.004 ? 'pos' : p.net < -0.004 ? 'neg' : 'zero'
                return (
                  <div key={p.travelerId} className={cx('pp', tone)}>
                    <span aria-hidden="true" className="av" style={{ background: `var(--disco-${COL[(discOf(trip, p.travelerId) - 1) % 5]})` }}>
                      {initials(t?.name ?? '?')}
                    </span>
                    <b>{t?.name.split(/\s+/)[0]}</b>
                    <div className="sd">
                      <span className="v">{segno(p.net, cur)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
          {gruppo && dati.transfers.length > 0 ? (
            <div className="pr">
              <div className="sc">Per pareggiare</div>
              {dati.transfers.map((x, i) => {
                const altro = bilancia ? (x.from === bilancia.me ? x.to : x.to === bilancia.me ? x.from : null) : null
                return (
                  <div key={i} className="t">
                    <span>
                      {nome(x.from)} deve {formatMoney(x.amount, cur)} a <b>{nome(x.to)}</b>
                    </span>
                    {bilancia && altro && bilancia.con.has(altro) ? (
                      <button type="button" className="bil" aria-label={`Bilancia tutte le spese con ${nome(altro)}`} onClick={() => bilancia.onPress(altro)}>
                        Bilancia tutte le spese
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
          {dati.unconverted.length > 0 ? <div className="ft">Senza cambio, non contate nei totali: {dati.unconverted.join(', ')}</div> : null}
        </div>
        <div className="rz" />
      </div>
    </div>
  )
}
