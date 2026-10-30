// Vista a schermo intero del codice del biglietto (mock Fa-42, Fa-43, #38): nome e percorso in alto, immagine del
// QR / codice a barre grande su fondo bianco, passeggero e prenotazione sotto. Più passeggeri: avatar per cambiare.
// Senza codice: «Nessun codice associato» e «Aggiungi un codice». Sempre disponibile offline (copia sul telefono).
import { useEffect, useRef, useState } from 'react'
import { imageUrl } from '../lib/bookingFiles'
import { checkImmagine, codiciDi, codicePer, nBiglietti } from '../lib/codici'
import { LUMINOSITA_SUPPORTATA, luminositaMassima } from '../lib/luminosita'
import { discOf, initials } from '../state/me'
import { showToast } from '../state/toast'
import { useTrips } from '../state/trip'
import type { TicketKind, Trip } from '../types'
import { Pulsante } from './base'
import { cx } from './cx'
import { Foglio } from './Foglio'
import { Sv } from './icons'

interface Props {
  trip: Trip
  kind: TicketKind
  refId: string
  /** «Haruka 33 · Aeroporto Kansai → Kyoto» */
  title: string
  /** «dom 22 nov, 09:08» */
  when?: string
  /** Codice di prenotazione e posto, per la riga sotto l'immagine. */
  detail?: string
  /** Passeggeri della voce (vuoto = tutti). */
  travelerIds?: string[]
  /** Passeggero da mostrare per primo. */
  start?: string
  /** Apre subito la scelta del file (da «Aggiungi un codice» fuori dalla vista). */
  open: boolean
  onClose: () => void
}

export function CodiceBiglietto({ trip, kind, refId, title, when, detail, travelerIds, start, open, onClose }: Props) {
  const tr = useTrips()
  const people = trip.travelers.filter((p) => !travelerIds?.length || travelerIds.includes(p.id))
  const codes = codiciDi(trip, kind, refId)
  const first = start ?? people.find((p) => codicePer(codes, p.id))?.id ?? people[0]?.id
  const [who, setWho] = useState(first)
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const code = codicePer(codes, who)
  const person = trip.travelers.find((p) => p.id === who)
  const path = code?.filePath

  // luminosità al massimo finché la vista è aperta (solo app)
  useEffect(() => {
    if (!open) return
    let restore: (() => void) | undefined
    let stop = false
    void luminositaMassima().then((r) => (stop ? r() : (restore = r)))
    return () => {
      stop = true
      restore?.()
    }
  }, [open])

  // immagine: dalla copia sul telefono se c'è (anche in modalità aereo)
  useEffect(() => {
    setSrc(null)
    setFailed(null)
    if (!open || !path) return
    let url: string | null = null
    let stop = false
    imageUrl(path).then(
      (u) => (stop ? u.startsWith('blob:') && URL.revokeObjectURL(u) : ((url = u), setSrc(u))),
      (e: Error) => !stop && setFailed(e.message),
    )
    return () => {
      stop = true
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    }
  }, [open, path])

  async function pick(file: File | undefined) {
    if (!file) return
    const bad = checkImmagine(file)
    if (bad) return showToast(bad)
    setBusy(true)
    const old = codes.find((c) => c.travelerId === who) ?? (people.length <= 1 ? codes[0] : undefined)
    const m = await tr.saveTicketCode(trip.id, kind, refId, who ?? null, file, old)
    setBusy(false)
    showToast(m ?? 'Codice salvato sul telefono')
  }

  const pickFile = () => input.current?.click()
  const multi = people.length > 1

  return (
    <Foglio
      open={open}
      full
      title="Codice del biglietto"
      onClose={onClose}
      footer={
        code ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <Pulsante color="secondary" iconLeading="refresh" isLoading={busy} onPress={pickFile}>
              Cambia codice
            </Pulsante>
            <Pulsante onPress={onClose}>Chiudi</Pulsante>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <Pulsante iconLeading="plus" isLoading={busy} onPress={pickFile}>
              Aggiungi un codice
            </Pulsante>
            <Pulsante color="secondary" onPress={onClose}>
              Chiudi
            </Pulsante>
          </div>
        )
      }
    >
      <input ref={input} type="file" accept="image/*" hidden aria-label="Foto o screenshot del codice" onChange={(e) => (void pick(e.currentTarget.files?.[0]), (e.currentTarget.value = ''))} />
      <div style={{ display: 'grid', gap: 16, justifyItems: 'center', textAlign: 'center' }}>
        <div>
          <h2 className="fa-h3" style={{ margin: 0 }}>{title}</h2>
          {when ? <p className="fa-m" style={{ margin: '2px 0 0' }}>{when}</p> : null}
        </div>
        {multi ? (
          <div className="fa-chips scroll" role="group" aria-label={nBiglietti(people.length)} style={{ justifySelf: 'stretch', justifyContent: 'center' }}>
            <span className="fa-m" style={{ alignSelf: 'center' }}>{nBiglietti(people.length)}</span>
            {people.map((p) => (
              <button key={p.id} type="button" className={cx('fa-av', `r${discOf(trip, p.id)}`)} aria-label={`${p.name}${codicePer(codes, p.id) ? '' : ', senza codice'}`} aria-pressed={who === p.id} onClick={() => setWho(p.id)}
                style={{ width: 40, height: 40, border: who === p.id ? '3px solid var(--primary)' : '3px solid transparent', opacity: who === p.id || codicePer(codes, p.id) ? 1 : 0.5, cursor: 'pointer' }}>
                {initials(p.name)}
              </button>
            ))}
          </div>
        ) : null}
        {code ? (
          <>
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, width: '100%', maxWidth: 360, aspectRatio: '1 / 1', display: 'grid', placeItems: 'center' }}>
              {src ? <img src={src} alt={`Codice del biglietto${person ? ` di ${person.name}` : ''}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : failed ? <p role="alert" className="fa-m" style={{ color: '#444' }}>{failed}</p> : <span className="fa-m" style={{ color: '#444' }}>Sto aprendo il codice…</span>}
            </div>
            <p className="fa-b" style={{ margin: 0 }}>{[person?.name, detail].filter(Boolean).join(' · ')}</p>
            <p className="fa-m" style={{ margin: 0 }}>Avvicina il codice allo scanner.{LUMINOSITA_SUPPORTATA ? ' La luminosità sale al massimo finché resta aperto.' : ''}</p>
          </>
        ) : (
          <div style={{ display: 'grid', gap: 8, justifyItems: 'center', padding: '24px 0' }}>
            <Sv name="qr" size={40} />
            <h3 className="fa-h3" style={{ margin: 0 }}>{multi && person ? `Nessun codice per ${person.name.split(/\s+/)[0]}` : 'Nessun codice associato'}</h3>
            <p className="fa-m" style={{ margin: 0, maxWidth: 300 }}>Aggiungi il QR o il codice a barre del biglietto per averlo sempre a portata di mano, anche senza rete.</p>
          </div>
        )}
      </div>
    </Foglio>
  )
}
