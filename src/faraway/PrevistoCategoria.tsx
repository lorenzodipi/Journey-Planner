// Previsto di una categoria (pagina Budget): toccando una categoria si apre sotto il previsto (il mio e, se posso, quello
// di chi non ha l'account), il nome e «Elimina» per le categorie create a mano. Nella ricevuta di Spese le categorie non
// si modificano più: lì toccarle le toglie dai totali.
import { useState } from 'react'
import { formatMoney, parseAmount } from '../lib/money'
import type { PrevistoPersona, RigaCategoria } from '../lib/ricevuta'
import { Campo, Pulsante } from './base'
import { t as tt } from '../i18n'

export interface AzioniCategoria {
  /** `travelerId` = il previsto di quella persona (0056); senza, il previsto unico della categoria (prima della migrazione) */
  onPlanned: (c: RigaCategoria, planned: number | null, travelerId?: string) => Promise<string | null>
  onRename: (c: RigaCategoria, label: string) => Promise<string | null>
  onDelete: (c: RigaCategoria) => Promise<void>
}

export function EditorPrevisto({
  c: riga,
  cur,
  onClose,
  onPlanned,
  onRename,
  onDelete,
  nome,
  gruppo,
  scrive,
  soloMio = false,
}: {
  c: RigaCategoria
  cur: string
  onClose: () => void
  nome: (id: string) => string
  gruppo: boolean
  scrive: boolean
  /** «La mia parte»: solo il mio previsto, senza quello degli altri né nome ed eliminazione della categoria */
  soloMio?: boolean
} & AzioniCategoria) {
  // il previsto di chi non ha l'account solo se posso modificare il viaggio (e mai nella mia parte)
  const c = scrive && !soloMio ? riga : { ...riga, altri: [], personale: soloMio ? false : riga.personale }
  const testo = (v: number | undefined) => (v === undefined ? '' : String(v).replace('.', ','))
  // con il previsto a persona (0056) si scrive il mio e, se posso, quello di chi non ha l'account; prima, quello della categoria
  const persone = c.mio ? [c.mio, ...(c.altri ?? [])] : []
  const [planned, setPlanned] = useState(c.mio ? testo(c.mio.valore) : c.plannedSet ? testo(c.planned) : '')
  const [altri, setAltri] = useState<Record<string, string>>(() => Object.fromEntries((c.altri ?? []).map((p) => [p.travelerId, testo(p.valore)])))
  const [label, setLabel] = useState(c.label)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    const valori = persone.length ? persone.map((p, i) => ({ p, v: i === 0 ? planned : (altri[p.travelerId] ?? '') })) : [{ p: undefined, v: planned }]
    const letti = valori.map(({ p, v }) => ({ p, n: v.trim() ? parseAmount(v) : null, bad: !!v.trim() && (parseAmount(v) === null || (parseAmount(v) ?? 0) < 0) }))
    if (letti.some((x) => x.bad)) return setError(tt('Il previsto non è chiaro: scrivi un importo, per esempio 600.'))
    setBusy(true)
    let m: string | null = null
    if (c.personale && label.trim() && label.trim() !== c.label) m = await onRename(c, label.trim())
    for (const { p, n } of letti) {
      if (m) break
      const prima = p ? (p.valore ?? null) : c.plannedSet ? c.planned : null
      if (n !== prima) m = await onPlanned(c, n, p?.travelerId)
    }
    setBusy(false)
    setError(m)
    if (!m) onClose()
  }
  const suggerimento = (p: PrevistoPersona, mio: boolean) =>
    p.valore !== undefined
      ? undefined
      : p.stima > 0
        ? mio
          ? tt('Senza una cifra conta la tua quota, {v0}, calcolata dai costi inseriti.', { v0: formatMoney(p.stima, cur) })
          : tt('Senza una cifra conta la sua quota, {v0}, calcolata dai costi inseriti.', { v0: formatMoney(p.stima, cur) })
        : mio
          ? tt('Quanto pensi di spendere tu per questa categoria.')
          : tt('Quanto pensi che spenderà per questa categoria.')

  return (
    <div className="fa-rcat-ed">
      {c.personale ? <Campo label={tt('Nome della categoria')} value={label} onChange={setLabel} maxLength={40} /> : null}
      {c.mio ? (
        <>
          <Campo
            label={gruppo ? tt('Il tuo previsto') : tt('Previsto')}
            icon="bag"
            inputMode="decimal"
            value={planned}
            onChange={setPlanned}
            placeholder={tt('Per esempio {v0}', { v0: formatMoney(c.mio.stima || 100, cur) })}
            hint={suggerimento(c.mio, true)}
            error={error}
          />
          {(c.altri ?? []).map((p) => (
            <Campo
              key={p.travelerId}
              label={tt('Previsto di {nome}', { nome: nome(p.travelerId) })}
              icon="bag"
              inputMode="decimal"
              value={altri[p.travelerId] ?? ''}
              onChange={(v) => setAltri((a) => ({ ...a, [p.travelerId]: v }))}
              placeholder={tt('Per esempio {v0}', { v0: formatMoney(p.stima || 100, cur) })}
              hint={suggerimento(p, false)}
            />
          ))}
        </>
      ) : (
        <Campo
          label={tt('Previsto')}
          icon="bag"
          inputMode="decimal"
          value={planned}
          onChange={setPlanned}
          placeholder={tt('Per esempio {v0}', { v0: formatMoney(c.planned || 100, cur) })}
          hint={c.plannedSet ? undefined : c.planned > 0 ? tt('Senza una cifra conta {v0}, calcolato dai costi inseriti.', { v0: formatMoney(c.planned, cur) }) : tt('Quanto pensi di spendere per questa categoria.')}
          error={error}
        />
      )}
      <div className="acts">
        <Pulsante size="sm" iconLeading="save" onPress={() => void save()} isLoading={busy}>
          {tt('Salva')}
        </Pulsante>
        {c.personale && c.id ? (
          <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={() => void onDelete(c)}>
            {tt('Elimina')}
          </Pulsante>
        ) : (
          <Pulsante size="sm" color="secondary" onPress={onClose}>
            {tt('Annulla')}
          </Pulsante>
        )}
      </div>
    </div>
  )
}
