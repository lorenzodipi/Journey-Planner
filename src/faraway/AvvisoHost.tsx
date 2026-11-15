import { closeAvviso, useAvviso } from '../state/avviso'
import { Pulsante } from './base'
import { Modale } from './Modale'
import { t } from '../i18n'

/** Mostra l'avviso al centro (state/avviso), con un solo pulsante per chiuderlo. */
export function AvvisoHost() {
  const a = useAvviso()
  return (
    <Modale open={a !== null} title={a?.title ?? ''} icon={{ name: 'check', tone: 'ok' }} onClose={closeAvviso} actions={<Pulsante onPress={closeAvviso}>{t('Va bene')}</Pulsante>}>
      {a?.message}
    </Modale>
  )
}
