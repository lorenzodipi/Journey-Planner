import { useState } from 'preact/hooks'
import { loadSnapshot, clearSnapshot } from '../lib/cache'
import { buildExport, downloadJson, exportFileName, serializeExport } from '../lib/exportData'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import { SecondaryButton } from '../ui/Field'
import { Card, PageHeader } from '../ui/PageHeader'
import { RestoreCard } from '../ui/RestoreCard'
import { useThemePref, type ThemePref } from '../lib/theme'

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
]

/** Aspetto dell'app: segue il telefono o resta sempre chiaro/scuro. Vale solo su questo dispositivo. */
function AppearanceCard() {
  const [pref, setPref] = useThemePref()
  return (
    <Card>
      <h2 class="font-display text-xl">Aspetto</h2>
      <p class="mt-1 text-[13px] leading-snug text-muted">Tema chiaro o scuro. Con «Sistema» l'app segue le impostazioni del telefono.</p>
      <div role="radiogroup" aria-label="Aspetto dell'app" class="mt-3 flex gap-1 rounded-full bg-surface-2 p-1">
        {THEMES.map((o) => (
          <button
            type="button"
            role="radio"
            aria-checked={pref === o.value}
            onClick={() => setPref(o.value)}
            class={`h-11 flex-1 touch-manipulation rounded-full text-sm font-semibold ${pref === o.value ? 'bg-accent text-accent-ink' : 'text-muted'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

const time = (ms: number) =>
  new Date(ms).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Impostazioni dell'intero account: valgono per tutti i viaggi, non solo per quello attivo. */
export function Account() {
  const t = useTrips()
  const [confirm, setConfirm] = useState(false)

  const savedAt = loadSnapshot()?.savedAt
  const build = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : ''

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
    <>
      <PageHeader title="Impostazioni account" subtitle="Valgono per tutti i tuoi viaggi" back={{ href: '/altro', label: 'Altro' }} />
      <div class="space-y-3.5 px-5 pb-28">
        <AppearanceCard />

        <Card>
          <h2 class="font-display text-lg font-extrabold">Esporta tutti i viaggi</h2>
          <p class="mt-1 text-[13px] leading-snug text-muted">
            Una copia di sicurezza in formato JSON di tutti i tuoi viaggi. Contiene anche i codici di prenotazione, quindi tienila al sicuro.
            Per esportarne uno solo vai nelle impostazioni del viaggio.
          </p>
          <div class="mt-3">
            <SecondaryButton onClick={() => void exportAll()}>
              {t.trips.length > 1 ? `Esporta tutti i ${t.trips.length} viaggi` : 'Esporta il viaggio'}
            </SecondaryButton>
          </div>
        </Card>

        <RestoreCard />

        <Card>
          <h2 class="font-display mb-1.5 text-lg font-extrabold">Su questo telefono</h2>
          <dl class="text-sm">
            <div class="flex min-h-11 items-center justify-between gap-3 border-t border-hairline">
              <dt class="text-muted">Ultimo aggiornamento dei dati</dt>
              <dd class="font-extrabold">{savedAt ? time(savedAt) : '—'}</dd>
            </div>
            <div class="flex min-h-11 items-center justify-between gap-3 border-t border-hairline">
              <dt class="text-muted">Modifiche da inviare</dt>
              <dd class="font-extrabold">{t.pending}</dd>
            </div>
            <div class="flex min-h-11 items-center justify-between gap-3 border-t border-hairline">
              <dt class="text-muted">Versione dell'app</dt>
              <dd class="font-extrabold">{build ? time(Date.parse(build)) : 'sviluppo'}</dd>
            </div>
          </dl>
          {confirm ? (
            <div class="mt-3 space-y-2">
              <p class="text-sm text-muted">
                Cancello la copia salvata sul telefono (dati, meteo, biglietti offline) e la riscarico. Serve la connessione.
                {t.pending > 0 && ' Le modifiche da inviare restano in coda.'}
              </p>
              <SecondaryButton danger onClick={() => void clearLocal()}>Sì, scarica di nuovo</SecondaryButton>
              <SecondaryButton onClick={() => setConfirm(false)}>Annulla</SecondaryButton>
            </div>
          ) : (
            <div class="mt-3">
              <SecondaryButton onClick={() => setConfirm(true)}>Scarica di nuovo i dati</SecondaryButton>
            </div>
          )}
        </Card>

        <p class="px-1 pb-2 text-center text-xs text-muted">
          Icone:{' '}
          <a href="https://fontawesome.com" target="_blank" rel="noreferrer" class="font-extrabold text-pale">
            Font Awesome Free
          </a>{' '}
          (CC BY 4.0)
        </p>
      </div>
    </>
  )
}
