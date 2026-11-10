// Foglio «Filtri» delle prenotazioni, come quello dei luoghi: Stato (Da confermare, Confermata, Cancellata) e
// Allegati (Con file, Senza file), «Azzera» in alto e «Mostra N prenotazioni» con il conteggio dal vivo.
// Il tipo (Treni, Ristoranti…) e la ricerca restano sulla pagina.
import { useState } from 'react'
import { filtraArchivio, STATO_LABEL, type FiltriArchivio } from '../../lib/prenotazioni'
import type { Booking, BookingStatus } from '../../types'
import { Chip, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'

interface Props {
  /** le prenotazioni del tipo scelto sulla pagina: il conteggio parte da queste */
  bookings: Booking[]
  filters: FiltriArchivio
  onApply: (f: FiltriArchivio) => void
  onClose: () => void
}

const STATI: BookingStatus[] = ['to_confirm', 'confirmed', 'cancelled']
const ALLEGATI: { v: 'con' | 'senza'; l: string }[] = [
  { v: 'con', l: 'Con file' },
  { v: 'senza', l: 'Senza file' },
]

/** Quanti filtri del foglio sono accesi (la ricerca testuale non conta: ha la sua barra). */
export const filtriAttivi = (f: FiltriArchivio) => (f.stato !== 'all' ? 1 : 0) + (f.allegati !== 'all' ? 1 : 0)

export function FiltriPrenotazioniSheet({ bookings, filters, onApply, onClose }: Props) {
  const [f, setF] = useState(filters)
  const count = filtraArchivio(bookings, f).length

  return (
    <Foglio
      open
      title="Filtri"
      onClose={onClose}
      headStart={
        <button type="button" className="fa-hdtxt" onClick={() => setF({ ...f, stato: 'all', allegati: 'all' })}>
          Azzera
        </button>
      }
      footer={<Pulsante onPress={() => (onApply(f), onClose())}>{count === 1 ? 'Mostra 1 prenotazione' : `Mostra ${count} prenotazioni`}</Pulsante>}
    >
      <div className="frm" style={{ gap: 'var(--gap-sezioni)' }}>
        <div className="fa-fld" role="group" aria-label="Stato">
          Stato
          <div className="fa-chips wrap">
            {STATI.map((s) => (
              <Chip key={s} on={f.stato === s} onPress={() => setF({ ...f, stato: f.stato === s ? 'all' : s })}>
                {STATO_LABEL[s]}
              </Chip>
            ))}
          </div>
        </div>
        <div className="fa-fld" role="group" aria-label="Allegati">
          Allegati
          <div className="fa-chips wrap">
            {ALLEGATI.map((a) => (
              <Chip key={a.v} on={f.allegati === a.v} onPress={() => setF({ ...f, allegati: f.allegati === a.v ? 'all' : a.v })}>
                {a.l}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Foglio>
  )
}
