// Viaggiatori (mock Fa-48, #44, FRD TRIP-004/005/006/013): creatore e partecipanti, inviti per email con stato,
// «Rimuovi dal viaggio» e «Invita una persona» solo per chi ha creato il viaggio.
import { useState } from 'react'
import { erroreInvito, invitiVisibili, riepilogoPartecipanti, ruoloTesto, scadenzaTesto, STATO_INVITO } from '../../lib/inviti'
import { discOf, initials, useMe } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { LinkAccount } from '../../ui/LinkAccount'
import { Avatar, Campo, Pillola, Pulsante } from '../../faraway/base'
import { Foglio, useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { Azioni, KV, RigaApribile, useUnaAperta } from '../../faraway/Righe'
import { BarraIndietro, Schermata } from '../../faraway/shell'

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
  const creatore = trip.myRole === undefined || trip.myRole === 'owner'
  const inviti = invitiVisibili(trip)

  async function invia() {
    const e = erroreInvito(email, trip)
    if (e) return setError(e)
    setBusy(true)
    setError(null)
    const m = await t.inviteByEmail(trip.id, email.trim().toLowerCase())
    setBusy(false)
    if (m) return setError(m)
    setInvita(false)
    setEmail('')
    showToast('Invito inviato: la persona lo trova in Viaggi, in «Inviti ricevuti»')
  }

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
    const m = await t.removeMember(trip.id, p.userId, p.id)
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

  async function annulla(id: string, mail: string) {
    const m = await t.cancelInvite(id)
    showToast(m ?? `Invito a ${mail} annullato`)
  }

  return (
    <Schermata
      bar={<BarraIndietro title="Viaggiatori" back="/altro" />}
      fab={creatore ? { label: 'Persona', aria: 'Invita una persona', onPress: () => setInvita(true) } : null}
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
            <div style={{ display: 'grid', gap: 12 }}>
              <Campo label="Email" type="email" inputMode="email" icon="mail" value={email} onChange={(v) => (setEmail(v), setError(null))} error={error ?? undefined} placeholder="nome@esempio.it" autoFocus />
              <p className="fa-m" style={{ margin: 0 }}>
                Chi accetta entra come partecipante e può modificare il viaggio. L’invito vale 7 giorni. La persona lo trova dentro l’app, in Viaggi, appena entra con questo indirizzo: non mandiamo email.
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
              end={<span className="fa-m">{ruoloTesto(p)}</span>}
              open={open.isOpen(p.id)}
              onToggle={() => open.toggle(p.id)}
            >
              <KV icon="user" title={p.role === 'owner' ? 'Ha creato il viaggio' : 'Può modificare il viaggio'} sub={p.role === 'owner' ? 'Invita e toglie le persone, elimina il viaggio' : undefined} />
              {creatore || sono ? (
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
                  <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={() => void rimuovi(p.id)}>
                    Rimuovi dal viaggio
                  </Pulsante>
                </Azioni>
              ) : null}
            </RigaApribile>
          )
        })}
      </div>

      {inviti.length > 0 ? (
        <>
          <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Inviti</h2>
          <div className="fa-list">
            {inviti.map((i) => (
              <RigaApribile
                key={i.id}
                icon={<Sv name="mail" size={22} />}
                title={i.email}
                sub={i.stato === 'inviato' ? scadenzaTesto(i.expiresAt) : undefined}
                end={<Pillola tone={TONO[i.stato]}>{STATO_INVITO[i.stato]}</Pillola>}
                open={open.isOpen(i.id)}
                onToggle={() => open.toggle(i.id)}
              >
                <KV icon="info" title={i.stato === 'inviato' ? 'Aspetta la risposta' : i.stato === 'rifiutato' ? 'Ha rifiutato l’invito' : 'L’invito è scaduto'} sub={i.stato === 'inviato' ? 'La persona deve accettare per vedere il viaggio' : creatore ? 'Puoi invitarla di nuovo' : undefined} />
                {creatore ? (
                  <Azioni>
                    <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" onPress={() => void annulla(i.id, i.email)}>
                      {i.stato === 'inviato' ? 'Annulla l’invito' : 'Togli dall’elenco'}
                    </Pulsante>
                  </Azioni>
                ) : null}
              </RigaApribile>
            ))}
          </div>
        </>
      ) : null}
    </Schermata>
  )
}
