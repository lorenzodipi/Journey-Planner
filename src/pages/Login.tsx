// Accesso (mock Fa-01, Fa-02, #48): «Bentornato», email e password, errore, caricamento e offline. Senza registrazione né recupero password.
import { useState } from 'react'
import { erroreEmail } from '../lib/accesso'
import { useAuth } from '../lib/auth'
import { useOnline } from '../state/online'
import { ART } from '../ui/art'
import { Banner, Campo, PulsanteIcona, Pulsante } from '../faraway/base'
import { Schermata } from '../faraway/shell'

export function Login() {
  const auth = useAuth()
  const online = useOnline()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [toccata, setToccata] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const erroreMail = toccata ? erroreEmail(email) : null

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (busy || !online) return
    setToccata(true)
    if (erroreEmail(email)) return
    setBusy(true)
    setError(null)
    const message = await auth.signIn(email, password)
    if (message) setError(message)
    setBusy(false)
  }

  return (
    <Schermata tabs={false} rete={false} mainStyle={{ paddingTop: 56 }}>
      <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <img className="logo lt" src={ART.lockup} alt="Faraway" width="232" height="58" />
          <img className="logo dk" src={ART.lockupReverse} alt="Faraway" width="232" height="58" />
          <h1 className="fa-h2" style={{ margin: '32px 0 0' }}>Bentornato</h1>
          <p className="fa-lead" style={{ margin: 0, color: 'var(--ink-muted)' }}>Accedi per ritrovare i tuoi viaggi.</p>
        </div>

        {error ? (
          <Banner tone="cor" icon="err">
            {error}
          </Banner>
        ) : null}
        {!online ? (
          <Banner tone="az" icon="wifi">
            Sei offline: per entrare serve la rete.
          </Banner>
        ) : null}

        <div style={{ display: 'grid', gap: 12 }}>
          <Campo
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="nome@esempio.it"
            value={email}
            onChange={(v) => (setEmail(v), setError(null))}
            error={erroreMail}
            onBlur={() => email && setToccata(true)}
          />
          <Campo
            label="Password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            hint="Almeno 8 caratteri"
            value={password}
            onChange={(v) => (setPassword(v), setError(null))}
            trailing={<PulsanteIcona icon="eye" label={show ? 'Nascondi la password' : 'Mostra la password'} pressed={show} onPress={() => setShow(!show)} />}
          />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <Pulsante type="submit" isLoading={busy} isDisabled={!online || !email || !password}>
            Accedi
          </Pulsante>
          {busy ? (
            <p className="fa-m" role="status" style={{ margin: 0, textAlign: 'center' }}>
              Accesso in corso. Ci mette qualche secondo.
            </p>
          ) : null}
        </div>
      </form>
    </Schermata>
  )
}
