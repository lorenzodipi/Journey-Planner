// «Il mio bilancio» (#51): quanto devo dare o ricevere, spesa per spesa. Le azioni sui rimborsi (Ho pagato, Rispondi,
// Annulla, Rettifica) stanno nel menu a tre puntini di ogni card: non c'è più una cronologia a parte.
import { useEffect, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import { BarraIndietro, Schermata } from '../../faraway/shell'
import { ricevuta } from '../../lib/ricevuta'
import { riassunto } from '../../lib/spese'
import { useMe } from '../../state/me'
import { useTrip } from '../../state/trip'
import { DebitiSpesa } from './DebitiSpesa'
import { RimborsiCard } from './Rimborsi'
import { t } from '../../i18n'

export function Bilancio() {
  const trip = useTrip()
  const me = useMe(trip)
  const r = riassunto(trip, me?.id)
  const dati = ricevuta(trip, r.spese, r.fx)
  const saldo = r.mioSaldo
  // «Controlla» su un pagamento nuovo (da Spese, da Oggi o da qui): `?voce=` è il pagamento da mostrare. Il parametro si
  // toglie subito, così ricaricando o tornando indietro non si scorre di nuovo; `n` fa ripartire anche lo stesso pagamento.
  const search = useSearch()
  const [, navigate] = useLocation()
  const ref = new URLSearchParams(search).get('voce')
  const [voce, setVoce] = useState<{ ref: string; n: number } | null>(null)
  useEffect(() => {
    if (!ref) return
    navigate('/spese/bilancio', { replace: true })
    setVoce((v) => ({ ref, n: (v?.n ?? 0) + 1 }))
  }, [ref]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Schermata bar={<BarraIndietro title={t('Il mio bilancio')} back="/spese" />} gap={16}>
      <RimborsiCard trip={trip} conMie={false} novitaAperte />
      <DebitiSpesa trip={trip} spese={r.spese} fx={r.fx} me={me?.id} abilitaPagamento={trip.settlements !== undefined} voce={voce} />
      {dati.transfers.filter((x) => x.from === me?.id || x.to === me?.id).length === 0 && saldo !== null ? <p className="fa-m" style={{ margin: 0 }}>{t('Nessun rimborso necessario.')}</p> : null}
    </Schermata>
  )
}
