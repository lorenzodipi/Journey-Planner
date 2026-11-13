// «Icona dell'app» (Impostazioni, solo nell'app Android/iOS): sceglie tra le icone dichiarate nei progetti nativi.
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup } from 'react-aria-components'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { cx } from '../../faraway/cx'
import { cambiaIcona, ICONE, iconaCorrente, iconaDisponibile, type IconaId } from '../../lib/iconaApp'
import { showToast } from '../../state/toast'
import chiara from '../../assets/art/faraway-app-icon-anello-mongolfiera-light.svg'
import scura from '../../assets/art/faraway-app-icon-anello-mongolfiera-dark.svg'
import blu from '../../assets/art/faraway-app-icon-anello-mongolfiera-blu.svg'

const IMMAGINI: Record<IconaId, string> = { chiara, scura, blu }

/** Disponibilità e scelta corrente: `disponibile` è vero solo nell'app nativa. */
export function useIconaApp() {
  const [disponibile, setDisponibile] = useState(false)
  const [corrente, setCorrente] = useState<IconaId>('chiara')
  useEffect(() => {
    let vivo = true
    void iconaDisponibile().then(async (ok) => {
      if (!ok || !vivo) return
      const c = await iconaCorrente()
      if (!vivo) return
      setCorrente(c)
      setDisponibile(true)
    })
    return () => {
      vivo = false
    }
  }, [])
  async function scegli(id: IconaId) {
    const prima = corrente
    setCorrente(id)
    try {
      await cambiaIcona(id)
    } catch {
      setCorrente(prima)
      showToast('Non sono riuscito a cambiare l’icona.')
    }
  }
  return { disponibile, corrente, scegli }
}

export function SezioneIconaApp({ corrente, scegli }: { corrente: IconaId; scegli: (id: IconaId) => void }) {
  const ios = Capacitor.getPlatform() === 'ios'
  return (
    <>
      <h2 className="fa-h3" style={{ margin: '8px 0 0' }}>Icona dell’app</h2>
      <AriaRadioGroup className="fa-iconeapp" aria-label="Icona dell’app" orientation="horizontal" value={corrente} onChange={(v) => scegli(v as IconaId)}>
        {ICONE.map((i) => (
          <AriaRadio key={i.id} value={i.id} className={({ isSelected }) => cx('fa-iconaapp', isSelected && 'on')}>
            <img src={IMMAGINI[i.id]} alt="" width={56} height={56} />
            <span>{i.nome}</span>
          </AriaRadio>
        ))}
      </AriaRadioGroup>
      <p className="fa-m" style={{ margin: 0 }}>
        {ios ? 'iOS mostra un avviso di conferma quando cambi l’icona.' : 'L’app si riavvia per applicare la nuova icona. Alcuni launcher la aggiornano dopo qualche secondo.'}
      </p>
    </>
  )
}
