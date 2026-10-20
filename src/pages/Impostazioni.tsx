import { useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { loadSnapshot, clearSnapshot } from '../lib/cache'
import { buildExport, downloadJson, exportFileName, serializeExport } from '../lib/exportData'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import { SecondaryButton } from '../ui/Field'
import { ChevronRightIcon, SwapIcon } from '../ui/Icons'
import { Card, PageHeader } from '../ui/PageHeader'
import { Disc, Ticket } from '../ui/Ticket'
import { FindPositions } from '../ui/FindPositions'
import { KmzImportCard } from '../ui/KmzImportCard'
import { RestoreCard } from '../ui/RestoreCard'

const time = (ms: number) =>
  new Date(ms).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function Impostazioni() {
  const t = useTrips()
  const trip = t.active
  const [confirm, setConfirm] = useState(false)
  if (!trip) return null

  const savedAt = loadSnapshot()?.savedAt
  const build = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : ''

  async function exportTrips(list: typeof t.trips) {
    try {
      await downloadJson(exportFileName(list), serializeExport(buildExport(list)))
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
      <PageHeader title="Impostazioni" subtitle="Dati, import, telefono e info" back={{ href: '/altro', label: 'Altro' }} />
      <div class="space-y-3.5 px-5 pb-28">
        <Card>
          <h2 class="font-display text-lg font-extrabold">Esporta i dati</h2>
          <p class="mt-1 text-[13px] leading-snug text-muted">
            Scarica una copia di sicurezza in formato JSON: giorni, tappe, luoghi, alloggi, voli, soldi, checklist e prenotazioni.
            Contiene anche i codici di prenotazione, quindi tienila al sicuro. I file allegati (PDF) restano nell'app.
          </p>
          <div class="mt-3 space-y-2">
            <SecondaryButton onClick={() => exportTrips([trip])}>Esporta «{trip.title}»</SecondaryButton>
            {t.trips.length > 1 && <SecondaryButton onClick={() => exportTrips(t.trips)}>Esporta tutti i viaggi</SecondaryButton>}
          </div>
        </Card>

        <KmzImportCard />
        <FindPositions />

        <RestoreCard />

        <Link href="/altro/budget" class="block">
          <Ticket stub={<Disc color="var(--pale)"><SwapIcon size={22} /></Disc>} stubWidth={64}>
            <span class="min-w-0 flex-1">
              <span class="block text-base font-extrabold">Tasso di cambio</span>
              <span class="block text-[13px] text-muted">Si cambia dalla pagina Budget, con il convertitore</span>
            </span>
            <ChevronRightIcon size={20} class="mr-2 shrink-0 text-muted" />
          </Ticket>
        </Link>

        <Card>
          <h2 class="font-display mb-1.5 text-lg font-extrabold">Su questo telefono</h2>
          <dl class="text-sm">
            <div class="flex min-h-11 items-center justify-between gap-3 border-t-2 border-dashed border-line">
              <dt class="text-muted">Ultimo aggiornamento dei dati</dt>
              <dd class="font-extrabold">{savedAt ? time(savedAt) : '—'}</dd>
            </div>
            <div class="flex min-h-11 items-center justify-between gap-3 border-t-2 border-dashed border-line">
              <dt class="text-muted">Modifiche da inviare</dt>
              <dd class="font-extrabold">{t.pending}</dd>
            </div>
            <div class="flex min-h-11 items-center justify-between gap-3 border-t-2 border-dashed border-line">
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
