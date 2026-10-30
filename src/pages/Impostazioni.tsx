import { Link } from 'wouter'
import { buildExport, downloadJson, exportFileName, serializeExport } from '../lib/exportData'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import { SecondaryButton } from '../ui/Field'
import { ChevronRightIcon, SwapIcon } from '../ui/Icons'
import { Card, PageHeader } from '../ui/PageHeader'
import { Disc, Ticket } from '../ui/Ticket'
import { FindPositions } from '../ui/FindPositions'
import { KmzImportCard } from '../ui/KmzImportCard'

export function Impostazioni() {
  const t = useTrips()
  const trip = t.active
  if (!trip) return null

  async function exportTrip() {
    if (!trip) return
    try {
      await downloadJson(exportFileName([trip]), serializeExport(buildExport([trip])))
      showToast(__NATIVE__ ? 'File pronto: scegli dove salvarlo' : 'File scaricato')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Esportazione non riuscita')
    }
  }

  return (
    <>
      <PageHeader title="Impostazioni del viaggio" subtitle={trip.title} back={{ href: '/altro', label: 'Altro' }} />
      <div className="space-y-3.5 px-5 pb-28">
        <Card>
          <h2 className="font-display text-lg font-extrabold">Esporta questo viaggio</h2>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            Scarica una copia di sicurezza in formato JSON: giorni, tappe, luoghi, alloggi, voli, soldi, checklist e prenotazioni.
            Contiene anche i codici di prenotazione, quindi tienila al sicuro. I file allegati (PDF) restano nell'app.
          </p>
          <div className="mt-3">
            <SecondaryButton onClick={() => void exportTrip()}>Esporta «{trip.title}»</SecondaryButton>
          </div>
        </Card>

        <KmzImportCard />
        <FindPositions />

        <Link href="/altro/budget" className="block">
          <Ticket stub={<Disc color="var(--pale)"><SwapIcon size={22} /></Disc>} stubWidth={64}>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-extrabold">Tasso di cambio</span>
              <span className="block text-[13px] text-muted">Si cambia dalla pagina Spese, con il convertitore</span>
            </span>
            <ChevronRightIcon size={20} className="mr-2 shrink-0 text-muted" />
          </Ticket>
        </Link>
      </div>
    </>
  )
}
