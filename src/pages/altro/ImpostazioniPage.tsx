// Impostazioni (mock Fa-46, #45): aspetto, notifiche, lingua, dati sul telefono e versione.
import { NOTIFICHE_TESTI, useNotifichePrefs } from '../../lib/prefs'
import { useFormati } from '../../lib/formati'
import { useThemePref, type ThemePref } from '../../lib/theme'
import { Chip, Info, Interruttore, Segmenti } from '../../faraway/base'
import { MARGINI_RAPIDI } from '../../lib/fattibilita'
import { useTrip, useTrips } from '../../state/trip'
import { Sv } from '../../faraway/icons'
import { Riga } from '../../faraway/Righe'
import { Affianca, BarraIndietro, Schermata } from '../../faraway/shell'
import { attivaNotifica, statoPermesso } from '../../lib/notificheDevice'
import { useConferma } from '../../faraway/Foglio'
import { showToast } from '../../state/toast'
import { SezioniDati } from './DatiTelefono'
import { SezioneIconaApp, useIconaApp } from './IconaApp'
import { useLocation } from 'wouter'
import { soloLettura } from '../../lib/ruolo'
import { cambiaLingua, LINGUE, LOCALE, risolviLingua, type SceltaLingua, sceltaLingua, t } from '../../i18n'
import { CampoScelta } from '../../faraway/CampoScelta'

const TEMI: { value: ThemePref; label: string }[] = [
  { value: 'light', label: t('Chiaro') },
  { value: 'system', label: t('Automatico') },
  { value: 'dark', label: t('Scuro') },
]

export function ImpostazioniPage() {
  const trip = useTrip()
  const trips = useTrips()
  const margine = trip.defaultMarginMin ?? 0
  async function setMargine(min: number) {
    const m = await trips.setDayPlan(trip.id, trip.days[0]?.id ?? '', { tripMarginMin: min })
    showToast(m ?? (min === 0 ? t('Margine tolto') : t('Margine tra tappe: {min} min', { min })))
  }
  const [tema, setTema] = useThemePref()
  const [fmt, setFmt] = useFormati()
  const [notif, setNotif] = useNotifichePrefs()
  const build = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : ''
  const scelta = sceltaLingua()
  // «Come il telefono» dice anche quale lingua ne viene fuori
  const delTelefono = LINGUE.find((l) => l.code === risolviLingua('auto', navigator.languages?.length ? navigator.languages : [navigator.language]).lingua)?.nome ?? ''
  const [, navigate] = useLocation()
  const icona = useIconaApp()
  const [ask, confirmNode] = useConferma()

  async function cambia(tipo: (typeof NOTIFICHE_TESTI)[number]['tipo'], on: boolean) {
    if (!on) return setNotif(tipo, false)
    // il permesso si chiede solo la prima volta, dopo aver spiegato perché
    if ((await statoPermesso()) === 'prompt') {
      const ok = await ask({ title: t('Vuoi ricevere gli avvisi?'), message: t('Per avvisarti prima di una tappa o quando piove, il telefono ti chiede il permesso di mostrare le notifiche. Gli avvisi restano su questo telefono.'), confirm: t('Continua'), cancel: t('Non ora'), destructive: false })
      if (!ok) return
    }
    const r = await attivaNotifica()
    if (r.ok) setNotif(tipo, true)
    else showToast(r.motivo)
  }

  return (
    <Schermata bar={<BarraIndietro title={t('Impostazioni')} back="/altro" />} overlay={confirmNode}>
      <Affianca pesi={[14, 12, icona.disponibile ? 14 : 6, 14]}>
        <>
      <h2 className="fa-h3" style={{ margin: 0 }}>{t('Aspetto')}</h2>
      <Segmenti label={t('Aspetto dell\'app')} value={tema} options={TEMI} onChange={setTema} />
      <p className="fa-m" style={{ margin: 0 }}>{t('Con Automatico segue il tema del telefono.')}</p>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>{t('Ora e unità')}</h2>
      <Segmenti label={t('Formato dell\'ora')} value={String(fmt.ore)} options={[{ value: '24', label: t('24 ore') }, { value: '12', label: t('12 ore (AM/PM)') }]} onChange={(v) => setFmt({ ore: v === '12' ? 12 : 24 })} />
      <Segmenti label={t('Distanze')} value={fmt.distanza} options={[{ value: 'km', label: t('Chilometri') }, { value: 'mi', label: t('Miglia') }]} onChange={(v) => setFmt({ distanza: v })} />
      <Segmenti label={t('Temperatura')} value={fmt.temperatura} options={[{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }]} onChange={(v) => setFmt({ temperatura: v })} />
      <p className="fa-m" style={{ margin: 0 }}>{t('Valgono per tutta l’app, su questo telefono.')}</p>
      {soloLettura(trip) ? null : (
      <div className="fa-fld" role="group" aria-label={t('Margine tra tappe')}>
        <div className="fa-tinfo">
          <span>{t('Margine tra tappe')}</span>
          <Info label={t('Che cos’è il margine tra tappe')}>
            <p>{t('Sono i minuti di scorta che l’app aggiunge al tempo per spostarsi da una tappa alla successiva quando controlla che gli orari di un giorno reggano.')}</p>
            <p>{t('Per esempio, con 15 min e 20 minuti di strada, tra la fine di una tappa e l’inizio della prossima ne devono restare almeno 35; se sono meno, il giorno lo segnala.')}</p>
            <p>{t('Vale per tutti i giorni del viaggio.')}</p>
          </Info>
        </div>
        <div className="fa-chips">
          {[0, ...MARGINI_RAPIDI].map((m) => (
            <Chip key={m} on={margine === m} onPress={() => void setMargine(m)}>{m === 0 ? t('Nessuno') : `${m} min`}</Chip>
          ))}
        </div>
        <span className="fa-help">{t('Per tutto il viaggio: si somma agli spostamenti quando l’app controlla che gli orari reggano.')}</span>
      </div>
      )}
        </>
        <>
      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>{t('Notifiche')}</h2>
      <div className="fa-card xl pad" style={{ display: 'grid', gap: 16 }}>
        {NOTIFICHE_TESTI.filter((n) => !soloLettura(trip) || (n.tipo !== 'checklist' && n.tipo !== 'budget')).map((n) => (
          <Interruttore key={n.tipo} label={n.titolo} hint={n.testo} isSelected={notif[n.tipo]} onChange={(on) => void cambia(n.tipo, on)} />
        ))}
      </div>
      <p className="fa-m" style={{ margin: 0 }}>{t('Gli avvisi restano su questo telefono: non servono server né email.')}</p>
        </>
        <>
      {icona.disponibile ? <SezioneIconaApp corrente={icona.corrente} scegli={(id) => void icona.scegli(id)} /> : null}

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>{t('Lingua')}</h2>
      <CampoScelta
        label={t('Lingua dell’app')}
        value={scelta}
        onChange={(v) => cambiaLingua(v as SceltaLingua)}
        options={[{ value: 'auto', label: t('Come il telefono ({lingua})', { lingua: delTelefono }) }, ...LINGUE.map((l) => ({ value: l.code, label: l.nome }))]}
      />
      <p className="fa-m" style={{ margin: 0 }}>{t('Cambiando lingua l’app si riapre. I nomi scritti da voi, come viaggi, luoghi e categorie, restano come li avete scritti.')}</p>

      {soloLettura(trip) ? null : (
        <>
          <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>{t('Cronologia')}</h2>
          <div className="fa-list">
            <Riga icon={<Sv name="clock" size={22} />} title={t('Registro modifiche')} sub={t('Chi ha cambiato cosa')} onPress={() => navigate('/altro/registro')} />
          </div>
        </>
      )}
        </>
        <SezioniDati ask={ask} />
      </Affianca>

      <p className="fa-c" style={{ margin: '8px 0 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
        {t('Faraway 1.0{v0}', { v0: build ? ` · ${new Date(Date.parse(build)).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })}` : '' })}
      </p>
    </Schermata>
  )
}
