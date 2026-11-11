// Profilo (mock Fa-47, #45): avatar, tre numeri e distintivi calcolati dai dati. Niente foto né «Ricordi».
import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { showToast } from '../../state/toast'
import { distintivi, numeriProfilo, sottotitoloProfilo } from '../../lib/profilo'
import { discOf, initials, useMe } from '../../state/me'
import { useTrips } from '../../state/trip'
import { Avatar, Barra, Campo, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { BarraIndietro, Schermata } from '../../faraway/shell'

export function ProfiloPage() {
  const t = useTrips()
  const auth = useAuth()
  const trip = t.active
  const me = useMe(trip)
  const email = auth.session?.user.email ?? ''
  const [cambia, setCambia] = useState(false)
  const [bozza, setBozza] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nome = auth.profileName || me?.name || (email ? email.split('@')[0].replace(/^./, (c) => c.toUpperCase()) : 'Anteprima demo')
  const n = numeriProfilo(t.trips)
  const dist = distintivi(n)
  const sub = sottotitoloProfilo(auth.session?.user.created_at, t.trips)

  async function salva(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const err = await auth.setProfileName(bozza)
    setBusy(false)
    if (err) return setErrore(err)
    setCambia(false)
    showToast(bozza.trim() ? 'Nome del profilo salvato' : 'Nome del profilo tolto')
  }

  return (
    <Schermata
      bar={<BarraIndietro title="Profilo" back="/altro" />}
      overlay={
        <Foglio open={cambia} title="Nome del profilo" onClose={() => setCambia(false)}>
          <form onSubmit={salva} noValidate style={{ display: 'grid', gap: 16 }}>
            <p className="fa-m" style={{ margin: 0 }}>È il nome che trovi già scritto quando crei un viaggio. In ogni viaggio puoi cambiarlo.</p>
            <Campo label="Il tuo nome" value={bozza} onChange={setBozza} maxLength={40} autoComplete="off" placeholder="Come vuoi essere chiamato" error={errore} autoFocus />
            <Pulsante type="submit" isLoading={busy}>
              Salva il nome
            </Pulsante>
          </form>
        </Foglio>
      }
    >
      <section style={{ display: 'grid', justifyItems: 'center', gap: 8, textAlign: 'center', padding: '8px 0' }}>
        <Avatar initials={initials(nome)} n={trip && me ? discOf(trip, me.id) : 1} large />
        <h2 className="fa-h2" style={{ margin: 0 }}>{nome}</h2>
        <p className="fa-m" style={{ margin: 0 }}>{sub}</p>
        <Pulsante color="secondary" iconLeading="pencil" onPress={() => (setBozza(auth.profileName || nome), setErrore(null), setCambia(true))}>
          Cambia il nome
        </Pulsante>
        {email ? <p className="fa-c" style={{ margin: 0, color: 'var(--ink-muted)' }}>{email}</p> : null}
      </section>

      <section aria-label="I tuoi numeri" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { v: n.viaggi, l: n.viaggi === 1 ? 'Viaggio' : 'Viaggi', c: 'var(--tinta-acqua)' },
          { v: n.luoghi, l: n.luoghi === 1 ? 'Luogo' : 'Luoghi', c: 'var(--tinta-azzurro)' },
          { v: n.paesi, l: n.paesi === 1 ? 'Paese' : 'Paesi', c: 'var(--tinta-lavanda)' },
        ].map((x) => (
          <div key={x.l} style={{ background: x.c, color: 'var(--on-tinta)', borderRadius: 'var(--radius-lg)', padding: '16px 8px', display: 'grid', justifyItems: 'center' }}>
            <b style={{ font: '500 32px/36px var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{x.v}</b>
            <span style={{ font: '600 13px/18px var(--font-sans)' }}>{x.l}</span>
          </div>
        ))}
      </section>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Distintivi</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {dist.map((d) => (
          <div key={d.id} className="fa-card xl pad" style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 16, alignItems: 'center', opacity: d.preso ? 1 : 0.9 }}>
            <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: d.preso ? 'var(--disco-menta)' : 'var(--surface-high)', color: d.preso ? 'var(--on-bright)' : 'var(--ink-muted)' }}>
              <Sv name={d.preso ? 'star' : 'lock'} size={22} />
            </span>
            <span style={{ display: 'grid', gap: 8 }}>
              <span style={{ font: '600 16px/24px var(--font-sans)' }}>{d.titolo}</span>
              <span className="fa-m">{d.regola}</span>
              {d.preso ? null : <Barra value={d.have} max={d.need} label={`${d.titolo}: ${d.have} su ${d.need}`} />}
              <span className="fa-c" style={{ color: d.preso ? 'var(--success)' : 'var(--ink-muted)', fontWeight: 600 }}>{d.mancano}</span>
            </span>
          </div>
        ))}
      </div>

      {auth.status === 'signed-in' ? (
        <div style={{ marginTop: 8 }}>
          <Pulsante color="tertiary-destructive" iconLeading="out" onPress={() => void auth.signOut()}>
            Esci dall’account
          </Pulsante>
        </div>
      ) : null}
    </Schermata>
  )
}
