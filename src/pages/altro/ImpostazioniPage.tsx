// Impostazioni (mock Fa-46, #45): aspetto, notifiche, lingua, dati sul telefono e versione.
import { NOTIFICHE_TESTI, LINGUE, useNotifichePrefs } from '../../lib/prefs'
import { useFormati } from '../../lib/formati'
import { useThemePref, type ThemePref } from '../../lib/theme'
import { Chip, Interruttore, Segmenti } from '../../faraway/base'
import { MARGINI_RAPIDI } from '../../lib/fattibilita'
import { useTrip, useTrips } from '../../state/trip'
import { Sv } from '../../faraway/icons'
import { Riga } from '../../faraway/Righe'
import { Affianca, BarraIndietro, Schermata } from '../../faraway/shell'
import { attivaNotifica, statoPermesso } from '../../lib/notificheDevice'
import { useConferma } from '../../faraway/Foglio'
import { showToast } from '../../state/toast'
import { SezioniDati } from './DatiTelefono'
import { useLocation } from 'wouter'

const TEMI: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Chiaro' },
  { value: 'system', label: 'Automatico' },
  { value: 'dark', label: 'Scuro' },
]

export function ImpostazioniPage() {
  const trip = useTrip()
  const trips = useTrips()
  const margine = trip.defaultMarginMin ?? 0
  async function setMargine(min: number) {
    const m = await trips.setDayPlan(trip.id, trip.days[0]?.id ?? '', { tripMarginMin: min })
    showToast(m ?? (min === 0 ? 'Margine tolto' : `Margine tra tappe: ${min} min`))
  }
  const [tema, setTema] = useThemePref()
  const [fmt, setFmt] = useFormati()
  const [notif, setNotif] = useNotifichePrefs()
  const build = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : ''
  const lingua = LINGUE[0]
  const [, navigate] = useLocation()
  const [ask, confirmNode] = useConferma()

  async function cambia(tipo: (typeof NOTIFICHE_TESTI)[number]['tipo'], on: boolean) {
    if (!on) return setNotif(tipo, false)
    // il permesso si chiede solo la prima volta, dopo aver spiegato perché
    if ((await statoPermesso()) === 'prompt') {
      const ok = await ask({ title: 'Vuoi ricevere gli avvisi?', message: 'Per avvisarti prima di una tappa o quando piove, il telefono ti chiede il permesso di mostrare le notifiche. Gli avvisi restano su questo telefono.', confirm: 'Continua', cancel: 'Non ora', destructive: false })
      if (!ok) return
    }
    const r = await attivaNotifica()
    if (r.ok) setNotif(tipo, true)
    else showToast(r.motivo)
  }

  return (
    <Schermata bar={<BarraIndietro title="Impostazioni" back="/altro" />} overlay={confirmNode}>
      <Affianca pesi={[14, 12, 6, 14]}>
        <>
      <h2 className="fa-h3" style={{ margin: 0 }}>Aspetto</h2>
      <Segmenti label="Aspetto dell'app" value={tema} options={TEMI} onChange={setTema} />
      <p className="fa-m" style={{ margin: 0 }}>Con Automatico segue il tema del telefono.</p>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Ora e unità</h2>
      <Segmenti label="Formato dell'ora" value={String(fmt.ore)} options={[{ value: '24', label: '24 ore' }, { value: '12', label: '12 ore (AM/PM)' }]} onChange={(v) => setFmt({ ore: v === '12' ? 12 : 24 })} />
      <Segmenti label="Distanze" value={fmt.distanza} options={[{ value: 'km', label: 'Chilometri' }, { value: 'mi', label: 'Miglia' }]} onChange={(v) => setFmt({ distanza: v })} />
      <Segmenti label="Temperatura" value={fmt.temperatura} options={[{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }]} onChange={(v) => setFmt({ temperatura: v })} />
      <p className="fa-m" style={{ margin: 0 }}>Valgono per tutta l’app, su questo telefono.</p>
      <div className="fa-fld" role="group" aria-label="Margine tra tappe">
        Margine tra tappe
        <div className="fa-chips">
          {[0, ...MARGINI_RAPIDI].map((m) => (
            <Chip key={m} on={margine === m} onPress={() => void setMargine(m)}>{m === 0 ? 'Nessuno' : `${m} min`}</Chip>
          ))}
        </div>
        <span className="fa-help">Per tutto il viaggio: si somma agli spostamenti quando l’app controlla che gli orari reggano.</span>
      </div>
        </>
        <>
      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Notifiche</h2>
      <div className="fa-card xl pad" style={{ display: 'grid', gap: 16 }}>
        {NOTIFICHE_TESTI.map((n) => (
          <Interruttore key={n.tipo} label={n.titolo} hint={n.testo} isSelected={notif[n.tipo]} onChange={(on) => void cambia(n.tipo, on)} />
        ))}
      </div>
      <p className="fa-m" style={{ margin: 0 }}>Gli avvisi restano su questo telefono: non servono server né email.</p>
        </>
        <>
      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Lingua</h2>
      <div className="fa-list">
        <Riga icon={<Sv name="globe" size={22} />} title={lingua.nome} sub={LINGUE.length > 1 ? 'Cambia lingua' : 'Altre lingue arriveranno'} chevron={LINGUE.length > 1} />
      </div>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Cronologia</h2>
      <div className="fa-list">
        <Riga icon={<Sv name="clock" size={22} />} title="Registro modifiche" sub="Chi ha cambiato cosa" onPress={() => navigate('/altro/registro')} />
      </div>
        </>
        <SezioniDati ask={ask} />
      </Affianca>

      <p className="fa-c" style={{ margin: '8px 0 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
        Faraway 1.0{build ? ` · ${new Date(Date.parse(build)).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
      </p>
    </Schermata>
  )
}
