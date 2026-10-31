// Documenti di un alloggio, volo, trasporto (#52, MOVE-004, STAY-006): più file per voce, caricati una volta.
import { useState } from 'react'
import { Pulsante } from '../../faraway/base'
import { chiVede, perRiferimento, senzaCollegamenti } from '../../lib/documenti'
import { useAuth } from '../../lib/auth'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { DocKind, Trip } from '../../types'
import { DocumentoDettaglio, NuovoDocumentoSheet } from './DocumentoSheet'

export function DocumentiCollegati({ trip, kind, refId, passeggeri }: { trip: Trip; kind: DocKind; refId: string; passeggeri?: string[] }) {
  const t = useTrips()
  const { session } = useAuth()
  const [nuovo, setNuovo] = useState(false)
  const [aperto, setAperto] = useState<string | null>(null)
  if (!trip.documents) return null
  const docs = perRiferimento(trip.documents, kind, refId)
  const altri = senzaCollegamenti(trip.documents).filter((d) => !docs.some((x) => x.id === d.id) && d.ownerId === session?.user.id)
  const doc = docs.find((d) => d.id === aperto)
  return (
    <div className="fa-fld">
      Documenti
      {docs.map((d) => (
        <div key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <Pulsante color="link-color" size="sm" iconLeading="file" onPress={() => setAperto(d.id)}>
            {d.name}
          </Pulsante>
          <span className="fa-help">{chiVede(d, trip.travelers, session?.user.id)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Pulsante color="secondary" size="sm" iconLeading="plus" onPress={() => setNuovo(true)}>
          Aggiungi un documento
        </Pulsante>
        {altri.length > 0 ? (
          <Pulsante color="tertiary" size="sm" onPress={() => void t.linkDocument(altri[0].id, kind, refId).then((m) => showToast(m ?? `«${altri[0].name}» collegato`))}>
            Collega «{altri[0].name}»
          </Pulsante>
        ) : null}
      </div>
      {nuovo ? <NuovoDocumentoSheet trip={trip} link={{ kind, refId }} passeggeri={passeggeri} onClose={() => setNuovo(false)} /> : null}
      {doc ? <DocumentoDettaglio key={doc.id} trip={trip} doc={doc} onClose={() => setAperto(null)} /> : null}
    </div>
  )
}
