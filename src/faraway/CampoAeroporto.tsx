// Aeroporto di una tratta: campo in cui si scrive (codice, città o nome) e si sceglie dall'elenco completo degli
// aeroporti con voli di linea. Il valore resta il codice IATA; un codice di tre lettere non in elenco si può lasciare.
import { useMemo } from 'react'
import { cittaDi, useAeroporti, type Aeroporto } from '../lib/aeroportiElenco'
import { airportCity } from '../lib/airports'
import type { VoceCerca } from '../lib/cerca'
import { regionName } from '../lib/countries'
import { CampoCerca } from './CampoCerca'
import { t } from '../i18n'

interface VoceAeroporto extends VoceCerca {
  fuso: string
}

export function CampoAeroporto({ label, value, onChange, error }: { label: string; value: string; onChange: (codice: string, fuso?: string) => void; error?: string }) {
  const elenco = useAeroporti()
  const voci = useMemo<VoceAeroporto[]>(
    () =>
      (elenco ?? []).map((a: Aeroporto) => {
        const citta = cittaDi(a)
        const paese = regionName(a.paese)
        return { id: a.codice, codice: a.codice, label: a.nome, detail: [citta, paese].filter(Boolean).join(', '), altro: `${a.citta} ${a.chiavi}`, fuso: a.fuso }
      }),
    [elenco],
  )
  return (
    <CampoCerca<VoceAeroporto>
      label={label}
      value={value}
      onChange={(codice, v) => onChange(codice, v?.fuso)}
      voci={voci}
      testoDi={(codice) => (codice ? `${codice} · ${airportCity(codice)}` : '')}
      placeholder={t('Codice o città')}
      icon="plane"
      error={error}
      caricamento={!elenco}
      libero={(s) => (/^[A-Za-z]{3}$/.test(s) ? s.toUpperCase() : null)}
      segno={(v) => <b className="cod">{v.codice}</b>}
    />
  )
}
