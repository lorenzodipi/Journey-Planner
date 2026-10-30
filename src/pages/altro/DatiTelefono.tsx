// «Dati sul telefono» (#42, #45): sincronizzazione, riscarico, esporta, ripristina, importa da Google Maps.
// Raccoglie le funzioni che prima erano sparse tra Impostazioni del viaggio e Account.
import { useState } from 'react'
import { clearSnapshot, loadSnapshot } from '../../lib/cache'
import { buildExport, downloadJson, exportFileName, serializeExport } from '../../lib/exportData'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { FindPositions } from '../../ui/FindPositions'
import { KmzImportCard } from '../../ui/KmzImportCard'
import { RestoreCard } from '../../ui/RestoreCard'
import { Pulsante } from '../../faraway/base'
import { useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { Riga } from '../../faraway/Righe'
import { BarraIndietro, Schermata } from '../../faraway/shell'

const clock = (ms: number) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
const when = (ms: number) => new Date(ms).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function DatiTelefono() {
  const trip = useTrip()
  const t = useTrips()
  const [ask, confirmNode] = useConferma()
  const [open, setOpen] = useState<'ripristina' | 'kmz' | null>(null)
  const savedAt = loadSnapshot()?.savedAt
  const build = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : ''

  async function esporta(tutti: boolean) {
    try {
      const list = tutti ? t.trips : [trip]
      await downloadJson(exportFileName(list), serializeExport(buildExport(list)))
      showToast(__NATIVE__ ? 'File pronto: scegli dove salvarlo' : 'File scaricato')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Esportazione non riuscita')
    }
  }

  async function riscarica() {
    const ok = await ask({
      title: 'Scaricare di nuovo i dati?',
      message: `Cancello la copia salvata sul telefono (dati, meteo, biglietti offline) e la riscarico. Serve la connessione.${t.pending > 0 ? ' Le modifiche da inviare restano in coda.' : ''}`,
      confirm: 'Scarica di nuovo',
      cancel: 'Annulla',
      destructive: false,
    })
    if (!ok) return
    clearSnapshot()
    try {
      localStorage.removeItem('jp.weather.v1')
    } catch {
      // ignorato
    }
    await t.refresh()
    showToast('Copia locale svuotata e riscaricata')
  }

  const toggle = (k: 'ripristina' | 'kmz') => setOpen(open === k ? null : k)

  return (
    <Schermata bar={<BarraIndietro title="Dati sul telefono" back="/altro" />} overlay={confirmNode}>
      <section className="fa-list" aria-label="Sincronizzazione">
        <Riga
          icon={<Sv name="refresh" size={22} />}
          title={savedAt ? `Aggiornati alle ${clock(savedAt)}` : 'Nessuna copia salvata'}
          sub={`${t.pending === 0 ? 'Nessuna modifica in coda' : t.pending === 1 ? '1 modifica in coda' : `${t.pending} modifiche in coda`} · app del ${build ? when(Date.parse(build)) : 'sviluppo'}`}
          chevron={false}
        />
      </section>
      <Pulsante color="secondary" iconLeading="refresh" onPress={() => void riscarica()}>
        Scarica di nuovo i dati
      </Pulsante>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>
        Copie e file
      </h2>
      <div className="fa-list">
        <Riga icon={<Sv name="download" size={22} />} title="Esporta questo viaggio" sub={`«${trip.title}» in un file, con i codici di prenotazione`} onPress={() => void esporta(false)} />
        {t.trips.length > 1 ? <Riga icon={<Sv name="download" size={22} />} title={`Esporta tutti i ${t.trips.length} viaggi`} sub="Un solo file con tutto, da conservare" onPress={() => void esporta(true)} /> : null}
        <Riga icon={<Sv name="file" size={22} />} title="Ripristina da file" sub="Riporta i viaggi da un file esportato" onPress={() => toggle('ripristina')} />
      </div>
      {open === 'ripristina' ? (
        <div className="legacy">
          <RestoreCard />
        </div>
      ) : null}

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>
        Luoghi
      </h2>
      <div className="fa-list">
        <Riga icon={<Sv name="pin" size={22} />} title="Importa da Google Maps (.kmz)" sub="I luoghi di una mappa salvata, con il link al punto" onPress={() => toggle('kmz')} />
      </div>
      <div className="legacy">
        {open === 'kmz' ? <KmzImportCard /> : null}
        <FindPositions />
      </div>
    </Schermata>
  )
}
