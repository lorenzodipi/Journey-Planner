// Accesso (mock Fa-01, Fa-02, #48): «Bentornato», email e password, errore, caricamento e offline. Senza registrazione né recupero password.
import { useEffect, useRef, useState } from 'react'
import { erroreEmail } from '../lib/accesso'
import { useAuth } from '../lib/auth'
import { chiediPasswordSalvata, proponiSalvaPassword, puoSalvarePassword } from '../lib/salvaPassword'
import { useOnline } from '../state/online'
import { ART } from '../ui/art'
import { Banner, Campo, PulsanteIcona, Pulsante } from '../faraway/base'
import { Affianca, Colonna, Schermata } from '../faraway/shell'
import { t } from '../i18n'

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

  async function accedi(mail: string, pw: string, salva: boolean) {
    setBusy(true)
    setError(null)
    const message = await auth.signIn(mail, pw)
    if (message) setError(message)
    // app Android: il riquadro «Salvare la password?» non compare da solo nella WebView
    else if (salva) void proponiSalvaPassword(mail.trim(), pw)
    setBusy(false)
  }

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (busy || !online) return
    setToccata(true)
    if (erroreEmail(email)) return
    await accedi(email, password, true)
  }

  // app Android: il suggerimento della tastiera non propone le password salvate (nella WebView i campi sono di
  // «localhost»), quindi si apre il riquadro di sistema con quelle dell'app; scelta una, si entra subito
  async function usaSalvata() {
    const c = await chiediPasswordSalvata()
    if (!c) return
    setEmail(c.email)
    setPassword(c.password)
    if (online) await accedi(c.email, c.password, false)
  }
  const chiesta = useRef(false)
  useEffect(() => {
    if (chiesta.current || !puoSalvarePassword()) return
    chiesta.current = true
    void usaSalvata()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Schermata tabs={false} rete={false} mainStyle={{ paddingTop: 56 }}>
      <form onSubmit={onSubmit} noValidate data-invio style={{ display: 'grid', gap: 24 }}>
        {/* pieghevole aperto: a sinistra marchio e benvenuto, a destra il modulo; sul telefono tutto in colonna come prima */}
        <Affianca>
          <Colonna lato="sinistra">
            <div style={{ display: 'grid', gap: 8 }}>
              <img className="logo lt" src={ART.lockup} alt={t('Faraway')} width="232" height="58" />
              <img className="logo dk" src={ART.lockupReverse} alt={t('Faraway')} width="232" height="58" />
              <h1 className="fa-h2" style={{ margin: '32px 0 0' }}>{t('Bentornato')}</h1>
              <p className="fa-lead" style={{ margin: 0, color: 'var(--ink-muted)' }}>{t('Accedi per ritrovare i tuoi viaggi.')}</p>
            </div>
          </Colonna>
          <Colonna lato="destra">
            <div style={{ display: 'grid', gap: 24 }}>
              {error ? (
                <Banner tone="cor" icon="err">
                  {error}
                </Banner>
              ) : null}
              {!online ? (
                <Banner tone="az" icon="wifi">
                  {t('Sei offline: per entrare serve la rete.')}
                </Banner>
              ) : null}

              <div style={{ display: 'grid', gap: 16 }}>
                <Campo
                  label={t('Email')}
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder={t('nome@esempio.it')}
                  value={email}
                  onChange={(v) => (setEmail(v), setError(null))}
                  error={erroreMail}
                  onBlur={() => email && setToccata(true)}
                />
                <Campo
                  label={t('Password')}
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  hint="Almeno 8 caratteri"
                  value={password}
                  onChange={(v) => (setPassword(v), setError(null))}
                  trailing={<PulsanteIcona icon={show ? 'eye' : 'eyeoff'} label={show ? t('Nascondi la password') : t('Mostra la password')} pressed={show} onPress={() => setShow(!show)} />}
                />
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <Pulsante type="submit" isLoading={busy} isDisabled={!online || !email || !password}>
                  {t('Accedi')}
                </Pulsante>
                {puoSalvarePassword() ? (
                  <Pulsante color="secondary" iconLeading="lock" onPress={() => void usaSalvata()} isDisabled={busy}>
                    {t('Usa una password salvata')}
                  </Pulsante>
                ) : null}
              </div>
            </div>
          </Colonna>
        </Affianca>
      </form>
    </Schermata>
  )
}
