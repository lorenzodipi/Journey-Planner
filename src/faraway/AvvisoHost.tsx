import { closeAvviso, useAvviso } from '../state/avviso'
import { Pulsante } from './base'
import { Modale } from './Modale'

/** Mostra l'avviso al centro (state/avviso), con un solo pulsante per chiuderlo. */
export function AvvisoHost() {
  const a = useAvviso()
  return (
    <Modale open={a !== null} title={a?.title ?? ''} icon={{ name: 'check', tone: 'ok' }} onClose={closeAvviso} actions={<Pulsante onPress={closeAvviso}>Va bene</Pulsante>}>
      {a?.message}
    </Modale>
  )
}
