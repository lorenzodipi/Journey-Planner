// Parti avanzate del foglio spesa (#50): più paganti, divisione per percentuali o importi fissi, cambio con fonte e ricevute.
import { useRef, useState } from 'react'
import { cx } from '../../faraway/cx'
import { Campo, Chip, Pulsante, PulsanteIcona, Segmenti } from '../../faraway/base'
import { Sv } from '../../faraway/icons'
import { checkFile, openBookingFile, safeFileName, uploadBookingFile } from '../../lib/bookingFiles'
import { parseAmount } from '../../lib/money'
import { checkPayers, checkSplit, fxTrace, SPLIT_LABEL, splitAmounts } from '../../lib/ripartizione'
import { showToast } from '../../state/toast'
import { discOf, initials } from '../../state/me'
import type { ExpenseFile, ExpensePayer, ExpenseShare, SplitMode, Trip } from '../../types'

const first = (name: string) => name.split(/\s+/)[0]
const txt = (n: number) => String(n).replace('.', ',')
const fmtRate = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: n >= 10 ? 2 : 4 })

function Help({ check }: { check: { ok: boolean; message: string } }) {
  if (check.ok || !check.message) return null
  return (
    <span className="fa-help bad" role="alert">
      <Sv name="err" size={16} />
      {check.message}
    </span>
  )
}

export interface PayRow {
  id: string
  text: string
}

/** Righe → versamenti (le righe senza persona o senza cifra si ignorano nel controllo, ma `rowsOk` le segnala). */
export function payersFromRows(rows: PayRow[]): ExpensePayer[] {
  return rows.filter((r) => r.id).map((r) => ({ travelerId: r.id, amount: parseAmount(r.text) ?? 0 }))
}

/** «Pagata da»: una persona, oppure più paganti con la cifra di ciascuno (la somma deve fare l'importo). */
export function PagantiEditor({ trip, total, currency, rows, onRows, single, onSingle, error }: {
  trip: Trip
  total: number | null
  currency: string
  rows: PayRow[] | null
  onRows: (r: PayRow[] | null) => void
  single: string
  onSingle: (id: string) => void
  error?: string
}) {
  const ppl = trip.travelers
  const disc = (id: string) => (
    <span className={cx('fa-av', `r${discOf(trip, id)}`)} style={{ width: 24, height: 24, fontSize: 11 }} aria-hidden="true">
      {initials(ppl.find((p) => p.id === id)?.name ?? '')}
    </span>
  )
  if (!rows) {
    return (
      <div className="fa-fld" role="group" aria-label="Pagata da">
        Pagata da
        <div className="fa-chips wrap">
          {ppl.map((p) => (
            <Chip key={p.id} on={single === p.id} onPress={() => onSingle(p.id)} icon={disc(p.id)}>
              {first(p.name)}
            </Chip>
          ))}
        </div>
        {ppl.length > 1 ? (
          <div>
            <Pulsante color="link-color" size="sm" iconLeading="plus" onPress={() => onRows([{ id: single, text: total ? txt(total) : '' }, { id: '', text: '' }])}>
              Aggiungi un altro pagante
            </Pulsante>
          </div>
        ) : null}
        {error ? <span className="fa-help bad" role="alert"><Sv name="err" size={16} />{error}</span> : null}
      </div>
    )
  }
  const set = (i: number, patch: Partial<PayRow>) => onRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const used = new Set(rows.map((r) => r.id))
  const check = total !== null ? checkPayers(total, payersFromRows(rows), currency) : { ok: true, message: '' }
  return (
    <div className="fa-fld" role="group" aria-label="Chi ha pagato">
      Chi ha pagato
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gap: 8 }}>
          <div className="fa-chips wrap">
            {ppl.filter((p) => p.id === r.id || !used.has(p.id)).map((p) => (
              <Chip key={p.id} on={r.id === p.id} onPress={() => set(i, { id: p.id })} icon={disc(p.id)}>
                {first(p.name)}
              </Chip>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Campo label={`Versa${r.id ? ` · ${first(ppl.find((p) => p.id === r.id)?.name ?? '')}` : ''}`} inputMode="decimal" value={r.text} onChange={(v) => set(i, { text: v })} placeholder="0" trailing={<span>{currency}</span>} />
            </div>
            {rows.length > 1 ? (
              <PulsanteIcona icon="close" label="Togli questo pagante" onPress={() => {
                if (rows.length === 2) {
                  onSingle(rows[1 - i].id || single)
                  onRows(null)
                } else onRows(rows.filter((_, k) => k !== i))
              }} />
            ) : null}
          </div>
        </div>
      ))}
      {used.size < ppl.length && !rows.some((r) => !r.id) ? (
        <div>
          <Pulsante color="link-color" size="sm" iconLeading="plus" onPress={() => onRows([...rows, { id: '', text: '' }])}>
            Aggiungi un altro pagante
          </Pulsante>
        </div>
      ) : null}
      {rows.some((r) => !r.id) ? <span className="fa-help bad" role="alert"><Sv name="err" size={16} />Scegli chi è il pagante che hai aggiunto, oppure toglilo.</span> : <Help check={check} />}
      {check.ok && total !== null && !error && rows.every((r) => r.id) ? <span className="fa-help ok">I versamenti fanno {txt(total)} {currency}</span> : null}
      {error ? <span className="fa-help bad" role="alert"><Sv name="err" size={16} />{error}</span> : null}
    </div>
  )
}

/** Valori iniziali per le quote: parti uguali dei 100 punti o del totale. */
export function defaultVals(mode: SplitMode, who: string[], total: number | null): Record<string, string> {
  if (mode === 'equal' || who.length === 0) return {}
  const parts = splitAmounts(mode === 'percent' ? 100 : (total ?? 0), 'equal', who.map((travelerId) => ({ travelerId, weight: 1 })))
  return Object.fromEntries(who.map((id, i) => [id, txt(parts[i])]))
}

export function sharesFrom(mode: SplitMode, who: string[], vals: Record<string, string>): ExpenseShare[] {
  return who.map((travelerId) => {
    const n = parseAmount(vals[travelerId] ?? '') ?? 0
    return { travelerId, weight: 1, ...(mode === 'percent' ? { percent: n } : mode === 'fixed' ? { amount: n } : {}) }
  })
}

/** «Come dividere»: parti uguali, percentuali (somma 100) o importi fissi (somma = importo), con il controllo sotto. */
export function DivisioneEditor({ trip, mode, onMode, who, onWho, vals, onVals, total, currency, hint }: {
  trip: Trip
  mode: SplitMode
  onMode: (m: SplitMode) => void
  who: string[]
  onWho: (ids: string[]) => void
  vals: Record<string, string>
  onVals: (v: Record<string, string>) => void
  total: number | null
  currency: string
  hint?: string
}) {
  const check = who.length === 0 ? { ok: false, message: 'Scegli almeno una persona.', missing: 0 } : checkSplit(mode, total ?? 0, sharesFrom(mode, who, vals), currency)
  const toggle = (id: string) => {
    const next = who.includes(id) ? who.filter((x) => x !== id) : trip.travelers.map((p) => p.id).filter((x) => x === id || who.includes(x))
    onWho(next)
    if (mode !== 'equal') onVals(defaultVals(mode, next, total))
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="fa-fld">
        Come dividere
        <Segmenti<SplitMode> label="Come dividere" value={mode} onChange={(m) => (onMode(m), onVals(defaultVals(m, who, total)))} options={(['equal', 'percent', 'fixed'] as SplitMode[]).map((m) => ({ value: m, label: SPLIT_LABEL[m] }))} />
      </div>
      <div className="fa-chips wrap" role="group" aria-label="Per chi">
        {trip.travelers.map((p) => (
          <Chip key={p.id} on={who.includes(p.id)} onPress={() => toggle(p.id)}>
            {first(p.name)}
          </Chip>
        ))}
      </div>
      {mode !== 'equal'
        ? who.map((id) => (
            <Campo key={id} label={first(trip.travelers.find((p) => p.id === id)?.name ?? '')} inputMode="decimal" value={vals[id] ?? ''} onChange={(v) => onVals({ ...vals, [id]: v })} placeholder="0" trailing={<span>{mode === 'percent' ? '%' : currency}</span>} />
          ))
        : null}
      <Help check={check} />
      {check.ok && hint ? <span className="fa-help ok">{hint}</span> : null}
    </div>
  )
}

/** Riga del cambio: «1 € = 163,2 ¥ · BCE · 30 ott 09:10», con «Aggiorna» e «Modifica» (si può scrivere a mano; resta la traccia). */
export function CambioRiga({ base, other, rate, source, at, manual, setBy, busy, onRefresh, onManual }: {
  base: string
  other: string
  rate: number | undefined
  source?: string
  at?: string
  manual?: boolean
  setBy?: string
  busy?: boolean
  onRefresh: () => void
  onManual: (rate: number) => void
}) {
  const [edit, setEdit] = useState(false)
  const [text, setText] = useState('')
  if (!rate) return null
  const per = 1 / rate
  const trace = fxTrace({ fxRate: rate, fxSource: source, fxAt: at, fxManual: manual }, setBy)
  if (edit) {
    const n = parseAmount(text)
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <Campo label={`Quante ${other} per 1 ${base}`} inputMode="decimal" value={text} onChange={setText} placeholder="0" autoFocus error={text && !(n && n > 0) ? 'Scrivi un numero maggiore di zero.' : undefined} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Pulsante size="sm" isDisabled={!(n && n > 0)} onPress={() => (onManual(Math.round((1 / (n as number)) * 1e6) / 1e6), setEdit(false))}>
            Usa questo cambio
          </Pulsante>
          <Pulsante size="sm" color="tertiary" onPress={() => setEdit(false)}>
            Annulla
          </Pulsante>
        </div>
      </div>
    )
  }
  return (
    <div className="fa-help" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <span>
        Cambio {fmtRate(per)} {other} per 1 {base}
        {trace ? ` · ${trace}` : ''}
      </span>
      <Pulsante size="sm" color="link-color" isLoading={busy} onPress={onRefresh}>
        Aggiorna
      </Pulsante>
      <Pulsante size="sm" color="link-color" onPress={() => (setText(fmtRate(per)), setEdit(true))}>
        Modifica
      </Pulsante>
    </div>
  )
}

/** Ricevute (facoltative): foto o PDF nel bucket privato. Servono la rete per aggiungerle o toglierle. */
export function RicevuteEditor({ trip, expenseId, files, added, onAdded, onRemove }: {
  trip: Trip
  expenseId: string
  files: ExpenseFile[]
  added: ExpenseFile[]
  onAdded: (f: ExpenseFile[]) => void
  onRemove: (f: ExpenseFile) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const online = navigator.onLine
  async function pick(list: FileList | null) {
    const file = list?.[0]
    if (!file) return
    const bad = checkFile(file)
    if (bad) return showToast(bad)
    setBusy(true)
    try {
      const path = await uploadBookingFile(trip.id, file, `spese/${expenseId}`)
      onAdded([...added, { id: crypto.randomUUID(), path, name: safeFileName(file.name), mimeType: file.type }])
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Non sono riuscito a caricare la ricevuta.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  const all = [...files, ...added]
  return (
    <div className="fa-fld">
      Ricevuta · facoltativa
      {all.map((f) => (
        <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Pulsante color="link-color" size="sm" iconLeading="file" onPress={() => void openBookingFile(f.path).catch((e: Error) => showToast(e.message))}>
            {f.name || 'Ricevuta'}
          </Pulsante>
          <PulsanteIcona icon="trash" label={`Togli ${f.name || 'la ricevuta'}`} onPress={() => onRemove(f)} />
        </div>
      ))}
      <input ref={input} type="file" accept="image/*,application/pdf" hidden onChange={(e) => void pick(e.currentTarget.files)} />
      <div>
        <Pulsante color="secondary" size="sm" iconLeading="camera" isLoading={busy} isDisabled={!online} onPress={() => input.current?.click()}>
          Aggiungi foto o PDF
        </Pulsante>
      </div>
      {!online ? <span className="fa-help">Sei offline: aggiungi la ricevuta quando c’è rete.</span> : null}
    </div>
  )
}
