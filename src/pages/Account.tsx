import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { loadSnapshot, clearSnapshot } from '../lib/cache'
import { buildExport, downloadJson, exportFileName, serializeExport } from '../lib/exportData'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import { ART } from '../ui/art'
import { ChevronLeftG, ChevronRightG } from '../ui/glyphs'
import { PageHeader } from '../ui/PageHeader'
import { RestoreCard } from '../ui/RestoreCard'
import { Ic } from '../ui/Sprite'
import { useThemePref, type ThemePref } from '../lib/theme'
import { initialOf } from './altroBits'

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
]

/** Aspetto dell'app: segue il telefono o resta sempre chiaro/scuro. Vale solo su questo dispositivo. */
function AppearanceCard() {
  const [pref, setPref] = useThemePref()
  return (
    <section className="card" aria-label="Aspetto" style={{ padding: '20px' }}>
      <h2 className="h-sm">Aspetto</h2>
      <p className="b-sm muted" style={{ marginTop: '4px' }}>
        Tema chiaro o scuro. Con «Sistema» l'app segue le impostazioni del telefono.
      </p>
      <div role="radiogroup" aria-label="Aspetto dell'app" className="chips" style={{ margin: '12px 0 0', padding: 0 }}>
        {THEMES.map((o) => (
          <button type="button" role="radio" aria-checked={pref === o.value} className={`chip${pref === o.value ? ' on' : ''}`} style={{ flex: 1, justifyContent: 'center', height: '44px' }} onClick={() => setPref(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </section>
  )
}

const time = (ms: number) => new Date(ms).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const clock = (ms: number) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

/** Profilo: impostazioni dell'intero account, valgono per tutti i viaggi, non solo per quello attivo. */
export function Account() {
  const t = useTrips()
  const auth = useAuth()
  const [confirm, setConfirm] = useState(false)
  const [restore, setRestore] = useState(false)

  const savedAt = loadSnapshot()?.savedAt
  const build = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : ''
  const email = auth.session?.user.email ?? ''
  const me = t.active?.travelers.find((x) => x.userId && x.userId === auth.session?.user.id)
  const name = me?.name || (email ? email.split('@')[0].replace(/^./, (c) => c.toUpperCase()) : 'Anteprima demo')
  const places = t.trips.reduce((n, x) => n + x.places.length, 0)
  const days = t.trips.reduce((n, x) => n + x.days.length, 0)

  async function exportAll() {
    try {
      await downloadJson(exportFileName(t.trips), serializeExport(buildExport(t.trips)))
      showToast(__NATIVE__ ? 'File pronto: scegli dove salvarlo' : 'File scaricato')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Esportazione non riuscita')
    }
  }

  async function clearLocal() {
    clearSnapshot()
    try {
      localStorage.removeItem('jp.weather.v1')
    } catch {
      // ignorato
    }
    setConfirm(false)
    await t.refresh()
    showToast('Copia locale svuotata e riscaricata')
  }

  return (
    <main className="screen">
      <PageHeader title="Profilo" subtitle="Account e dati, per tutti i viaggi" back={{ href: '/altro', label: 'Altro' }} />

      <section aria-label="Profilo" className="prof">
        <div className="prof-cover">
          <img src={ART.profilo} alt="" />
        </div>
        <span className="prof-av" aria-hidden="true">
          {initialOf(name)}
        </span>
        <h2 className="d-md" style={{ marginTop: '8px' }}>
          {name}
        </h2>
        {email && <p className="b-sm muted">{email}</p>}
      </section>

      <section aria-label="I tuoi numeri" className="pnums">
        <div style={{ background: 'var(--tinta-menta)' }}>
          <b className="num">{t.trips.length}</b>
          <span>{t.trips.length === 1 ? 'Viaggio' : 'Viaggi'}</span>
        </div>
        <div style={{ background: 'var(--tinta-confetto)' }}>
          <b className="num">{places}</b>
          <span>{places === 1 ? 'Luogo' : 'Luoghi'}</span>
        </div>
        <div style={{ background: 'var(--tinta-limone)' }}>
          <b className="num">{days}</b>
          <span>Giorni in viaggio</span>
        </div>
      </section>

      <AppearanceCard />

      <section>
        <h2 className="h-sm" style={{ marginBottom: '8px' }}>
          I tuoi dati
        </h2>
        <div className="rows">
          <button type="button" className="row" style={{ width: '100%', border: 0, background: 'none', textAlign: 'left' }} onClick={() => void exportAll()}>
            <Ic name="i-azi-download" size={44} />
            <span className="grow">
              <span className="tt" style={{ display: 'block' }}>
                {t.trips.length > 1 ? `Esporta tutti i ${t.trips.length} viaggi` : 'Esporta il viaggio'}
              </span>
              <span className="mm">Un solo file con tutto, da conservare</span>
            </span>
            <span className="muted">
              <ChevronRightG size={18} sw={2.2} />
            </span>
          </button>
          <button type="button" className="row" aria-expanded={restore} style={{ width: '100%', border: 0, background: 'none', textAlign: 'left' }} onClick={() => setRestore(!restore)}>
            <Ic name="i-azi-copy" size={44} />
            <span className="grow">
              <span className="tt" style={{ display: 'block' }}>
                Ripristina da file
              </span>
              <span className="mm">Riporta i viaggi da un file esportato</span>
            </span>
            <span className="muted">
              <ChevronRightG size={18} sw={2.2} />
            </span>
          </button>
        </div>
      </section>

      {restore && <RestoreCard />}

      <section>
        <h2 className="h-sm" style={{ marginBottom: '8px' }}>
          Dispositivo
        </h2>
        <div className="rows">
          <div className="row">
            <Ic name="i-sez-cloud" size={44} />
            <span className="grow">
              <span className="tt" style={{ display: 'block' }}>
                Su questo telefono
              </span>
              <span className="mm">
                {savedAt ? `Aggiornato alle ${clock(savedAt)}` : 'Nessuna copia salvata'} · {t.pending === 1 ? '1 modifica in coda' : `${t.pending} modifiche in coda`}
              </span>
              <span className="mm" style={{ display: 'block' }}>
                Versione dell'app: {build ? time(Date.parse(build)) : 'sviluppo'}
              </span>
            </span>
          </div>
        </div>
        {confirm ? (
          <div className="card" style={{ marginTop: '12px', padding: '16px' }}>
            <p className="b-sm muted">
              Cancello la copia salvata sul telefono (dati, meteo, biglietti offline) e la riscarico. Serve la connessione.
              {t.pending > 0 && ' Le modifiche da inviare restano in coda.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <button type="button" className="btn block" onClick={() => void clearLocal()}>
                Sì, scarica di nuovo
              </button>
              <button type="button" className="btn line block" onClick={() => setConfirm(false)}>
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn soft block" style={{ marginTop: '12px' }} onClick={() => setConfirm(true)}>
            Scarica di nuovo i dati
          </button>
        )}
      </section>

      {auth.status === 'signed-in' && (
        <div className="cta" style={{ textAlign: 'center' }}>
          <button type="button" className="btn danger" onClick={() => void auth.signOut()}>
            <ChevronLeftG />
            Esci dall’account
          </button>
        </div>
      )}

      <p className="cap muted" style={{ textAlign: 'center' }}>
        Icone di sezione: Font Awesome Free (CC BY 4.0)
      </p>
    </main>
  )
}
