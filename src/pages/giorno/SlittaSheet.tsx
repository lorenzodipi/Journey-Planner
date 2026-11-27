// Foglio «Slitta» (mock «Tappa in ritardo»): di quanto spostare in avanti l'orario di una tappa di oggi (da adesso,
// +15 min, +30 min, +1 h), se spostare anche le tappe dopo (quelle vincolate o prenotate restano), anteprima degli
// orari e, dopo, un avviso con «Annulla» che rimette gli orari di prima.
import { useState } from 'react'
import { Interruttore, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Riquadri } from '../../faraway/Moduli'
import { Sv } from '../../faraway/icons'
import { ora } from '../../lib/formati'
import { annullaSlitta, orariSlitta, pianoSlitta, scelteSlitta } from '../../lib/slitta'
import { durata, hhmm, toMin } from '../../lib/tappa'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Day, DayItem, Trip } from '../../types'
import { t } from '../../i18n'

export function SlittaSheet({ trip, day, item, nowMin, open, onClose }: { trip: Trip; day: Day; item: DayItem; nowMin: number; open: boolean; onClose: () => void }) {
  const tr = useTrips()
  const scelte = scelteSlitta(item, nowMin)
  // di base +30 min (come nel mock), se non c'è la prima scelta possibile
  const [minuti, setMinuti] = useState<number>(() => scelte.find((s) => s.da === 'piu' && s.minuti === 30)?.minuti ?? scelte[0]?.minuti ?? 0)
  const [ancheDopo, setAncheDopo] = useState(true)
  const [busy, setBusy] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const piano = pianoSlitta(trip, day.items, item, minuti, ancheDopo)
  const dopo = piano.cambi.length - 1 + piano.ferme.length
  const inizio = toMin(item.time) ?? 0
  const quanto = durata(minuti)

  async function slitta() {
    if (piano.cambi.length === 0) return
    setBusy(true)
    const m = await tr.setItemTimes(orariSlitta(piano))
    setBusy(false)
    if (m) return setErrore(m)
    onClose()
    const prima = annullaSlitta(piano)
    showToast(
      piano.cambi.length === 1 ? t('«{title}» spostata di {v0}', { title: item.title, v0: quanto }) : t('{n} tappe spostate di {v0}', { n: piano.cambi.length, v0: quanto }),
      { label: t('Annulla'), run: () => void tr.setItemTimes(prima).then((e) => (e ? showToast(e) : undefined)) },
      8000,
    )
  }

  return (
    <Foglio
      open={open}
      title={t('Slitta «{title}»', { title: item.title })}
      onClose={onClose}
      footer={
        <Pulsante iconLeading="slitta" onPress={() => void slitta()} isLoading={busy} isDisabled={piano.cambi.length === 0}>
          {t('Slitta di {v0}', { v0: quanto })}
        </Pulsante>
      }
    >
      <div style={{ display: 'grid', gap: 24 }}>
        <p className="fa-m" style={{ margin: 0, color: 'var(--ink-muted)' }}>
          {t('Iniziava alle {v0}, adesso sono le {v1}.', { v0: ora(item.time as string), v1: ora(hhmm(nowMin)) })}
        </p>
        <Riquadri<string>
          label={t('Di quanto')}
          cols={2}
          value={String(minuti)}
          onChange={(v) => v && setMinuti(Number(v))}
          options={scelte.map((s) => ({
            value: String(s.minuti),
            label: s.da === 'adesso' ? t('Da adesso') : `+${durata(s.minuti)}`,
            sub: s.da === 'adesso' ? t('inizia alle {v0}', { v0: ora(hhmm(inizio + s.minuti)) }) : t('alle {v0}', { v0: ora(hhmm(inizio + s.minuti)) }),
          }))}
        />
        {dopo > 0 || ancheDopo ? (
          <Interruttore
            label={t('Anche le tappe dopo')}
            hint={t('Si spostano di {v0}. Le tappe con l’orario vincolato o prenotato restano dove sono.', { v0: quanto })}
            isSelected={ancheDopo}
            onChange={setAncheDopo}
          />
        ) : null}
        <ul className="k-Slitta" aria-label={t('Nuovi orari')}>
          {piano.cambi.map((c) => (
            <li key={c.id}>
              <span className="tl">{c.title}</span>
              <span className="or">
                <s>{ora(c.prima)}</s>
                <Sv name="chevr" size={16} />
                <b>{ora(c.dopo)}</b>
              </span>
            </li>
          ))}
          {piano.ferme.map((f) => (
            <li key={f.id}>
              <span className="tl">
                {f.title}
                <span className="fm">
                  <Sv name="lock" size={14} />
                  {t('Resta all’orario')}
                </span>
              </span>
              <span className="or">
                <b>{ora(f.ora)}</b>
              </span>
            </li>
          ))}
        </ul>
        {errore ? (
          <span className="fa-help bad" role="alert">
            <Sv name="err" size={16} />
            {errore}
          </span>
        ) : null}
      </div>
    </Foglio>
  )
}
