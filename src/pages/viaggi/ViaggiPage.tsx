// Viaggi (mock Fa-12, #43): copertine illustrate, stato, avatar, date e riga finale; FAB «+ Viaggio»; stato vuoto.
// Senza barra delle schede né «indietro», con il profilo in alto a destra: si esce scegliendo un viaggio (dopo l’accesso è la scelta del viaggio).
import { useEffect, useState } from 'react'
import { useInCorso } from '../../faraway/Attesa'
import { useLocation } from 'wouter'
import { periodo, viaggiText } from '../../lib/altro'
import { formatShort } from '../../lib/dates'
import { showToast } from '../../state/toast'
import { Sv } from '../../faraway/icons'
import { riassunto } from '../../lib/spese'
import { soloLettura } from '../../lib/ruolo'
import { ordinaViaggi, rigaFinale, scenaDelViaggio, statoViaggio, STATO_TESTO } from '../../lib/viaggi'
import { copertinaDelViaggio } from '../../lib/copertine'
import { useAuth } from '../../lib/auth'
import { initials, discOf, useMe } from '../../state/me'
import { useTrips } from '../../state/trip'
import type { Trip } from '../../types'
import { ART } from '../../ui/art'
import { Button as AriaButton } from 'react-aria-components'
import { Avatar, Avatars, Campo, Pillola, Pulsante, Segmenti } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { Foglio } from '../../faraway/Foglio'
import { Affianca, BarraGrande, Schermata } from '../../faraway/shell'
import { Vuoto } from '../../faraway/Stati'
import { ViaggioSheet } from '../viaggio/ViaggioSheet'
import { DuplicaSheet } from './DuplicaSheet'

const SCENE = { tempio: ART.tempio, mare: ART.mare, citta: ART.citta, natura: ART.natura, panorama: ART.panorama }
const TONO = { prossimo: 'soft', incorso: 'acq', concluso: 'mut' } as const

/** L'illustrazione del paese in cui il viaggio passa più giorni; se manca o non si carica, la scena generica. */
function Copertina({ trip }: { trip: Trip }) {
  const paese = copertinaDelViaggio(trip)
  // si ricorda quale indirizzo non si è caricato: se il paese cambia, si riprova con la nuova immagine
  const [rotta, setRotta] = useState<string | null>(null)
  const src = paese && paese !== rotta ? paese : SCENE[scenaDelViaggio(trip)]
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => paese && setRotta(paese)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
}

type Sezione = 'partecipo' | 'visualizzo' | 'archiviati'

export function ViaggiPage({ onChosen }: { onChosen?: () => void }) {
  const t = useTrips()
  const auth = useAuth()
  const me = useMe(t.active)
  const [, navigate] = useLocation()
  const [nuovo, setNuovo] = useState(false)
  const [invito, setInvito] = useState(false)
  const tutti = ordinaViaggi(t.trips)
  const [cerca, setCerca] = useState('')
  const q = cerca.trim().toLowerCase()
  const corrisponde = (x: Trip) => !q || `${x.title} ${x.destination}`.toLowerCase().includes(q)
  const lista = tutti.filter((x) => !x.archivedAt && corrisponde(x))
  const archiviati = tutti.filter((x) => x.archivedAt && corrisponde(x))
  const conRicerca = tutti.length >= 3
  const [duplica, setDuplica] = useState<Trip | null>(null)
  // sezioni (solo quelle che hanno viaggi; con una sola il selettore non si vede): partecipo, solo da vedere, archiviati
  const sezioni: { value: Sezione; label: string }[] = []
  if (tutti.some((x) => !x.archivedAt && x.myRole !== 'viewer')) sezioni.push({ value: 'partecipo', label: 'Partecipo' })
  if (tutti.some((x) => !x.archivedAt && x.myRole === 'viewer')) sezioni.push({ value: 'visualizzo', label: 'Visualizzo' })
  if (tutti.some((x) => x.archivedAt)) sezioni.push({ value: 'archiviati', label: 'Archiviati' })
  const [sezScelta, setSezione] = useState<Sezione>('partecipo')
  const sezione: Sezione = sezioni.some((x) => x.value === sezScelta) ? sezScelta : (sezioni[0]?.value ?? 'partecipo')
  const mostrati = sezione === 'archiviati' ? archiviati : lista.filter((x) => (sezione === 'visualizzo') === (x.myRole === 'viewer'))
  const [rispondendo, setRispondendo] = useState<string | null>(null)
  useEffect(() => {
    void t.refreshInvites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function rispondi(id: string, accetta: boolean, titolo: string) {
    setRispondendo(`${id}:${accetta ? 'si' : 'no'}`)
    const r = await t.respondInvite(id, accetta)
    setRispondendo(null)
    if (r.error) return showToast(r.error)
    setInvito(false)
    if (!accetta) return showToast('Invito rifiutato')
    showToast(`Sei dentro: «${titolo}»`)
    if (r.tripId) apri(r.tripId)
  }

  /** Un viaggio scelto si apre sempre dalla sua home («Oggi»), qualunque fosse l'ultima pagina vista. */
  const apri = (id: string) => {
    t.setActive(id)
    onChosen?.()
    navigate('/', { replace: true })
  }

  // il pulsante del viaggio mostra il caricamento finché il server risponde
  const [archiviando, inCorso] = useInCorso()
  async function archivia(trip: Trip, on: boolean) {
    const m = await inCorso(trip.id, () => t.archiveTrip(trip.id, on))
    showToast(m ?? (on ? `«${trip.title}» archiviato` : `«${trip.title}» ripristinato`), m || !on ? undefined : { label: 'Annulla', run: () => void t.archiveTrip(trip.id, false) })
  }

  function azioni(trip: Trip) {
    if (trip.myRole !== undefined && trip.myRole !== 'owner') return null
    return (
      <span className="fa-acts" style={{ margin: 0, padding: 16, borderTop: '1px solid var(--hairline)' }}>
        {trip.archivedAt ? (
          <Pulsante size="sm" color="secondary" isLoading={archiviando === trip.id} onPress={() => void archivia(trip, false)}>Ripristina</Pulsante>
        ) : (
          <>
            <Pulsante size="sm" color="secondary" isDisabled={archiviando === trip.id} onPress={() => setDuplica(trip)}>Duplica come modello</Pulsante>
            <Pulsante size="sm" color="secondary-soft" iconLeading="archive" isLoading={archiviando === trip.id} onPress={() => void archivia(trip, true)}>Archivia</Pulsante>
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
          <Copertina trip={trip} />
          <span style={{ position: 'absolute', left: 12, top: 12 }}>
            <Pillola tone={TONO[stato]}>{STATO_TESTO[stato]}</Pillola>
          </span>
        </span>
        <span style={{ display: 'grid', gap: 8, padding: 16 }}>
          <span className="fa-h3">{trip.title}</span>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span className="fa-m">{periodo(trip)}</span>
            {people.length ? <Avatars people={people} /> : null}
          </span>
          <span style={{ font: '600 14px/20px var(--font-sans)', color: 'var(--ink)' }}>
            {soloLettura(trip) ? rigaFinale({ ...trip, budgetLimit: undefined }, 0).replace(/^Spesi .*/, 'Concluso') : rigaFinale(trip, stato === 'concluso' ? riassunto(trip, undefined).speso : 0)}
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

  // il profilo sta in alto a destra: da qui non c'è «indietro» né barra delle schede, si esce scegliendo un viaggio
  const email = auth.session?.user.email ?? ''
  const nome = me?.name || (email ? email.split('@')[0].replace(/^./, (c) => c.toUpperCase()) : 'Anteprima demo')
  const profilo = (
    <AriaButton className="fa-avbtn" aria-label={`Profilo di ${nome}`} onPress={() => navigate('/altro/account')}>
      <Avatar initials={initials(nome)} n={t.active && me ? discOf(t.active, me.id) : 1} large />
    </AriaButton>
  )

  return (
    <Schermata
      tabs={false}
      bar={<BarraGrande title="Viaggi" sub={viaggiText(tutti.filter((x) => !x.archivedAt).length)} actions={profilo} />}
      fab={tutti.some((x) => !x.archivedAt) ? { label: 'Viaggio', aria: 'Crea un viaggio', onPress: () => setNuovo(true) } : null}
      overlay={
        <>
          {duplica ? <DuplicaSheet trip={duplica} onClose={() => setDuplica(null)} onDone={() => (setDuplica(null), onChosen?.(), navigate('/'))} /> : null}
          {nuovo ? <ViaggioSheet open onClose={() => setNuovo(false)} onDone={() => (onChosen?.(), navigate('/'))} /> : null}
          <Foglio open={invito} title="Ho un invito" onClose={() => setInvito(false)}>
            <div style={{ display: 'grid', gap: 16 }}>
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
        <section aria-label="Inviti ricevuti" style={{ display: 'grid', gap: 16 }}>
          <h2 className="fa-h3" style={{ margin: 0 }}>Inviti ricevuti</h2>
          {t.receivedInvites.map((i) => (
            <div key={i.id} className="fa-card xl pad" style={{ display: 'grid', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sv name="mail" size={20} />
                <span className="fa-h3">{i.title}</span>
              </span>
              <span className="fa-m">
                {i.invitedBy ? `${i.invitedBy} ti ha invitato` : 'Sei stato invitato'}
                {i.role === 'viewer' ? ' a vederlo' : ''}
                {i.startDate && i.endDate ? ` · ${formatShort(i.startDate)} – ${formatShort(i.endDate)}` : ''}
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                <Pulsante isLoading={rispondendo === `${i.id}:si`} isDisabled={rispondendo === `${i.id}:no`} onPress={() => void rispondi(i.id, true, i.title)}>
                  Accetta
                </Pulsante>
                <Pulsante color="secondary" isLoading={rispondendo === `${i.id}:no`} isDisabled={rispondendo === `${i.id}:si`} onPress={() => void rispondi(i.id, false, i.title)}>
                  Rifiuta
                </Pulsante>
              </span>
            </div>
          ))}
        </section>
      ) : null}
      {conRicerca ? (
        <Campo label="Cerca un viaggio" hideLabel icon="search" type="search" value={cerca} onChange={setCerca} placeholder="Cerca un viaggio per nome o destinazione" enterKeyHint="search" />
      ) : null}
      {sezioni.length > 1 ? <Segmenti label="Quali viaggi" value={sezione} options={sezioni} onChange={setSezione} /> : null}
      {mostrati.length === 0 && q ? (
        <p className="fa-m" role="status" style={{ margin: 0, textAlign: 'center' }}>Nessun viaggio corrisponde a «{cerca.trim()}».</p>
      ) : null}
      {tutti.every((x) => x.archivedAt) && !q ? (
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
          <Affianca uguali>{(sezioni.length > 1 ? mostrati : lista).map(conAzioni)}</Affianca>
          <Pulsante color="tertiary" onPress={() => setInvito(true)}>
            Ho un invito
          </Pulsante>
        </>
      )}
    </Schermata>
  )
}
