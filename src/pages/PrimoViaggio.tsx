import { useAuth } from '../lib/auth'
import { ART } from '../ui/art'
import { ChevronLeftG } from '../ui/glyphs'
import { useState } from 'react'
import { ViaggioSheet } from './viaggio/ViaggioSheet'

/** Schermata mostrata quando l'utente non ha ancora nessun viaggio (Fw3-NuovoViaggio). */
export function PrimoViaggio() {
  const auth = useAuth()
  const [aperto, setAperto] = useState(true)

  return (
    <main className="screen">
      <div style={{ paddingTop: '8px' }}>
        <img className="sym" src={ART.symbol} alt="" width="52" height="63" style={{ marginBottom: '20px' }} />
        <h1 className="d-lg">Dove si va?</h1>
        <p className="b-sm muted" style={{ marginTop: '8px' }}>
          Dai un nome al viaggio e scegli le date. Il resto lo aggiungi dopo.
        </p>
      </div>
      <button type="button" className="btn block" onClick={() => setAperto(true)}>
        Crea il primo viaggio
      </button>
      <ViaggioSheet open={aperto} onClose={() => setAperto(false)} />
      <div style={{ textAlign: 'center' }}>
        <button type="button" className="btn danger" onClick={() => void auth.signOut()}>
          <ChevronLeftG />
          Esci dall’account
        </button>
      </div>
    </main>
  )
}
