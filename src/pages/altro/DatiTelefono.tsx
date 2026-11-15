// Dati sul telefono (#42, #45): sincronizzazione, riscarico, esporta (riepilogo e file), ripristina, importa da Google Maps.
// Non è più una pagina a sé: le sezioni stanno dentro Impostazioni.
import { useState } from 'react'
import { clearSnapshot, loadSnapshot } from '../../lib/cache'
import { buildExport, downloadJson, exportFileName, serializeExport } from '../../lib/exportData'
import { riepilogoViaggio } from '../../lib/ricerca'
import { esportaRiepilogo } from '../../lib/riepilogoImmagine'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import { FindPositions } from '../../ui/FindPositions'
import { KmzImportCard } from '../../ui/KmzImportCard'
import { RestoreCard } from '../../ui/RestoreCard'
import { Pulsante } from '../../faraway/base'
import type { useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { Riga } from '../../faraway/Righe'
import { useInCorso } from '../../faraway/Attesa'
import { LOCALE, t as tt } from '../../i18n'

const clock = (ms: number) => new Date(ms).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
const when = (ms: number) => new Date(ms).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Sezioni dei dati sul telefono, da mettere dentro Impostazioni (usa la sua conferma). */
export function SezioniDati({ ask }: { ask: ReturnType<typeof useConferma>[0] }) {
  const trip = useTrip()
  const t = useTrips()
  const [open, setOpen] = useState<'ripristina' | 'kmz' | null>(null)
  const savedAt = loadSnapshot()?.savedAt
  const build = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : ''

  async function esporta(tutti: boolean) {
    try {
      const list = tutti ? t.trips : [trip]
      await downloadJson(exportFileName(list), serializeExport(buildExport(list)))
      showToast(__NATIVE__ ? tt('File pronto: scegli dove salvarlo') : tt('File scaricato'))
    } catch (e) {
      showToast(e instanceof Error ? e.message : tt('Esportazione non riuscita'))
    }
  }

  const [occ, faiOcc] = useInCorso()
  async function riscarica() {
    const ok = await ask({
      title: tt('Scaricare di nuovo i dati?'),
      message: tt('Cancello la copia salvata sul telefono (dati, meteo, biglietti offline) e la riscarico. Serve la connessione.{v0}', { v0: t.pending > 0 ? tt(' Le modifiche da inviare restano in coda.') : '' }),
      confirm: tt('Scarica di nuovo'),
      cancel: tt('Annulla'),
      destructive: false,
    })
    if (!ok) return
    clearSnapshot()
    try {
      localStorage.removeItem('jp.weather.v1')
    } catch {
      // ignorato
    }
    await faiOcc('riscarica', () => t.refresh())
    showToast(tt('Copia locale svuotata e riscaricata'))
  }

  const toggle = (k: 'ripristina' | 'kmz') => setOpen(open === k ? null : k)

  return (
    <>
      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>
        {tt('Dati sul telefono')}
      </h2>
      <section className="fa-list" aria-label={tt('Sincronizzazione')}>
        <Riga
          icon={<Sv name="refresh" size={22} />}
          title={savedAt ? tt('Aggiornati alle {v0}', { v0: clock(savedAt) }) : tt('Nessuna copia salvata')}
          sub={tt('{v0} · app del {v1}', { v0: t.pending === 0 ? tt('Nessuna modifica in coda') : t.pending === 1 ? tt('1 modifica in coda') : tt('{pending} modifiche in coda', { pending: t.pending }), v1: build ? when(Date.parse(build)) : 'sviluppo' })}
          chevron={false}
        />
      </section>
      <Pulsante color="secondary" iconLeading="refresh" isLoading={occ === 'riscarica'} onPress={() => void riscarica()}>
        {tt('Scarica di nuovo i dati')}
      </Pulsante>

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>
        {tt('Copie e file')}
      </h2>
      <div className="fa-list">
        <Riga icon={<Sv name="share" size={22} />} title={tt('Esporta il riepilogo')} sub={tt('Immagine con statistiche e il tuo bilancio')} onPress={() => void esportaRiepilogo(riepilogoViaggio(trip)).catch((e) => showToast(e instanceof Error ? e.message : tt('Esportazione non riuscita')))} />
        <Riga icon={<Sv name="download" size={22} />} title={tt('Esporta questo viaggio')} sub={tt('«{title}» in un file, con i codici di prenotazione', { title: trip.title })} onPress={() => void esporta(false)} />
        {t.trips.length > 1 ? <Riga icon={<Sv name="download" size={22} />} title={tt('Esporta tutti i {length} viaggi', { length: t.trips.length })} sub={tt('Un solo file con tutto, da conservare')} onPress={() => void esporta(true)} /> : null}
        <Riga icon={<Sv name="file" size={22} />} title={tt('Ripristina da file')} sub={tt('Riporta i viaggi da un file esportato')} onPress={() => toggle('ripristina')} />
      </div>
      {open === 'ripristina' ? (
        <div className="legacy">
          <RestoreCard />
        </div>
      ) : null}

      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>
        {tt('Luoghi')}
      </h2>
      <div className="fa-list">
        <Riga icon={<Sv name="pin" size={22} />} title={tt('Importa da Google Maps (.kmz)')} sub={tt('I luoghi di una mappa salvata, con il link al punto')} onPress={() => toggle('kmz')} />
      </div>
      <div className="legacy">
        {open === 'kmz' ? <KmzImportCard /> : null}
        <FindPositions />
      </div>
    </>
  )
}
