// Viaggi (mock Fa-12, #43): copertine illustrate, stato, avatar, date e riga finale; FAB «+ Viaggio»; stato vuoto.
// Dopo l'accesso, con più viaggi, è la scelta del viaggio (`scelta`).
import { useState } from 'react'
import { useLocation } from 'wouter'
import { periodo, viaggiText } from '../../lib/altro'
import { riassunto } from '../../lib/spese'
import { ordinaViaggi, rigaFinale, scenaDelViaggio, statoViaggio, STATO_TESTO } from '../../lib/viaggi'
import { initials, discOf } from '../../state/me'
import { useTrips } from '../../state/trip'
import type { Trip } from '../../types'
import { ART } from '../../ui/art'
import { Avatars, Pillola, Pulsante } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { Foglio } from '../../faraway/Foglio'
import { BarraGrande, BarraIndietro, Schermata } from '../../faraway/shell'
import { Vuoto } from '../../faraway/Stati'
import { ViaggioSheet } from '../viaggio/ViaggioSheet'

const SCENE = { tempio: ART.tempio, mare: ART.mare, citta: ART.citta, natura: ART.natura, panorama: ART.panorama }
const TONO = { prossimo: 'soft', incorso: 'acq', concluso: 'mut' } as const

export function ViaggiPage({ scelta, onChosen }: { scelta?: boolean; onChosen?: () => void }) {
  const t = useTrips()
  const [, navigate] = useLocation()
  const [nuovo, setNuovo] = useState(false)
  const [invito, setInvito] = useState(false)
  const lista = ordinaViaggi(t.trips)

  const apri = (id: string) => {
    t.setActive(id)
    onChosen?.()
    navigate('/')
  }

  function card(trip: Trip) {
    const stato = statoViaggio(trip)
    const attuale = trip.id === t.active?.id
    const people = trip.travelers.slice(0, 4).map((p) => ({ initials: initials(p.name), n: discOf(trip, p.id) }))
    return (
      <button key={trip.id} type="button" className={cx('fa-card xl')} onClick={() => apri(trip.id)} aria-label={`${trip.title}, ${STATO_TESTO[stato]}`} style={{ padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', color: 'inherit', border: attuale ? '2px solid var(--focus)' : undefined, display: 'block', width: '100%' }}>
        <span style={{ position: 'relative', display: 'block', aspectRatio: '16/9', background: 'var(--tinta-azzurro)' }}>
          <img src={SCENE[scenaDelViaggio(trip)]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <span style={{ position: 'absolute', left: 12, top: 12 }}>
            <Pillola tone={TONO[stato]}>{STATO_TESTO[stato]}</Pillola>
          </span>
        </span>
        <span style={{ display: 'grid', gap: 6, padding: 16 }}>
          <span className="fa-h3">{trip.title}</span>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span className="fa-m">{periodo(trip)}</span>
            {people.length ? <Avatars people={people} /> : null}
          </span>
          <span style={{ font: '600 14px/20px var(--font-sans)', color: 'var(--ink)' }}>
            {rigaFinale(trip, stato === 'concluso' ? riassunto(trip, undefined).speso : 0)}
          </span>
        </span>
      </button>
    )
  }

  return (
    <Schermata
      tabs={!scelta}
      bar={scelta ? <BarraGrande title="Viaggi" sub={viaggiText(lista.length)} /> : <BarraIndietro title="Viaggi" back="/altro" />}
      fab={lista.length ? { label: 'Viaggio', aria: 'Crea un viaggio', onPress: () => setNuovo(true) } : null}
      overlay={
        <>
          {nuovo ? <ViaggioSheet open onClose={() => setNuovo(false)} onDone={() => (onChosen?.(), navigate('/'))} /> : null}
          <Foglio open={invito} title="Ho un invito" onClose={() => setInvito(false)}>
            <div style={{ display: 'grid', gap: 12 }}>
              <p className="fa-m" style={{ margin: 0 }}>Gli inviti arrivano qui: entra con l’indirizzo email a cui sono stati mandati e li trovi in «Inviti ricevuti», da accettare o rifiutare.</p>
              <Pulsante
                iconLeading="refresh"
                onPress={() => {
                  void t.refresh()
                  setInvito(false)
                }}
              >
                Controlla gli inviti
              </Pulsante>
            </div>
          </Foglio>
        </>
      }
    >
      {lista.length === 0 ? (
        <Vuoto
          art="vuotoViaggi"
          title="Nessun viaggio ancora"
          text="Quando crei o accetti un invito, i viaggi compaiono qui."
          action="Crea un viaggio"
          onAction={() => setNuovo(true)}
          secondary={
            <Pulsante color="secondary" onPress={() => setInvito(true)}>
              Ho un invito
            </Pulsante>
          }
        />
      ) : (
        <>
          {lista.map(card)}
          <Pulsante color="tertiary" onPress={() => setInvito(true)}>
            Ho un invito
          </Pulsante>
        </>
      )}
    </Schermata>
  )
}
