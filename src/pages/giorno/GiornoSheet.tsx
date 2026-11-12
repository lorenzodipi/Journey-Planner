// Foglio «Modifica il giorno» dalla pagina Giorno: città o zona, titolo della giornata e note.
// Prende il posto del vecchio DayForm (src/ui), con gli stessi campi e gli stessi limiti.
import { useState } from 'react'
import { formatDayLong } from '../../lib/dates'
import { useTrips } from '../../state/trips'
import type { Day } from '../../types'
import { Campo, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'

export function GiornoSheet({ day, open, onClose }: { day: Day; open: boolean; onClose: () => void }) {
  const t = useTrips()
  const [city, setCity] = useState(day.city)
  const [title, setTitle] = useState(day.title ?? '')
  const [notes, setNotes] = useState(day.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await t.updateDay(day.id, { city, title, notes })
    setBusy(false)
    if (message) setError(message)
    else onClose()
  }

  const quando = formatDayLong(day.date)
  return (
    <Foglio
      open={open}
      title="Modifica il giorno"
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="giorno-form" isLoading={busy}>
          Salva il giorno
        </Pulsante>
      }
    >
      <form id="giorno-form" className="frm" onSubmit={submit} noValidate>
        <p className="fa-m" style={{ margin: 0 }}>
          {quando.charAt(0).toUpperCase() + quando.slice(1)}
        </p>
        <Campo label="Città o zona" icon="pin" value={city} onChange={setCity} maxLength={60} autoComplete="off" placeholder="es. Nome della città" />
        <Campo label="Titolo della giornata" value={title} onChange={setTitle} maxLength={80} autoComplete="off" placeholder="es. Arrivo" />
        <Campo label="Note" textarea value={notes} onChange={setNotes} placeholder="Promemoria per questa giornata" />
        {error ? (
          <span className="fa-help bad" role="alert">
            <Sv name="err" size={16} />
            {error}
          </span>
        ) : null}
      </form>
    </Foglio>
  )
}
