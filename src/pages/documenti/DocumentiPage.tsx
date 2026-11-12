// Documenti (#52): file senza un luogo (eSIM, assicurazione, passaporti, visti…) con la loro visibilità.
// I file di alloggi, voli e trasporti stanno nelle loro pagine; quelli delle prenotazioni nelle tappe: niente doppioni.
// Ogni documento è un biglietto come quelli dei trasporti: chiuso nome, formato e chi lo vede; aperto i dati e le azioni.
import { useState } from 'react'
import { Pulsante } from '../../faraway/base'
import { cx } from '../../faraway/cx'
import { DiscoSprite } from '../../faraway/DiscoSprite'
import { useConferma } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { useUnaAperta } from '../../faraway/Righe'
import { Affianca, BarraIndietro, Schermata } from '../../faraway/shell'
import { useAuth } from '../../lib/auth'
import { openBookingFile } from '../../lib/bookingFiles'
import { chiVede, dimensione, puoCambiare, senzaCollegamenti, VIS_LABEL } from '../../lib/documenti'
import { isDocOffline } from '../../lib/documentiOffline'
import { formatMoney } from '../../lib/money'
import { showToast } from '../../state/toast'
import { useTrip, useTrips } from '../../state/trip'
import type { Documento } from '../../types'
import { DocumentoDettaglio, NuovoDocumentoSheet, spesaDelDocumento } from './DocumentoSheet'
import { useInCorso } from '../../faraway/Attesa'

const formato = (d: Documento) => d.mime?.split('/')[1]?.split(/[.+-]/).pop()?.toUpperCase() || d.name.split('.').pop()?.toUpperCase() || 'File'
const caricato = (d: Documento) => new Date(d.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function DocumentiPage() {
  const trip = useTrip()
  const t = useTrips()
  const { session } = useAuth()
  const uid = session?.user.id
  const [ask, confirmNode] = useConferma()
  const open = useUnaAperta()
  const [nuovo, setNuovo] = useState(false)
  const [modifica, setModifica] = useState<string | null>(null)
  const lista = senzaCollegamenti(trip.documents)
  const doc = lista.find((d) => d.id === modifica) ?? (trip.documents ?? []).find((d) => d.id === modifica)

  const [occ, faiOcc] = useInCorso()
  async function elimina(d: Documento) {
    const ok = await ask({ title: 'Eliminare il documento?', message: `«${d.name}» sparisce per tutti, anche dai punti a cui è collegato.`, confirm: 'Elimina', cancel: 'Tienilo', destructive: true })
    if (!ok) return
    const spesa = spesaDelDocumento(trip, d.id)
    const m = await faiOcc(d.id, async () => {
      if (spesa) await t.setExpenseDeleted(spesa.id, true)
      return t.deleteDocument(d.id, d.path)
    })
    showToast(m ?? 'Documento eliminato')
  }

  return (
    <Schermata
      bar={<BarraIndietro title="Documenti" back="/altro" />}
      gap={16}
      fab={trip.documents ? { label: 'Documento', aria: 'Aggiungi un documento', onPress: () => setNuovo(true) } : undefined}
      overlay={
        <>
          {nuovo ? <NuovoDocumentoSheet trip={trip} onClose={() => setNuovo(false)} /> : null}
          {doc ? <DocumentoDettaglio key={doc.id} trip={trip} doc={doc} onClose={() => setModifica(null)} /> : null}
          {confirmNode}
        </>
      }
    >
      {!trip.documents ? (
        <p className="fa-m" style={{ margin: 0 }}>I documenti con visibilità si attivano con la migrazione 0030 del database.</p>
      ) : lista.length === 0 ? (
        <p className="fa-m" style={{ margin: 0 }}>Qui metti ciò che non ha un luogo: eSIM, assicurazione, passaporti, visti. Per ogni file scegli chi lo vede.</p>
      ) : (
        <Affianca pesi={lista.map(() => 1)}>
        {lista.map((d) => {
          const isOpen = open.isOpen(d.id)
          const mio = puoCambiare(d, uid)
          const spesa = spesaDelDocumento(trip, d.id)
          const vede = chiVede(d, trip.travelers, uid)
          const righe: [string, string][] = [
            ['Chi lo vede', vede],
            ['Caricato il', caricato(d)],
            ['Dimensione', dimensione(d.size)],
            ['Costo', spesa ? formatMoney(spesa.amount, spesa.currency) : ''],
            ['Offline', isDocOffline(d.id) ? 'Disponibile anche senza rete' : ''],
          ]
          return (
            <div key={d.id} className="k-TicketOrizzontale">
              <div className={cx('tk tv th doc', isOpen && 'open')}>
                <div className="a v-top">
                  <button type="button" className="hdl" aria-expanded={isOpen} onClick={() => open.toggle(d.id)}>
                    <span className="kd kd-disco" aria-hidden="true">
                      <DiscoSprite name="i-sez-file" colore="#FF7C80" size={40} />
                    </span>
                    <span className="ti">
                      <b>{d.name}</b>
                      <span>{[formato(d), dimensione(d.size)].filter(Boolean).join(' · ')}</span>
                      <span className="pl3b ok">
                        {d.visibility === 'all' ? null : <Sv name="lock" size={16} />}
                        {d.visibility === 'selected' ? 'Alcuni' : VIS_LABEL[d.visibility]}
                      </span>
                    </span>
                    <span className="chv" aria-hidden="true">
                      <Sv name="chev" size={20} />
                    </span>
                  </button>
                  <div className="hz3">
                    <div className="hs l">
                      <span className="tm">{formato(d)}</span>
                      <b>Formato</b>
                    </div>
                    <div className="hs r">
                      <span className="tm cod">{caricato(d)}</span>
                      <b>Caricato</b>
                    </div>
                  </div>
                </div>
                {isOpen ? (
                  <div className="b">
                    <dl className="dl" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
                      {righe
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                    </dl>
                    {mio ? null : <p className="fa-help" style={{ margin: '16px 0 0' }}>Solo chi l’ha caricato può cambiarne la visibilità o eliminarlo.</p>}
                    <div className="acts2">
                      <Pulsante size="sm" color="secondary" iconLeading="file" isLoading={occ === `apri:${d.id}`} onPress={() => void faiOcc(`apri:${d.id}`, () => openBookingFile(d.path)).catch((e: Error) => showToast(e.message))}>
                        Apri
                      </Pulsante>
                      <Pulsante size="sm" color="secondary" iconLeading="pencil" onPress={() => setModifica(d.id)}>
                        Modifica
                      </Pulsante>
                      {mio ? (
                        <Pulsante size="sm" color="tertiary-destructive" iconLeading="trash" isLoading={occ === d.id} onPress={() => void elimina(d)}>
                          Elimina
                        </Pulsante>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
        </Affianca>
      )}
    </Schermata>
  )
}
