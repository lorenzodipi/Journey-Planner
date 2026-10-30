// Impostazioni (mock Fa-46, #45): aspetto, notifiche, lingua, versione ed «Esci dall'account».
import { useAuth } from '../../lib/auth'
import { NOTIFICHE_TESTI, LINGUE, useNotifichePrefs } from '../../lib/prefs'
import { useThemePref, type ThemePref } from '../../lib/theme'
import { Interruttore, Pulsante, Segmenti } from '../../faraway/base'
import { Sv } from '../../faraway/icons'
import { Riga } from '../../faraway/Righe'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { attivaNotifica } from '../../lib/notifiche'
import { showToast } from '../../state/toast'

const TEMI: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Chiaro' },
  { value: 'system', label: 'Automatico' },
  { value: 'dark', label: 'Scuro' },
]

export function ImpostazioniPage() {
  const auth = useAuth()
  const [tema, setTema] = useThemePref()
  const [notif, setNotif] = useNotifichePrefs()
  const build = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : ''
  const lingua = LINGUE[0]

  async function cambia(tipo: (typeof NOTIFICHE_TESTI)[number]['tipo'], on: boolean) {
    if (!on) return setNotif(tipo, false)
    const r = await attivaNotifica()
    if (r.ok) setNotif(tipo, true)
    else showToast(r.motivo)
  }

  return (
    <Schermata bar={<BarraIndietro title="Impostazioni" back="/altro" />}>
      <h2 className="fa-h3" style={{ margin: 0 }}>Aspetto</h2>
      <Segmenti label="Aspetto dell'app" value={tema} options={TEMI} onChange={setTema} />
      <p className="fa-m" style={{ margin: 0 }}>Con Automatico segue il tema del telefono.</p>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Notifiche</h2>
      <div className="fa-card xl pad" style={{ display: 'grid', gap: 12 }}>
        {NOTIFICHE_TESTI.map((n) => (
          <Interruttore key={n.tipo} label={n.titolo} hint={n.testo} isSelected={notif[n.tipo]} onChange={(on) => void cambia(n.tipo, on)} />
        ))}
      </div>
      <p className="fa-m" style={{ margin: 0 }}>Gli avvisi restano su questo telefono: non servono server né email.</p>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Lingua</h2>
      <div className="fa-list">
        <Riga icon={<Sv name="globe" size={22} />} title={lingua.nome} sub={LINGUE.length > 1 ? 'Cambia lingua' : 'Altre lingue arriveranno'} chevron={LINGUE.length > 1} />
      </div>

      {auth.status === 'signed-in' ? (
        <div style={{ marginTop: 8 }}>
          <Pulsante color="tertiary-destructive" iconLeading="out" onPress={() => void auth.signOut()}>
            Esci dall’account
          </Pulsante>
        </div>
      ) : null}
      <p className="fa-c" style={{ margin: '8px 0 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
        Faraway 1.0{build ? ` · ${new Date(Date.parse(build)).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
      </p>
    </Schermata>
  )
}
