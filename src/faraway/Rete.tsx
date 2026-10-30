// Stati di sistema (mock Fa-49, Fa-50, Fa-07, issue #25 e #49): avvio con gli scheletri, errore con «Riprova»
// e «Usa i dati salvati», modifiche in coda, voci non salvate e la pillola «Sei offline».
import { useEffect, useState } from 'react'
import { useOnline, savedAtText } from '../state/online'
import { useTrips } from '../state/trip'
import { Banner, Pulsante } from './base'
import { Sv } from './icons'
import { BarraGrande, Schermata } from './shell'
import { Caricamento } from './Stati'

/** Avvio: nome del viaggio, scheletri delle card e «Sto caricando il viaggio» (Fa-49 chiaro). */
export function SchermataCaricamento({ title }: { title: string }) {
  return (
    <Schermata bar={<BarraGrande title={title} />} rete={false}>
      <Caricamento text="Sto caricando il viaggio" rows={4} />
    </Schermata>
  )
}

/**
 * Errore all'avvio (Fa-49 scuro): il servizio non risponde entro il tempo limite, o manca la rete.
 * «Usa i dati salvati» c'è solo se sul telefono c'è una copia dei dati.
 */
export function SchermataErrore({ title, onRetry, onSaved }: { title: string; onRetry: () => void; onSaved?: () => void }) {
  const online = useOnline()
  const at = savedAtText()
  return (
    <Schermata bar={<BarraGrande title={title} />} rete={false}>
      <section className="fa-card xl pad fa-errcard" role="alert" style={{ display: 'grid', gap: 12 }}>
        <Sv name={online ? 'err' : 'wifi'} size={28} className="ei" />
        <h2 className="fa-h3">{online ? 'Non riesco a caricare il viaggio' : 'Sei offline'}</h2>
        <p className="fa-m">
          {online
            ? 'La connessione è lenta o il servizio non risponde. I dati salvati sul telefono sono al sicuro.'
            : onSaved
              ? 'Non c’è connessione. I dati salvati sul telefono sono al sicuro.'
              : 'Per caricare il viaggio la prima volta serve la rete. Collegati e tocca Riprova.'}
        </p>
        <Pulsante onPress={onRetry}>Riprova</Pulsante>
        {onSaved ? (
          <Pulsante color="secondary" onPress={onSaved}>
            Usa i dati salvati
          </Pulsante>
        ) : null}
      </section>
      {onSaved && at ? (
        <Banner tone="az" icon="info" title={`Ultimo aggiornamento alle ${at}.`}>
          Fino a quando torna la rete vedi i dati salvati.
        </Banner>
      ) : null}
    </Schermata>
  )
}

/** In cima alle pagine: modifiche rifiutate dal server e modifiche in attesa senza rete. */
export function StatoRete() {
  const { stale, pending, failed, dismissFailed } = useTrips()
  const online = useOnline()
  const offline = !online || stale
  return (
    <>
      {failed.map((f) => (
        <Banner
          key={f.id}
          tone="cor"
          icon="err"
          title={`Non salvata: ${f.label}.`}
          action={
            <button type="button" className="fa-btn txt" onClick={() => dismissFailed(f.id)}>
              Scarta
            </button>
          }
        >
          {f.error}
        </Banner>
      ))}
      {offline && pending > 0 ? (
        <Banner tone="az" icon="clock" title={`${pending} ${pending === 1 ? 'modifica in attesa.' : 'modifiche in attesa.'}`}>
          {pending === 1 ? 'Parte' : 'Partono'} appena torna la rete.
        </Banner>
      ) : null}
      {!offline ? <InvioPillola count={pending} /> : null}
    </>
  )
}

/** «Invio di N modifiche…» in alto, solo se l'invio dura più di un attimo. */
function InvioPillola({ count }: { count: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (count === 0) return setVisible(false)
    const timer = window.setTimeout(() => setVisible(true), 1200)
    return () => window.clearTimeout(timer)
  }, [count > 0]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!visible || count === 0) return null
  return (
    <p className="fa-sending" role="status">
      <Sv name="refresh" size={16} />
      Invio di {count} {count === 1 ? 'modifica' : 'modifiche'}…
    </p>
  )
}

/** In fondo alle pagine senza rete: «Sei offline» (Fa-50). */
export function PillolaOffline() {
  const { stale } = useTrips()
  const online = useOnline()
  if (online && !stale) return null
  return (
    <p className="fa-off" style={{ justifySelf: 'center' }}>
      <Sv name="wifi" size={16} />
      Sei offline
    </p>
  )
}
