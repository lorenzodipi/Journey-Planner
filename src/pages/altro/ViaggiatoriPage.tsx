// Viaggiatori (mock Fa-48, #44, FRD TRIP-004/005/006/013): creatore e partecipanti, inviti per email con stato,
// «Rimuovi dal viaggio» e «Invita una persona» solo per chi ha creato il viaggio. Visualizzatori (0049): li invitano creatore
// e partecipanti (dopo la 0050), si possono rendere partecipanti o togliere; il visualizzatore vede la pagina senza azioni.
import { useEffect, useState } from 'react'
import { soloLettura } from '../../lib/ruolo'
import { visualizzatoriAttivi } from '../../lib/tripApi'
import { erroreInvito, invitiVisibili, riepilogoPartecipanti, ruoloTesto, scadenzaTesto, STATO_INVITO } from '../../lib/inviti'
import { discOf, initials, useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { LinkAccount } from '../../ui/LinkAccount'
import { Avatar, Banner, Campo, Pillola, Pulsante, Segmenti } from '../../faraway/base'
import { useAuth } from '../../lib/auth'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { Azioni, KV, RigaApribile, useUnaAperta } from '../../faraway/Righe'
import { Affianca, BarraIndietro, Colonna, Schermata } from '../../faraway/shell'
import { useInCorso } from '../../faraway/Attesa'

const TONO = { inviato: 'soft', accettato: 'acq', rifiutato: 'mut', scaduto: 'cor' } as const

export function ViaggiatoriPage() {
  const trip = useTrip()
  const t = useTrips()
  const me = useMe(trip)
  const [ask, confirmNode] = useConferma()
  const open = useUnaAperta()
  const [invita, setInvita] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [collega, setCollega] = useState<string | null>(null)
  const [rinomina, setRinomina] = useState<{ id: string; nome: string } | null>(null)
  const uid = useAuth().session?.user.id
  const creatore = trip.myRole === undefined || trip.myRole === 'owner'
  const lettura = soloLettura(trip)
  const partecipante = !creatore && !lettura
  const inviti = invitiVisibili(trip)
  // inviti come visualizzatore: solo dopo la 0050 (prima i costi stanno ancora nelle righe che leggerebbero)
  const [conVisualizzatori, setConVisualizzatori] = useState(false)
  useEffect(() => {
    let vivo = true
    if (!lettura) void visualizzatoriAttivi().then((ok) => vivo && setConVisualizzatori(ok))
    return () => {
      vivo = false
    }
  }, [lettura])
  const [ruolo, setRuolo] = useState<'editor' | 'viewer'>('editor')
  const ruoloInvito: 'editor' | 'viewer' = creatore ? (conVisualizzatori ? ruolo : 'editor') : 'viewer'
  const puoiInvitare = creatore || (partecipante && conVisualizzatori)

  async function invia() {
    const e = erroreInvito(email, trip)
    if (e) return setError(e)
    setBusy(true)
    setError(null)
    const m = await t.inviteByEmail(trip.id, email.trim().toLowerCase(), ruoloInvito)
    setBusy(false)
    if (m) return setError(m)
    setInvita(false)
    setEmail('')
    showToast('Invito inviato: la persona lo trova in Viaggi, in «Inviti ricevuti»')
  }

  const [occ, faiOcc] = useInCorso()
  async function rimuovi(id: string) {
    const p = trip.travelers.find((x) => x.id === id)
    if (!p) return
    const ok = await ask({
      title: `Togliere ${p.name} dal viaggio?`,
      message: p.userId ? 'Perde l’accesso al viaggio. Le spese già divise con lei o con lui restano nei conti.' : 'Non è più tra i viaggiatori. Le spese già divise con lei o con lui restano nei conti.',
      confirm: 'Rimuovi dal viaggio',
      cancel: 'Tieni la persona',
      destructive: true,
    })
    if (!ok) return
    const m = await faiOcc(`rimuovi:${p.id}`, () => t.removeMember(trip.id, p.userId, p.id))
    showToast(m ?? `${p.name} non è più nel viaggio`)
  }

  async function salvaNome() {
    if (!rinomina) return
    const p = trip.travelers.find((x) => x.id === rinomina.id)
    const nome = rinomina.nome.trim()
    if (!p || !nome) return
    setRinomina(null)
    const m = await t.updateTraveler(p.id, { name: nome, color: p.color })
    if (m) showToast(m)
  }

  async function promuovi(userId: string, nome: string) {
    const ok = await ask({ title: `Rendere ${nome} partecipante?`, message: 'Entra nel viaggio come viaggiatore: vede e modifica tutto, anche spese e checklist.', confirm: 'Rendi partecipante', cancel: 'Lascia visualizzatore', destructive: false })
    if (!ok) return
    const m = await faiOcc(`promuovi:${userId}`, () => t.promoteViewer(trip.id, userId))
    showToast(m ?? `${nome} ora è un partecipante`)
  }

  async function togliVisualizzatore(userId: string, nome: string) {
    const ok = await ask({ title: `Togliere ${nome}?`, message: 'Non vede più il viaggio.', confirm: 'Togli dal viaggio', cancel: 'Lascialo', destructive: true })
    if (!ok) return
    const m = await faiOcc(`togli:${userId}`, () => t.removeViewer(trip.id, userId))
    showToast(m ?? `${nome} non vede più il viaggio`)
  }

  async function annulla(id: string, mail: string) {
    const m = await faiOcc(`invito:${id}`, () => t.cancelInvite(id))
    showToast(m ?? `Invito a ${mail} annullato`)
  }

  return (
    <Schermata
      bar={<BarraIndietro title="Viaggiatori" back="/altro" />}
      fab={puoiInvitare ? { label: 'Persona', aria: 'Invita una persona', onPress: () => setInvita(true) } : null}
      overlay={
        <>
          <Foglio
            open={invita}
            title="Invita una persona"
            onClose={() => (setInvita(false), setError(null))}
            footer={
              <Pulsante isLoading={busy} onPress={() => void invia()}>
                Invia l’invito
              </Pulsante>
            }
          >
            <div style={{ display: 'grid', gap: 16 }}>
              <Campo label="Email" type="email" inputMode="email" icon="mail" value={email} onChange={(v) => (setEmail(v), setError(null))} error={error ?? undefined} placeholder="nome@esempio.it" autoFocus />
              {creatore && conVisualizzatori ? (
                <Segmenti label="Come entra" value={ruolo} options={[{ value: 'editor', label: 'Partecipante' }, { value: 'viewer', label: 'Visualizzatore' }]} onChange={setRuolo} />
              ) : null}
              <p className="fa-m" style={{ margin: 0 }}>
                {ruoloInvito === 'viewer'
                  ? 'Chi accetta vede oggi, i giorni, alloggi, voli e trasporti, ma non li modifica. Non vede spese, budget, luoghi, prenotazioni, documenti e checklist, e non entra nei conti.'
                  : 'Chi accetta entra come partecipante e può modificare il viaggio.'}{' '}
                L’invito vale 7 giorni. La persona lo trova dentro l’app, in Viaggi, appena entra con questo indirizzo: non mandiamo email.
              </p>
            </div>
          </Foglio>
          <Foglio open={collega !== null} title="Collega a un account" onClose={() => setCollega(null)}>
            <div className="legacy">
              {collega ? <LinkAccount onSubmit={(mail) => t.linkTraveler(collega, mail)} onDone={() => setCollega(null)} /> : null}
            </div>
          </Foglio>
          <Foglio
            open={rinomina !== null}
            title="Nome della persona"
            onClose={() => setRinomina(null)}
            footer={
              <Pulsante isDisabled={!rinomina?.nome.trim()} onPress={() => void salvaNome()}>
                Salva il nome
              </Pulsante>
            }
          >
            {rinomina ? <Campo label="Nome" value={rinomina.nome} onChange={(v) => setRinomina({ ...rinomina, nome: v })} maxLength={40} autoFocus /> : null}
          </Foglio>
          {confirmNode}
        </>
      }
    >
      <Affianca>
        <Colonna lato="sinistra">
      {lettura ? (
        <Banner tone="az" icon="info">Vedi questo viaggio come visualizzatore: puoi seguirlo, ma non modificarlo.</Banner>
      ) : null}
      <p className="fa-m" style={{ margin: 0 }}>{riepilogoPartecipanti(trip)}</p>
      <div className="fa-list">
        {trip.travelers.map((p) => {
          const sono = p.id === me?.id
          const puoiRimuovere = creatore && !sono && p.role !== 'owner'
          return (
            <RigaApribile
              key={p.id}
              icon={<Avatar initials={initials(p.name)} n={discOf(trip, p.id)} large />}
              title={`${p.name}${sono ? ' (tu)' : ''}`}
              sub={p.email ?? (p.userId ? undefined : 'Senza account · da collegare')}
              open={open.isOpen(p.id)}
              onToggle={() => open.toggle(p.id)}
            >
              <KV icon="user" title={ruoloTesto(p)} sub={p.role === 'owner' ? 'Ha creato il viaggio: invita e toglie le persone, elimina il viaggio' : 'Può modificare il viaggio'} />
              {!lettura && (creatore || sono) ? (
                <Azioni>
                  <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={() => setRinomina({ id: p.id, nome: p.name })}>
                    Cambia nome
                  </Pulsante>
                </Azioni>
              ) : null}
              {creatore && !p.userId ? (
                <Azioni>
                  <Pulsante size="sm" color="secondary" iconLeading="link" onPress={() => setCollega(p.id)}>
                    Collega a un account
                  </Pulsante>
                </Azioni>
              ) : null}
              {puoiRimuovere ? (
                <Azioni>
                  <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" isLoading={occ === `rimuovi:${p.id}`} onPress={() => void rimuovi(p.id)}>
                    Rimuovi dal viaggio
                  </Pulsante>
                </Azioni>
              ) : null}
            </RigaApribile>
          )
        })}
      </div>
        </Colonna>

        <Colonna lato="destra">
      {trip.viewers?.length ? (
        <>
          <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Visualizzatori</h2>
          <div className="fa-list">
            {trip.viewers.map((v) => {
              const nome = v.email ? v.email.split('@')[0] : 'Visualizzatore'
              const io = v.userId === uid
              return (
                <RigaApribile
                  key={v.userId}
                  icon={<Sv name="eye" size={22} />}
                  title={`${v.email ?? 'Visualizzatore'}${io ? ' (tu)' : ''}`}
                  sub="Vede il viaggio, non lo modifica"
                  open={open.isOpen(`v:${v.userId}`)}
                  onToggle={() => open.toggle(`v:${v.userId}`)}
                >
                  <KV icon="user" title="Visualizzatore" sub="Non è tra i viaggiatori: niente spese, checklist, luoghi, prenotazioni e documenti" />
                  {lettura ? null : (
                    <Azioni>
                      <Pulsante size="sm" color="secondary" iconLeading="user" isLoading={occ === `promuovi:${v.userId}`} onPress={() => void promuovi(v.userId, nome)}>
                        Rendi partecipante
                      </Pulsante>
                      <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" isLoading={occ === `togli:${v.userId}`} onPress={() => void togliVisualizzatore(v.userId, nome)}>
                        Togli
                      </Pulsante>
                    </Azioni>
                  )}
                </RigaApribile>
              )
            })}
          </div>
        </>
      ) : null}
      {inviti.length > 0 && !lettura ? (
        <>
          <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Inviti</h2>
          <div className="fa-list">
            {inviti.map((i) => (
              <RigaApribile
                key={i.id}
                icon={<Sv name="mail" size={22} />}
                title={i.email}
                sub={[i.role === 'viewer' ? 'Visualizzatore' : null, i.stato === 'inviato' ? scadenzaTesto(i.expiresAt) : null].filter(Boolean).join(' · ') || undefined}
                end={<Pillola tone={TONO[i.stato]}>{STATO_INVITO[i.stato]}</Pillola>}
                open={open.isOpen(i.id)}
                onToggle={() => open.toggle(i.id)}
              >
                <KV icon="info" title={i.stato === 'inviato' ? 'Aspetta la risposta' : i.stato === 'rifiutato' ? 'Ha rifiutato l’invito' : 'L’invito è scaduto'} sub={i.stato === 'inviato' ? 'La persona deve accettare per vedere il viaggio' : creatore ? 'Puoi invitarla di nuovo' : undefined} />
                {creatore || (partecipante && i.role === 'viewer') ? (
                  <Azioni>
                    <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" isLoading={occ === `invito:${i.id}`} onPress={() => void annulla(i.id, i.email)}>
                      {i.stato === 'inviato' ? 'Annulla l’invito' : 'Togli dall’elenco'}
                    </Pulsante>
                  </Azioni>
                ) : null}
              </RigaApribile>
            ))}
          </div>
        </>
      ) : null}
        </Colonna>
      </Affianca>
    </Schermata>
  )
}
