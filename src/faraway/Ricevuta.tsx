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
import { Sv } from './icons'
import { G } from './Tappe'

const COL = ['corallo', 'glicine', 'cielo', 'menta', 'rosa']
const segno = (n: number, cur: string) => `${n > 0.004 ? '+' : n < -0.004 ? '−' : ''}${formatMoney(Math.abs(n), cur)}`

interface Props {
  trip: Trip
  dati: Dati
  sub: string
  aggiornato: string | null
  onPlanned: (c: RigaCategoria, planned: number | null) => Promise<string | null>
  onRename: (c: RigaCategoria, label: string) => Promise<string | null>
  onDelete: (c: RigaCategoria) => Promise<void>
  /** Id del viaggiatore collegato all'account e azione «Ho pagato» sui miei debiti (#51). */
  me?: string
  onHoPagato?: (x: { from: string; to: string; amount: number }) => void
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
          <div className="sub">{c.sub}</div>
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
            <Pulsante size="sm" onPress={() => void save()} isLoading={busy}>
              Salva
            </Pulsante>
            {c.personale && c.id ? (
              <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={() => void onDelete(c)}>
                Elimina categoria
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

export function Ricevuta({ trip, dati, sub, aggiornato, onPlanned, onRename, onDelete, me, onHoPagato }: Props) {
  const cur = trip.baseCurrency
  const [open, setOpen] = useState<string | null>(null)
  const gruppo = trip.travelers.length > 1
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
                    <div>
                      <b>{t?.name.split(/\s+/)[0]}</b>
                      <span className="sub">
                        ha pagato {formatMoney(p.paid, cur)} · quota {formatMoney(p.quota, cur)}
                      </span>
                    </div>
                    <div className="sd">
                      <span className="v">{segno(p.net, cur)}</span>
                      <span className="w">
                        <G name={tone === 'pos' ? 'g-plus' : tone === 'neg' ? 'g-minus' : 'g-check'} />
                        {tone === 'pos' ? 'Da ricevere' : tone === 'neg' ? 'Da dare' : 'In pari'}
                      </span>
                    </div>
                  </div>
                )
              })}
              {dati.transfers.length === 0 ? (
                <div className="ok">
                  <Sv name="check" size={18} />
                  Tutto in pari: nessuno deve niente
                </div>
              ) : null}
            </div>
          ) : null}
          {gruppo && dati.transfers.length > 0 ? (
            <div className="pr">
              <div className="sc">Per pareggiare</div>
              {dati.transfers.map((x, i) => (
                <div key={i} className="t">
                  {nome(x.from)} dà {formatMoney(x.amount, cur)} a <b>{nome(x.to)}</b>
                  {onHoPagato && me && x.from === me ? (
                    <button type="button" className="fa-btn sm out" style={{ marginLeft: 8 }} onClick={() => onHoPagato(x)}>
                      Ho pagato
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {dati.unconverted.length > 0 ? <div className="ft">Senza cambio, non contate nei totali: {dati.unconverted.join(', ')}</div> : null}
          {aggiornato ? <div className="ft">{aggiornato}</div> : null}
        </div>
        <div className="rz" />
      </div>
    </div>
  )
}
