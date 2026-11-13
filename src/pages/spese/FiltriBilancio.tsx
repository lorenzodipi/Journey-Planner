// Filtri e ordinamenti di «Il mio bilancio»: un solo foglio con tutto, e sopra le voci un riassunto di cosa è attivo.
import { useMemo, useState } from 'react'
import { Campo, Chip, Pulsante, Segmenti } from '../../faraway/base'
import { CampoScelta } from '../../faraway/CampoScelta'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import type { DebitoSpesa } from '../../lib/debitiSpese'
import { filtriAttivi, FILTRI_VUOTI, ORDINE_BASE, type FiltriBilancio, type Ordine, type OrdinePer, type StatoFiltro } from '../../lib/filtriBilancio'
import { categoriaDi } from '../../lib/ricevuta'

const PER: { value: OrdinePer; label: string }[] = [
  { value: 'predefinito', label: 'Prima da fare, poi le più recenti' },
  { value: 'data', label: 'Data' },
  { value: 'importo', label: 'Importo' },
  { value: 'categoria', label: 'Categoria' },
  { value: 'persona', label: 'Persona' },
]
const STATI: { value: StatoFiltro; label: string }[] = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'aperti', label: 'Da pagare o da ricevere' },
  { value: 'attesa', label: 'In attesa di conferma' },
  { value: 'pagati', label: 'Pagati' },
]
/** I due versi di ogni ordinamento: il primo è il naturale. */
const VERSI: Record<Exclude<OrdinePer, 'predefinito'>, [string, string]> = {
  data: ['Più recenti prima', 'Più vecchie prima'],
  importo: ['Più alti prima', 'Più bassi prima'],
  categoria: ['Dalla A alla Z', 'Dalla Z alla A'],
  persona: ['Dalla A alla Z', 'Dalla Z alla A'],
}

export function riassuntoOrdine(o: Ordine) {
  return o.per === 'predefinito' ? '' : `${PER.find((x) => x.value === o.per)?.label}: ${VERSI[o.per][o.inverso ? 1 : 0].toLowerCase()}`
}

export function FiltriBilancio({ righe, nome, cur, filtri, onFiltri, ordine, onOrdine, mostrate }: {
  /** tutte le voci, prima dei filtri: servono a sapere quali persone e categorie ci sono */
  righe: readonly DebitoSpesa[]
  nome: (id: string) => string
  cur: string
  filtri: FiltriBilancio
  onFiltri: (f: FiltriBilancio) => void
  ordine: Ordine
  onOrdine: (o: Ordine) => void
  mostrate: number
}) {
  const [aperto, setAperto] = useState(false)
  const persone = useMemo(() => [...new Set(righe.map((d) => d.otherId))].sort((a, b) => nome(a).localeCompare(nome(b), 'it')), [righe, nome])
  const categorie = useMemo(() => [...new Map(righe.map((d) => [categoriaDi(d.expense).toLowerCase(), categoriaDi(d.expense)])).values()].sort((a, b) => a.localeCompare(b, 'it')), [righe])
  const n = filtriAttivi(filtri)
  const attivo = n > 0 || ordine.per !== 'predefinito'
  const set = <K extends keyof FiltriBilancio>(k: K, v: FiltriBilancio[K]) => onFiltri({ ...filtri, [k]: v })
  const azzera = () => (onFiltri(FILTRI_VUOTI), onOrdine(ORDINE_BASE))
  if (righe.length < 2) return null
  return (
    <>
      <div className="fa-chips scroll" role="group" aria-label="Filtri e ordine">
        <Chip on={attivo} icon={<Sv name="filter" size={18} />} onPress={() => setAperto(true)} label={attivo ? `Filtri e ordine: ${n} filtri attivi. Cambia` : 'Filtri e ordine'}>
          {n > 0 ? `Filtri · ${n}` : 'Filtri e ordine'}
        </Chip>
        {ordine.per !== 'predefinito' ? (
          <Chip on onPress={() => setAperto(true)} label={`Ordine: ${riassuntoOrdine(ordine)}. Cambia`}>
            {riassuntoOrdine(ordine)}
          </Chip>
        ) : null}
        {attivo ? <Chip onPress={azzera} label="Azzera filtri e ordine">Azzera</Chip> : null}
      </div>
      {aperto ? (
        <Foglio
          open
          title="Filtri e ordine"
          onClose={() => setAperto(false)}
          headStart={
            attivo ? (
              <button type="button" className="fa-hdtxt" onClick={azzera}>
                Azzera
              </button>
            ) : (
              <span />
            )
          }
          footer={<Pulsante onPress={() => setAperto(false)}>{mostrate === 1 ? 'Mostra 1 voce' : `Mostra ${mostrate} voci`}</Pulsante>}
        >
          <div className="frm">
            <CampoScelta label="Ordina per" value={ordine.per} onChange={(v) => onOrdine({ per: v as OrdinePer, inverso: false })} options={PER} />
            {ordine.per !== 'predefinito' ? (
              <Segmenti
                label="Verso dell'ordine"
                value={ordine.inverso ? 'inverso' : 'naturale'}
                options={[
                  { value: 'naturale', label: VERSI[ordine.per][0] },
                  { value: 'inverso', label: VERSI[ordine.per][1] },
                ]}
                onChange={(v) => onOrdine({ ...ordine, inverso: v === 'inverso' })}
              />
            ) : null}
            {persone.length > 1 ? <CampoScelta label="Persona" value={filtri.persona} onChange={(v) => set('persona', v)} options={[{ value: '', label: 'Tutte' }, ...persone.map((id) => ({ value: id, label: nome(id) }))]} /> : null}
            {categorie.length > 1 ? <CampoScelta label="Categoria" value={filtri.categoria} onChange={(v) => set('categoria', v)} options={[{ value: '', label: 'Tutte' }, ...categorie.map((c) => ({ value: c, label: c }))]} /> : null}
            <CampoScelta label="Stato" value={filtri.stato} onChange={(v) => set('stato', v as StatoFiltro)} options={STATI} />
            <div className="fa-due">
              <Campo label="Dal" type="date" value={filtri.dal} onChange={(v) => set('dal', v)} max={filtri.al || undefined} />
              <Campo label="Al" type="date" value={filtri.al} onChange={(v) => set('al', v)} min={filtri.dal || undefined} />
            </div>
            <div className="fa-due">
              <Campo label="Importo da" inputMode="decimal" placeholder="0,00" value={filtri.min} onChange={(v) => set('min', v)} trailing={<span>{cur}</span>} />
              <Campo label="Importo fino a" inputMode="decimal" placeholder="0,00" value={filtri.max} onChange={(v) => set('max', v)} trailing={<span>{cur}</span>} />
            </div>
          </div>
        </Foglio>
      ) : null}
    </>
  )
}
