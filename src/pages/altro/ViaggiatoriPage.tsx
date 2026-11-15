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
import { t as tt } from '../../i18n'

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
    showToast(tt('Invito inviato: la persona lo trova in Viaggi, in «Inviti ricevuti»'))
  }

  const [occ, faiOcc] = useInCorso()
  async function rimuovi(id: string) {
    const p = trip.travelers.find((x) => x.id === id)
    if (!p) return
    const ok = await ask({
      title: tt('Togliere {name} dal viaggio?', { name: p.name }),
      message: p.userId ? tt('Perde l’accesso al viaggio. Le spese già divise con lei o con lui restano nei conti.') : tt('Non è più tra i viaggiatori. Le spese già divise con lei o con lui restano nei conti.'),
      confirm: tt('Rimuovi dal viaggio'),
      cancel: tt('Tieni la persona'),
      destructive: true,
    })
    if (!ok) return
    const m = await faiOcc(`rimuovi:${p.id}`, () => t.removeMember(trip.id, p.userId, p.id))
    showToast(m ?? tt('{name} non è più nel viaggio', { name: p.name }))
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
    const ok = await ask({ title: tt('Rendere {nome} partecipante?', { nome }), message: tt('Entra nel viaggio come viaggiatore: vede e modifica tutto, anche spese e checklist.'), confirm: tt('Rendi partecipante'), cancel: tt('Lascia visualizzatore'), destructive: false })
    if (!ok) return
    const m = await faiOcc(`promuovi:${userId}`, () => t.promoteViewer(trip.id, userId))
    showToast(m ?? tt('{nome} ora è un partecipante', { nome }))
  }

  async function togliVisualizzatore(userId: string, nome: string) {
    const ok = await ask({ title: tt('Togliere {nome}?', { nome }), message: tt('Non vede più il viaggio.'), confirm: tt('Togli dal viaggio'), cancel: tt('Lascialo'), destructive: true })
    if (!ok) return
    const m = await faiOcc(`togli:${userId}`, () => t.removeViewer(trip.id, userId))
    showToast(m ?? tt('{nome} non vede più il viaggio', { nome }))
  }

  async function annulla(id: string, mail: string) {
    const m = await faiOcc(`invito:${id}`, () => t.cancelInvite(id))
    showToast(m ?? tt('Invito a {mail} annullato', { mail }))
  }

  return (
    <Schermata
      bar={<BarraIndietro title={tt('Viaggiatori')} back="/altro" />}
      fab={puoiInvitare ? { label: tt('Persona'), aria: tt('Invita una persona'), onPress: () => setInvita(true) } : null}
      overlay={
        <>
          <Foglio
            open={invita}
            title={tt('Invita una persona')}
            onClose={() => (setInvita(false), setError(null))}
            footer={
              <Pulsante isLoading={busy} onPress={() => void invia()}>
                {tt('Invia l’invito')}
              </Pulsante>
            }
          >
            <div style={{ display: 'grid', gap: 16 }}>
              <Campo label={tt('Email')} type="email" inputMode="email" icon="mail" value={email} onChange={(v) => (setEmail(v), setError(null))} error={error ?? undefined} placeholder={tt('nome@esempio.it')} autoFocus />
              {creatore && conVisualizzatori ? (
                <Segmenti label={tt('Come entra')} value={ruolo} options={[{ value: 'editor', label: tt('Partecipante') }, { value: 'viewer', label: tt('Visualizzatore') }]} onChange={setRuolo} />
              ) : null}
              <p className="fa-m" style={{ margin: 0 }}>
                {tt('{v0}{v1}L’invito vale 7 giorni. La persona lo trova dentro l’app, in Viaggi, appena entra con questo indirizzo: non mandiamo email.', { v0: ruoloInvito === 'viewer'
                  ? tt('Chi accetta vede oggi, i giorni, alloggi, voli e trasporti, ma non li modifica. Non vede spese, budget, luoghi, prenotazioni, documenti e checklist, e non entra nei conti.')
                  : tt('Chi accetta entra come partecipante e può modificare il viaggio.'), v1: ' ' })}
              </p>
            </div>
          </Foglio>
          <Foglio open={collega !== null} title={tt('Collega a un account')} onClose={() => setCollega(null)}>
            <div className="legacy">
              {collega ? <LinkAccount onSubmit={(mail) => t.linkTraveler(collega, mail)} onDone={() => setCollega(null)} /> : null}
            </div>
          </Foglio>
          <Foglio
            open={rinomina !== null}
            title={tt('Nome della persona')}
            onClose={() => setRinomina(null)}
            footer={
              <Pulsante isDisabled={!rinomina?.nome.trim()} onPress={() => void salvaNome()}>
                {tt('Salva il nome')}
              </Pulsante>
            }
          >
            {rinomina ? <Campo label={tt('Nome')} value={rinomina.nome} onChange={(v) => setRinomina({ ...rinomina, nome: v })} maxLength={40} autoFocus /> : null}
          </Foglio>
          {confirmNode}
        </>
      }
    >
      <Affianca>
        <Colonna lato="sinistra">
      {lettura ? (
        <Banner tone="az" icon="info">{tt('Vedi questo viaggio come visualizzatore: puoi seguirlo, ma non modificarlo.')}</Banner>
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
              title={`${p.name}${sono ? tt(' (tu)') : ''}`}
              sub={p.email ?? (p.userId ? undefined : tt('Senza account · da collegare'))}
              open={open.isOpen(p.id)}
              onToggle={() => open.toggle(p.id)}
            >
              <KV icon="user" title={ruoloTesto(p)} sub={p.role === 'owner' ? tt('Ha creato il viaggio: invita e toglie le persone, elimina il viaggio') : tt('Può modificare il viaggio')} />
              {!lettura && (creatore || sono) ? (
                <Azioni>
                  <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={() => setRinomina({ id: p.id, nome: p.name })}>
                    {tt('Cambia nome')}
                  </Pulsante>
                </Azioni>
              ) : null}
              {creatore && !p.userId ? (
                <Azioni>
                  <Pulsante size="sm" color="secondary" iconLeading="link" onPress={() => setCollega(p.id)}>
                    {tt('Collega a un account')}
                  </Pulsante>
                </Azioni>
              ) : null}
              {puoiRimuovere ? (
                <Azioni>
                  <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" isLoading={occ === `rimuovi:${p.id}`} onPress={() => void rimuovi(p.id)}>
                    {tt('Rimuovi dal viaggio')}
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
          <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>{tt('Visualizzatori')}</h2>
          <div className="fa-list">
            {trip.viewers.map((v) => {
              const nome = v.email ? v.email.split('@')[0] : tt('Visualizzatore')
              const io = v.userId === uid
              return (
                <RigaApribile
                  key={v.userId}
                  className="invito"
                  icon={<Sv name="eye" size={22} />}
                  title={`${v.email ?? tt('Visualizzatore')}${io ? tt(' (tu)') : ''}`}
                  sub={tt('Vede il viaggio, non lo modifica')}
                  open={open.isOpen(`v:${v.userId}`)}
                  onToggle={() => open.toggle(`v:${v.userId}`)}
                >
                  <KV icon="user" title={tt('Visualizzatore')} sub={tt('Non è tra i viaggiatori: niente spese, checklist, luoghi, prenotazioni e documenti')} />
                  {lettura ? null : (
                    <Azioni>
                      <Pulsante size="sm" color="secondary" iconLeading="user" isLoading={occ === `promuovi:${v.userId}`} onPress={() => void promuovi(v.userId, nome)}>
                        {tt('Rendi partecipante')}
                      </Pulsante>
                      <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" isLoading={occ === `togli:${v.userId}`} onPress={() => void togliVisualizzatore(v.userId, nome)}>
                        {tt('Togli')}
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
          <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>{tt('Inviti')}</h2>
          <div className="fa-list">
            {inviti.map((i) => (
              <RigaApribile
                key={i.id}
                className="invito"
                icon={<Sv name="mail" size={22} />}
                title={i.email}
                // lo stato sta nella riga sotto, così l'email ha tutta la larghezza per stare su una riga
                sub={
                  <span className="inv-sub">
                    <Pillola tone={TONO[i.stato]}>{STATO_INVITO[i.stato]}</Pillola>
                    {[i.role === 'viewer' ? tt('Visualizzatore') : null, i.stato === 'inviato' ? scadenzaTesto(i.expiresAt) : null].filter(Boolean).join(' · ')}
                  </span>
                }
                open={open.isOpen(i.id)}
                onToggle={() => open.toggle(i.id)}
              >
                <KV icon="info" title={i.stato === 'inviato' ? tt('Aspetta la risposta') : i.stato === 'rifiutato' ? tt('Ha rifiutato l’invito') : tt('L’invito è scaduto')} sub={i.stato === 'inviato' ? tt('La persona deve accettare per vedere il viaggio') : creatore ? tt('Puoi invitarla di nuovo') : undefined} />
                {creatore || (partecipante && i.role === 'viewer') ? (
                  <Azioni>
                    <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" isLoading={occ === `invito:${i.id}`} onPress={() => void annulla(i.id, i.email)}>
                      {i.stato === 'inviato' ? tt('Annulla l’invito') : tt('Togli dall’elenco')}
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
