// Altro (mock Fa-36, #42): «Viaggio attuale» con il simbolo, account, righe del viaggio con riepiloghi calcolati e sezione Faraway.
import { useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../../lib/auth'
import { loadSnapshot } from '../../lib/cache'
import { cittaDelViaggio, periodo, personeText, riepilogoAlloggi, riepilogoBudget, riepilogoCambio, riepilogoChecklist, riepilogoPrenotazioni, riepilogoTrasportiAltro, riepilogoVoli, rigaBudgetValute, viaggiText } from '../../lib/altro'
import { riassunto } from '../../lib/spese'
import { discOf, initials, useMe } from '../../state/me'
import { useTrip, useTrips } from '../../state/trip'
import { FxForm } from '../../ui/FxForm'
import { Avatar, Avatars, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Simbolo } from '../../faraway/Home'
import { Riga } from '../../faraway/Righe'
import { BarraGrande, Schermata } from '../../faraway/shell'
import { ViaggioSheet } from '../viaggio/ViaggioSheet'

export function AltroPage() {
  const trip = useTrip()
  const t = useTrips()
  const auth = useAuth()
  const me = useMe(trip)
  const [, navigate] = useLocation()
  const [edit, setEdit] = useState(false)
  const [fx, setFx] = useState(false)
  const r = riassunto(trip, me?.id)
  const saved = loadSnapshot()?.savedAt
  const savedTime = saved ? new Date(saved).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null
  const email = auth.session?.user.email ?? ''
  const nome = me?.name || (email ? email.split('@')[0].replace(/^./, (c) => c.toUpperCase()) : 'Anteprima demo')
  const owner = trip.myRole === undefined || trip.myRole === 'owner'
  const citta = cittaDelViaggio(trip)
  const people = trip.travelers.map((p) => ({ initials: initials(p.name), n: discOf(trip, p.id) }))

  const righe: { icon: string; title: string; sub: string; to?: string; onPress?: () => void }[] = [
    { icon: 'i-sez-bed', title: 'Alloggi', sub: riepilogoAlloggi(trip), to: '/altro/alloggi' },
    { icon: 'i-tra-plane', title: 'Voli', sub: riepilogoVoli(trip), to: '/altro/voli' },
    { icon: 'i-tra-train', title: 'Trasporti', sub: riepilogoTrasportiAltro(trip), to: '/altro/trasporti' },
    { icon: 'i-sez-ticket', title: 'Prenotazioni', sub: riepilogoPrenotazioni(trip), to: '/altro/prenotazioni' },
    { icon: 'i-con-organizzazione', title: 'Checklist', sub: riepilogoChecklist(trip), to: '/altro/checklist' },
    { icon: 'i-con-spese', title: 'Budget', sub: riepilogoBudget(r.speso, r.limit, trip.baseCurrency), to: '/spese/budget' },
    { icon: 'i-azi-swap', title: 'Cambio valuta', sub: riepilogoCambio(trip), onPress: () => setFx(true) },
    { icon: 'i-sez-persone', title: 'Viaggiatori', sub: personeText(trip.travelers.length), to: '/altro/viaggiatori' },
  ]

  return (
    <Schermata
      bar={<BarraGrande title="Altro" sub={savedTime ? `Aggiornato alle ${savedTime}` : auth.status === 'demo' ? 'Anteprima con dati fittizi' : undefined} />}
      overlay={
        <>
          {edit ? <ViaggioSheet key={trip.id} trip={trip} open onClose={() => setEdit(false)} /> : null}
          {fx ? (
            <Foglio open title="Cambio delle valute" onClose={() => setFx(false)}>
              <div className="legacy">
                <FxForm
                  trip={trip}
                  onSubmit={(rate, extra) => (Object.keys(extra).length === 0 && !trip.fxRates ? t.setFxRate(trip.id, rate) : t.setFxRates(trip.id, rate, extra))}
                  onDone={() => setFx(false)}
                />
              </div>
            </Foglio>
          ) : null}
        </>
      }
    >
      <section aria-label="Viaggio attuale" style={{ position: 'relative', display: 'grid', gap: 6, padding: 20, borderRadius: 'var(--radius-xl)', background: 'var(--tinta-azzurro)', color: 'var(--on-tinta)', border: '1px solid var(--bordo-azzurro)' }}>
        <Simbolo style={{ position: 'absolute', right: 18, top: 16, width: 46, height: 54 }} />
        <p className="fa-m" style={{ margin: 0, color: 'var(--on-tinta-muted)' }}>Viaggio attuale</p>
        <h2 style={{ margin: 0, paddingRight: 56, font: '500 32px/36px var(--font-display)' }}>{trip.title}</h2>
        <p style={{ margin: 0, font: '600 15px/22px var(--font-sans)' }}>{periodo(trip)}</p>
        {citta ? <p style={{ margin: 0, font: '400 14px/20px var(--font-sans)', color: 'var(--on-tinta-muted)' }}>{citta}</p> : null}
        <p style={{ margin: 0, font: '400 14px/20px var(--font-sans)', color: 'var(--on-tinta-muted)' }}>{rigaBudgetValute(trip)}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Avatars people={people.slice(0, 4)} />
          <span style={{ font: '600 14px/20px var(--font-sans)' }}>{personeText(trip.travelers.length)}</span>
        </div>
        {owner ? (
          <div style={{ marginTop: 10 }}>
            <Pulsante color="secondary" iconLeading="pencil" onPress={() => setEdit(true)}>
              Modifica dati del viaggio
            </Pulsante>
          </div>
        ) : null}
      </section>

      <section className="fa-list" aria-label="Account">
        <Riga icon={<Avatar initials={initials(nome)} n={me ? discOf(trip, me.id) : 1} large />} title={nome} sub="Account e profilo" onPress={() => navigate('/altro/account')} />
      </section>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Il viaggio</h2>
      <div className="fa-list">
        {righe.map((x) => (
          <Riga key={x.title} icon={x.icon} title={x.title} sub={x.sub} onPress={() => (x.to ? navigate(x.to) : x.onPress?.())} />
        ))}
      </div>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Faraway</h2>
      <div className="fa-list">
        <Riga icon="i-tra-plane" title="Tutti i viaggi" sub={viaggiText(t.trips.length)} onPress={() => navigate('/viaggi')} />
        <Riga icon="i-azi-settings" title="Impostazioni" sub="Aspetto, notifiche e lingua" onPress={() => navigate('/altro/impostazioni')} />
        <Riga icon="i-sez-cloud" title="Dati sul telefono" sub={t.pending > 0 ? `${t.pending === 1 ? '1 modifica' : `${t.pending} modifiche`} in coda` : savedTime ? `Aggiornati alle ${savedTime}` : 'Nessuna copia salvata'} onPress={() => navigate('/altro/dati')} />
      </div>
    </Schermata>
  )
}
