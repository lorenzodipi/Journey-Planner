// Foglio «Da A a B» (0045): come si va da una tappa alla successiva. Mezzi a riquadri con il tempo di ciascuno, la durata
// vera se la si conosce (vince sulla stima) e il controllo su Google Maps. Senza scelte vale il mezzo del viaggio.
import { useState } from 'react'
import { Pulsante } from '../../faraway/base'
import { CampoDurata } from '../../faraway/CampoDurata'
import { Foglio } from '../../faraway/Foglio'
import { Riquadri } from '../../faraway/Moduli'
import { Sv } from '../../faraway/icons'
import type { Leg, WalkRoute } from '../../lib/dayRoute'
import { formatDuration, parseDuration } from '../../lib/duration'
import { durata, etichettaMezzo, MEZZI_TRATTO, NOME_MEZZO, scegliMezzo, sceltoPer, spostamento, tipoSuMappa, type Impostazioni, type MezzoTratto } from '../../lib/spostamenti'
import { formatDistance } from '../../lib/dayRoute'
import { useTrips } from '../../state/trip'
import type { DayItem } from '../../types'

const GLIFO: Record<MezzoTratto, string> = { walk: 'g-tra-walk', metro: 'g-tra-metro', bus: 'g-tra-bus', train: 'g-tra-train', taxi: 'g-tra-taxi', car: 'g-tra-car' }

export function SpostamentoSheet({ open, onClose, da, a, leg, strada, imp }: {
  open: boolean
  onClose: () => void
  da: DayItem
  a: DayItem
  leg: Leg
  /** percorso su strada già calcolato per questo tratto (a piedi o in auto) */
  strada?: WalkRoute | null
  imp: Impostazioni
}) {
  const t = useTrips()
  const scelto = sceltoPer(a)
  const predefinito = scegliMezzo(leg.straightM, { via: leg.via?.mode, imp }).mezzo
  const iniziale = scelto ?? ((MEZZI_TRATTO as string[]).includes(predefinito) ? (predefinito as MezzoTratto) : '')
  const [mezzo, setMezzo] = useState<MezzoTratto | ''>(iniziale)
  const [testo, setTesto] = useState(a.arriveMinutes ? formatDuration(a.arriveMinutes) : '')
  const [errore, setErrore] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /** Tempo con un mezzo: dal percorso su strada se è già calcolato per quel tipo di tratto, altrimenti stimato. */
  const tempo = (m: MezzoTratto) => {
    const usaStrada = strada && tipoSuMappa(m) === leg.kind && leg.kind !== 'line'
    return spostamento(leg.straightM, { scelto: m, imp, strada: usaStrada ? strada : undefined }).minutes
  }
  const manuale = !!(scelto || a.arriveMinutes)
  const ll = (p: { lat: number; lng: number }) => encodeURIComponent(`${p.lat},${p.lng}`)
  const modo = mezzo === 'walk' ? 'walking' : mezzo === 'car' || mezzo === 'taxi' ? 'driving' : 'transit'
  const maps = `https://www.google.com/maps/dir/?api=1&origin=${ll(leg.from)}&destination=${ll(leg.to)}&travelmode=${modo}`

  async function salva(nuovo: MezzoTratto | null, minuti: number | null) {
    setBusy(true)
    const msg = await t.setItemArrive(a.id, nuovo, minuti)
    setBusy(false)
    if (msg) setErrore(msg)
    else onClose()
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const min = parseDuration(testo)
    if (min !== null && Number.isNaN(min)) return setErrore('Scrivi la durata in ore e minuti, da 1 minuto a 24 ore.')
    // scegliere il mezzo che il viaggio darebbe comunque non lo fissa: se cambia il mezzo del viaggio, lo spostamento lo segue
    const nuovo = !mezzo ? null : scelto || mezzo !== predefinito ? mezzo : null
    void salva(nuovo, min)
  }

  return (
    <Foglio
      open={open}
      title={`Da ${da.title} a ${a.title}`}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="spostamento-form" isLoading={busy}>
          Salva lo spostamento
        </Pulsante>
      }
    >
      <form id="spostamento-form" className="frm" onSubmit={submit} noValidate>
        <Riquadri<MezzoTratto>
          label="Come ci vai"
          cols={3}
          value={mezzo}
          onChange={(m) => (setMezzo(m), setErrore(null))}
          options={MEZZI_TRATTO.map((m) => ({ value: m, label: NOME_MEZZO[m], glifo: GLIFO[m], sub: durata(tempo(m)) }))}
        >
          <span className="fa-help">
            {`${formatDistance(leg.straightM)} in linea d’aria. `}
            {scelto ? 'Scelto a mano per questo spostamento.' : `Senza scelte vale il mezzo del viaggio: ${etichettaMezzo(predefinito).toLowerCase()}.`}
          </span>
        </Riquadri>
        <CampoDurata
          label="Durata"
          value={testo}
          onChange={(v) => (setTesto(v), setErrore(null))}
          hint="Se la conosci, per esempio da Google Maps, scrivila: vale più della stima."
          error={errore}
        />
        <a className="fa-btn out" href={maps} target="_blank" rel="noopener noreferrer" style={{ height: 44, fontSize: 14 }}>
          <Sv name="pin" size={20} />
          Controlla su Maps
        </a>
        {manuale ? (
          <Pulsante color="tertiary" iconLeading="refresh" isLoading={busy} onPress={() => void salva(null, null)}>
            Torna al mezzo del viaggio
          </Pulsante>
        ) : null}
      </form>
    </Foglio>
  )
}
