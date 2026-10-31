// Viaggi (mock Fa-12, #43): copertine illustrate, stato, avatar, date e riga finale; FAB «+ Viaggio»; stato vuoto.
// Dopo l'accesso, con più viaggi, è la scelta del viaggio (`scelta`).
import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { periodo, viaggiText } from '../../lib/altro'
import { formatShort } from '../../lib/dates'
import { showToast } from '../../state/toast'
import { Sv } from '../../faraway/icons'
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
import { DuplicaSheet } from './DuplicaSheet'

const SCENE = { tempio: ART.tempio, mare: ART.mare, citta: ART.citta, natura: ART.natura, panorama: ART.panorama }
const TONO = { prossimo: 'soft', incorso: 'acq', concluso: 'mut' } as const

export function ViaggiPage({ scelta, onChosen }: { scelta?: boolean; onChosen?: () => void }) {
  const t = useTrips()
  const [, navigate] = useLocation()
  const [nuovo, setNuovo] = useState(false)
  const [invito, setInvito] = useState(false)
  const tutti = ordinaViaggi(t.trips)
  const lista = tutti.filter((x) => !x.archivedAt)
  const archiviati = tutti.filter((x) => x.archivedAt)
  const [duplica, setDuplica] = useState<Trip | null>(null)
  const [mostraArch, setMostraArch] = useState(false)
  const [rispondendo, setRispondendo] = useState<string | null>(null)
  useEffect(() => {
    void t.refreshInvites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function rispondi(id: string, accetta: boolean, titolo: string) {
    setRispondendo(id)
    const r = await t.respondInvite(id, accetta)
    setRispondendo(null)
    if (r.error) return showToast(r.error)
    if (!accetta) return showToast('Invito rifiutato')
    showToast(`Sei dentro: «${titolo}»`)
    if (r.tripId) apri(r.tripId)
  }

  const apri = (id: string) => {
    t.setActive(id)
    onChosen?.()
    navigate('/')
  }

  async function archivia(trip: Trip, on: boolean) {
    const m = await t.archiveTrip(trip.id, on)
    showToast(m ?? (on ? `«${trip.title}» archiviato` : `«${trip.title}» ripristinato`), m || !on ? undefined : { label: 'Annulla', run: () => void t.archiveTrip(trip.id, false) })
  }

  function azioni(trip: Trip) {
    if (trip.myRole !== undefined && trip.myRole !== 'owner') return null
    return (
      <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 16px 16px', borderTop: '1px solid var(--hairline)' }}>
        {trip.archivedAt ? (
          <Pulsante size="sm" color="secondary" onPress={() => void archivia(trip, false)}>Ripristina</Pulsante>
        ) : (
          <>
            <Pulsante size="sm" color="secondary" onPress={() => setDuplica(trip)}>Duplica come modello</Pulsante>
            <Pulsante size="sm" color="tertiary" onPress={() => void archivia(trip, true)}>Archivia</Pulsante>
          </>
        )}
      </span>
    )
  }

  function card(trip: Trip) {
    const stato = statoViaggio(trip)
    const people = trip.travelers.slice(0, 4).map((p) => ({ initials: initials(p.name), n: discOf(trip, p.id) }))
    return (
      <button key={trip.id} type="button" onClick={() => apri(trip.id)} aria-label={`${trip.title}, ${STATO_TESTO[stato]}`} style={{ padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', color: 'inherit', background: 'none', border: 0, display: 'block', width: '100%' }}>
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

  // una sola card: la copertina apre il viaggio, le azioni stanno nella stessa card
  const conAzioni = (trip: Trip) => (
    <div key={trip.id} className={cx('fa-card xl')} style={{ padding: 0, overflow: 'hidden', border: trip.id === t.active?.id ? '2px solid var(--focus)' : undefined }}>
      {card(trip)}
      {azioni(trip)}
    </div>
  )

  return (
    <Schermata
      tabs={!scelta}
      bar={scelta ? <BarraGrande title="Viaggi" sub={viaggiText(lista.length)} /> : <BarraIndietro title="Viaggi" back="/altro" />}
      fab={lista.length ? { label: 'Viaggio', aria: 'Crea un viaggio', onPress: () => setNuovo(true) } : null}
      overlay={
        <>
          {duplica ? <DuplicaSheet trip={duplica} onClose={() => setDuplica(null)} onDone={() => (setDuplica(null), onChosen?.(), navigate('/'))} /> : null}
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
      {t.receivedInvites.length > 0 ? (
        <section aria-label="Inviti ricevuti" style={{ display: 'grid', gap: 12 }}>
          <h2 className="fa-h3" style={{ margin: 0 }}>Inviti ricevuti</h2>
          {t.receivedInvites.map((i) => (
            <div key={i.id} className="fa-card xl pad" style={{ display: 'grid', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sv name="mail" size={20} />
                <span className="fa-h3">{i.title}</span>
              </span>
              <span className="fa-m">
                {i.invitedBy ? `${i.invitedBy} ti ha invitato` : 'Sei stato invitato'}
                {i.startDate && i.endDate ? ` · ${formatShort(i.startDate)} – ${formatShort(i.endDate)}` : ''}
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                <Pulsante isLoading={rispondendo === i.id} onPress={() => void rispondi(i.id, true, i.title)}>
                  Accetta
                </Pulsante>
                <Pulsante color="secondary" isDisabled={rispondendo === i.id} onPress={() => void rispondi(i.id, false, i.title)}>
                  Rifiuta
                </Pulsante>
              </span>
            </div>
          ))}
        </section>
      ) : null}
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
          {lista.map(conAzioni)}
          {archiviati.length ? (
            <section aria-label="Viaggi archiviati" style={{ display: 'grid', gap: 12 }}>
              <button type="button" className="fa-lnk" style={{ justifySelf: 'start' }} aria-expanded={mostraArch} onClick={() => setMostraArch(!mostraArch)}>
                {mostraArch ? 'Nascondi' : 'Mostra'} i viaggi archiviati ({archiviati.length})
              </button>
              {mostraArch ? archiviati.map(conAzioni) : null}
            </section>
          ) : null}
          <Pulsante color="tertiary" onPress={() => setInvito(true)}>
            Ho un invito
          </Pulsante>
        </>
      )}
    </Schermata>
  )
}
