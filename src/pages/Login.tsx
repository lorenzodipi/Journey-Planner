import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { ART } from '../ui/art'
import { FormError } from '../ui/Field'
import '../fw-altro.css'

export function Login() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await auth.signIn(email, password)
    if (message) setError(message)
    setBusy(false)
  }

  return (
    <main className="screen">
      <form onSubmit={onSubmit} noValidate style={{ display: 'contents' }}>
        <div style={{ paddingTop: '48px' }}>
          <img className="logo lt" src={ART.lockup} alt="Faraway" width="232" height="58" />
          <img className="logo dk" src={ART.lockupReverse} alt="Faraway" width="232" height="58" />
          <h1 className="d-md" style={{ marginTop: '40px' }}>
            Accedi
          </h1>
          <p className="body-lg muted" style={{ marginTop: '8px', fontSize: '18px', lineHeight: '26px', letterSpacing: 0 }}>
            Il tuo viaggio, tappa dopo tappa. Funziona anche senza rete.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label className="fld">
            <div>
              <span className="l">Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                required
                className="v"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />
            </div>
          </label>
          <div className="fld">
            <label style={{ flex: 1, minWidth: 0 }}>
              <span className="l">Password</span>
              <input
                type={(show ? 'text' : 'password') as 'password'}
                autoComplete="current-password"
                required
                className="v"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
            </label>
            <button type="button" className="fld-act" aria-pressed={show} onClick={() => setShow(!show)}>
              {show ? 'Nascondi' : 'Mostra'}
            </button>
          </div>
          <FormError message={error} />
        </div>

        <div className="cta">
          <button type="submit" className="btn block" disabled={busy || !email || !password}>
            {busy ? 'Accesso in corso…' : 'Accedi'}
          </button>
          <p className="cap muted" style={{ textAlign: 'center', marginTop: '12px' }}>
            Le registrazioni sono chiuse: usa l’account che hai ricevuto.
          </p>
        </div>
      </form>
    </main>
  )
}
