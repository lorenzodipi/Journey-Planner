// Fuso orario scelto dall'elenco di tutti i fusi: si scrive la città o l'area (es. «roma», «tokyo», «utc+9») e si
// sceglie tra le voci che corrispondono (CampoCerca). A parità, prima quelli del viaggio e i più usati.
import { useMemo } from 'react'
import type { VoceCerca } from '../lib/cerca'
import { fusiRaggruppati } from '../lib/timezones'
import { CampoCerca } from './CampoCerca'
import { t } from '../i18n'

export function CampoFuso({ label, value, onChange, usati = [] }: { label: string; value: string; onChange: (zone: string) => void; usati?: string[] }) {
  const voci = useMemo<VoceCerca[]>(
    () => fusiRaggruppati(...usati, value).flatMap((g) => g.zone.map((z) => ({ id: z.value, label: z.label, altro: z.value.replace(/[/_]/g, ' ') }))),
    [usati.join('|'), value], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return <CampoCerca label={label} value={value} onChange={onChange} voci={voci} placeholder={t('Città o area')} icon="clock" />
}
