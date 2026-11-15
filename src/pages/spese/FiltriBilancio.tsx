// Filtri e ordinamenti di «Il mio bilancio»: un solo foglio con tutto, e sopra le voci un riassunto di cosa è attivo.
import { useMemo, useState } from 'react'
import { Campo, Chip, Pulsante, Segmenti } from '../../faraway/base'
import { CampoScelta } from '../../faraway/CampoScelta'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { cx } from '../../faraway/cx'
import type { DebitoSpesa } from '../../lib/debitiSpese'
import { filtriAttivi, FILTRI_VUOTI, ORDINE_BASE, type FiltriBilancio, type Ordine, type OrdinePer, type StatoFiltro } from '../../lib/filtriBilancio'
import { categoriaDi } from '../../lib/ricevuta'
import { LINGUA, nomeCategoria, t } from '../../i18n'

const PER: { value: OrdinePer; label: string }[] = [
  { value: 'predefinito', label: t('Prima da fare, poi le più recenti') },
  { value: 'data', label: t('Data') },
  { value: 'importo', label: t('Importo') },
  { value: 'categoria', label: t('Categoria') },
  { value: 'persona', label: t('Persona') },
]
const STATI: { value: StatoFiltro; label: string }[] = [
  { value: 'tutti', label: t('Tutti') },
  { value: 'aperti', label: t('Da pagare o da ricevere') },
  { value: 'attesa', label: t('In attesa di conferma') },
  { value: 'pagati', label: t('Pagati') },
]
/** I due versi di ogni ordinamento: il primo è il naturale. */
const VERSI: Record<Exclude<OrdinePer, 'predefinito'>, [string, string]> = {
  data: [t('Più recenti prima'), t('Più vecchie prima')],
  importo: [t('Più alti prima'), t('Più bassi prima')],
  categoria: [t('Dalla A alla Z'), t('Dalla Z alla A')],
  persona: [t('Dalla A alla Z'), t('Dalla Z alla A')],
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
  const persone = useMemo(() => [...new Set(righe.map((d) => d.otherId))].sort((a, b) => nome(a).localeCompare(nome(b), LINGUA)), [righe, nome])
  const categorie = useMemo(() => [...new Map(righe.map((d) => [categoriaDi(d.expense).toLowerCase(), categoriaDi(d.expense)])).values()].sort((a, b) => a.localeCompare(b, LINGUA)), [righe])
  const n = filtriAttivi(filtri)
  const rapidi = useMemo(() => {
    const c = (f: (d: DebitoSpesa) => boolean) => righe.some(f)
    return [
      { value: 'tutti' as const, label: t('Tutte') },
      ...(c((d) => d.stato === 'da_pagare' || d.stato === 'contestato') ? [{ value: 'aperti' as const, label: t('Da saldare') }] : []),
      ...(c((d) => d.stato === 'in_attesa') ? [{ value: 'attesa' as const, label: t('In attesa') }] : []),
      ...(c((d) => d.stato === 'pagato') ? [{ value: 'pagati' as const, label: t('Saldate') }] : []),
    ]
  }, [righe])
  const attivo = n > 0 || ordine.per !== 'predefinito'
  const set = <K extends keyof FiltriBilancio>(k: K, v: FiltriBilancio[K]) => onFiltri({ ...filtri, [k]: v })
  const azzera = () => (onFiltri(FILTRI_VUOTI), onOrdine(ORDINE_BASE))
  if (righe.length < 2) return null
  return (
    <>
      {/* «Filtri» resta fermo, le scelte rapide accanto scorrono (come in Prenotazioni) */}
      <div className="fa-frow">
        <button type="button" className={cx('fa-fbtn', attivo && 'on')} aria-label={attivo ? t('Apri filtri e ordine, {n} filtri attivi', { n }) : t('Apri filtri e ordine')} onClick={() => setAperto(true)}>
          <Sv name="filter" size={18} />
          {t('Filtri')}
          {n > 0 ? <b>{n}</b> : null}
        </button>
      <div className="fa-chips scroll" role="group" aria-label={t('Scelte rapide')}>
        {rapidi.map((x) => (
          <Chip key={x.value} on={filtri.stato === x.value} onPress={() => set('stato', x.value)}>
            {x.label}
          </Chip>
        ))}
        {persone.length > 1
          ? persone.map((id) => (
              <Chip key={id} on={filtri.persona === id} onPress={() => set('persona', filtri.persona === id ? '' : id)} label={filtri.persona === id ? t('Solo {v0}: tocca per vederle tutte', { v0: nome(id) }) : t('Solo {v0}', { v0: nome(id) })}>
                {nome(id)}
              </Chip>
            ))
          : null}
        {ordine.per !== 'predefinito' ? (
          <Chip on onPress={() => setAperto(true)} label={t('Ordine: {v0}. Cambia', { v0: riassuntoOrdine(ordine) })}>
            {riassuntoOrdine(ordine)}
          </Chip>
        ) : null}
        {attivo ? <Chip onPress={azzera} label={t('Azzera filtri e ordine')}>{t('Azzera')}</Chip> : null}
      </div>
      </div>
      {aperto ? (
        <Foglio
          open
          title={t('Filtri e ordine')}
          onClose={() => setAperto(false)}
          headStart={
            attivo ? (
              <button type="button" className="fa-hdtxt" onClick={azzera}>
                {t('Azzera')}
              </button>
            ) : (
              <span />
            )
          }
          footer={<Pulsante onPress={() => setAperto(false)}>{mostrate === 1 ? 'Mostra 1 voce' : t('Mostra {mostrate} voci', { mostrate })}</Pulsante>}
        >
          <div className="frm">
            <CampoScelta label={t('Ordina per')} value={ordine.per} onChange={(v) => onOrdine({ per: v as OrdinePer, inverso: false })} options={PER} />
            {ordine.per !== 'predefinito' ? (
              <Segmenti
                label={t('Verso dell\'ordine')}
                value={ordine.inverso ? 'inverso' : 'naturale'}
                options={[
                  { value: 'naturale', label: VERSI[ordine.per][0] },
                  { value: 'inverso', label: VERSI[ordine.per][1] },
                ]}
                onChange={(v) => onOrdine({ ...ordine, inverso: v === 'inverso' })}
              />
            ) : null}
            {persone.length > 1 ? <CampoScelta label={t('Persona')} value={filtri.persona} onChange={(v) => set('persona', v)} options={[{ value: '', label: t('Tutte') }, ...persone.map((id) => ({ value: id, label: nome(id) }))]} /> : null}
            {categorie.length > 1 ? <CampoScelta label={t('Categoria')} value={filtri.categoria} onChange={(v) => set('categoria', v)} options={[{ value: '', label: t('Tutte') }, ...categorie.map((c) => ({ value: c, label: nomeCategoria(c) }))]} /> : null}
            <CampoScelta label={t('Stato')} value={filtri.stato} onChange={(v) => set('stato', v as StatoFiltro)} options={STATI} />
            <div className="fa-due">
              <Campo label={t('Dal')} type="date" value={filtri.dal} onChange={(v) => set('dal', v)} max={filtri.al || undefined} />
              <Campo label={t('Al')} type="date" value={filtri.al} onChange={(v) => set('al', v)} min={filtri.dal || undefined} />
            </div>
            <div className="fa-due">
              <Campo label={t('Importo da')} inputMode="decimal" placeholder="0,00" value={filtri.min} onChange={(v) => set('min', v)} trailing={<span>{cur}</span>} />
              <Campo label={t('Importo fino a')} inputMode="decimal" placeholder="0,00" value={filtri.max} onChange={(v) => set('max', v)} trailing={<span>{cur}</span>} />
            </div>
          </div>
        </Foglio>
      ) : null}
    </>
  )
}
