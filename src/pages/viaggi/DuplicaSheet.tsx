// «Duplica come modello» (#59, TRIP-010): nuove date e cosa portarsi dietro. Mai spese, saldi, documenti o dati personali.
import { useState } from 'react'
import { scartoDate, spostaData } from '../../lib/gestioneViaggio'
import { initials } from '../../state/me'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { TripPeople } from '../../lib/tripApi'
import type { Trip } from '../../types'
import { Campo, Interruttore, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { t as tt } from '../../i18n'

export function DuplicaSheet({ trip, onClose, onDone }: { trip: Trip; onClose: () => void; onDone: () => void }) {
  const t = useTrips()
  const durata = scartoDate(trip.startDate, trip.endDate)
  const [title, setTitle] = useState(tt('{title} (modello)', { title: trip.title }))
  const [start, setStart] = useState('')
  const [logistica, setLogistica] = useState(false)
  const [errore, setErrore] = useState('')
  const [busy, setBusy] = useState(false)
  const end = start ? spostaData(start, durata) : ''
  async function crea() {
    if (!title.trim()) return setErrore(tt('Scrivi un nome per il nuovo viaggio.'))
    if (!start) return setErrore(tt('Scegli la data di inizio del nuovo viaggio.'))
    const scarto = scartoDate(trip.startDate, start)
    const me = trip.travelers.find((p) => p.id === trip.myTravelerId) ?? trip.travelers[0]
    const people: TripPeople = { self: { name: me?.name ?? initials(tt('Io')), color: me?.color ?? '#4F8EF7' }, others: [] }
    setBusy(true)
    const m = await t.duplicateTripAsTemplate(
      { id: trip.id, startDate: trip.startDate },
      {
        title: title.trim(), destination: trip.destination, startDate: start, endDate: end, timezone: trip.timezone, theme: trip.theme,
        baseCurrency: trip.baseCurrency, localCurrency: trip.localCurrency ?? '', center: trip.center,
        ...(trip.originCountry ? { originCountry: trip.originCountry, originTimezone: trip.originTimezone ?? null } : {}),
        countries: (trip.countries ?? []).map((c) => ({ ...c, id: crypto.randomUUID(), startDate: spostaData(c.startDate, scarto), endDate: spostaData(c.endDate, scarto) })),
        fxRate: trip.fxRate ?? null, fxRates: trip.fxRates ?? {},
      },
      people,
      logistica,
    )
    setBusy(false)
    if (m) return setErrore(m)
    showToast(tt('Nuovo viaggio creato dal modello'))
    onDone()
  }
  return (
    <Foglio open title={tt('Duplica come modello')} onClose={onClose} footer={<Pulsante isLoading={busy} onPress={() => void crea()}>{tt('Crea il nuovo viaggio')}</Pulsante>}>
      <Campo label={tt('Nome')} value={title} onChange={setTitle} />
      <Campo label={tt('Inizio del nuovo viaggio')} type="date" icon="cal" value={start} onChange={setStart} />
      <span className="fa-help">{end ? tt('Finisce il {v0} (stessa durata: {v1} giorni).', { v0: end.split('-').reverse().join('/'), v1: durata + 1 }) : tt('Stessa durata del viaggio: {v0} giorni.', { v0: durata + 1 })}</span>
      <Interruttore label={tt('Porta anche alloggi, trasporti e prenotazioni')} hint={tt('Con le date spostate, senza costi, pagamenti, codici e file.')} isSelected={logistica} onChange={setLogistica} />
      <span className="fa-help"><Sv name="info" size={16} />{' '}{tt('Si copiano luoghi, categorie, giorni con le tappe (senza stati) e la checklist comune senza spunte. Spese, saldi, documenti e dati personali non si copiano.')}</span>
      {errore ? <span className="fa-help bad" role="alert"><Sv name="err" size={16} />{errore}</span> : null}
    </Foglio>
  )
}
