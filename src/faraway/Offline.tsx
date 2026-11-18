import { Banner } from './base'
import { Sv } from './icons'
import { t as tt } from '../i18n'
import { savedAtText, useOnline } from '../state/online'

/** Avviso «Sei offline» in cima a Oggi, con l'ora dell'ultimo aggiornamento. */
export function Offline() {
  const online = useOnline()
  if (online) return null
  const at = savedAtText()
  return (
    <>
      {at ? (
        <div className="fa-off">
          <Sv name="wifi" size={16} />
          {tt('Aggiornato alle {at}', { at })}
        </div>
      ) : null}
      <Banner tone="az" icon="wifi" title={tt('Sei offline.')}>
        {tt('Vedi i dati salvati sul telefono. Le modifiche partono quando torna la rete.')}
      </Banner>
    </>
  )
}
