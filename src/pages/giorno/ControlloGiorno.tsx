// «Controllo del giorno» (#55): avvisi di sovrapposizione, conflitti di fattibilità e durate mancanti, più margine e
// alloggio di partenza/arrivo. L'app indica i problemi, non cambia nulla da sola.
import { useState } from 'react'
import { alloggiDelGiorno, margineDelGiorno, MARGINI_RAPIDI, mezziDelGiorno, verificaGiorno, vociDelGiorno } from '../../lib/fattibilita'
import { showToast } from '../../state/toast'
import { useTrips } from '../../state/trip'
import type { Day, Trip } from '../../types'
import { Banner, Campo, Chip, Interruttore, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'

export function ControlloGiorno({ trip, day, minutiSpostamento }: { trip: Trip; day: Day; minutiSpostamento: (aId: string, bId: string) => number | null }) {
  const [open, setOpen] = useState(false)
  const margine = margineDelGiorno(trip, day)
  const alloggi = alloggiDelGiorno(trip, day)
  const esito = verificaGiorno({ voci: vociDelGiorno(trip, day), spostamento: minutiSpostamento, margine, mezzi: mezziDelGiorno(trip, day.date) })
  const nessuno = esito.sovrapposizioni.length + esito.conflitti.length + esito.nonVerificate.length === 0
  return (
    <section style={{ display: 'grid', gap: 12 }} aria-label="Controllo del giorno">
      <div className="fa-sech">
        <h2 className="fa-h3">Controllo del giorno</h2>
        <button type="button" className="fa-lnk" onClick={() => setOpen(true)}>Margine e alloggio</button>
      </div>
      {esito.sovrapposizioni.map((x) => <Banner key={`s${x.id}${x.testo}`} tone="ac" icon="warn">{x.testo}.</Banner>)}
      {esito.conflitti.map((x) => <Banner key={`c${x.daId}${x.aId}`} tone="ac" icon="clock">{x.testo}.</Banner>)}
      {esito.nonVerificate.map((x) => <Banner key={`n${x.id}`} tone="az" icon="info">{x.testo}.</Banner>)}
      {nessuno ? (
        <p className="fa-m" style={{ margin: 0 }}>
          {day.items.filter((i) => i.time).length < 2 ? 'Con due tappe con orario il controllo verifica i tempi.' : 'Orari, spostamenti e margini sono nei tempi.'} Margine tra tappe: {margine} min
          {alloggi.escluso ? ' · alloggio escluso' : alloggi.partenza ? ` · si parte da ${alloggi.partenza.name}` : ''}.
        </p>
      ) : null}
      {open ? <ImpostazioniGiorno trip={trip} day={day} onClose={() => setOpen(false)} /> : null}
    </section>
  )
}

function ImpostazioniGiorno({ trip, day, onClose }: { trip: Trip; day: Day; onClose: () => void }) {
  const t = useTrips()
  const [margine, setMargine] = useState(String(margineDelGiorno(trip, day)))
  const [pertutti, setPerTutti] = useState(false)
  const [start, setStart] = useState(day.startStayId ?? '')
  const [end, setEnd] = useState(day.endStayId ?? '')
  const [escludi, setEscludi] = useState(!!day.excludeStay)
  const [busy, setBusy] = useState(false)
  const auto = alloggiDelGiorno(trip, { date: day.date })
  const n = Number(margine)
  const errore = margine.trim() === '' || !Number.isInteger(n) || n < 0 || n > 240 ? 'Scrivi i minuti, da 0 a 240.' : ''
  async function salva() {
    if (errore) return
    setBusy(true)
    const m = await t.setDayPlan(trip.id, day.id, {
      ...(pertutti ? { tripMarginMin: n, marginMin: null } : { marginMin: n }),
      startStayId: start || null,
      endStayId: end || null,
      excludeStay: escludi,
    })
    setBusy(false)
    if (m) return showToast(m)
    showToast('Giorno aggiornato')
    onClose()
  }
  const opzioni = (
    <>
      <option value="">Automatico</option>
      {trip.stays.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </>
  )
  return (
    <Foglio open title="Margine e alloggio" onClose={onClose} footer={<Pulsante isLoading={busy} isDisabled={!!errore} onPress={() => void salva()}>Salva</Pulsante>}>
      <div className="fa-fld" role="group" aria-label="Margine tra tappe">
        Margine tra tappe
        <div className="fa-chips">
          {[0, ...MARGINI_RAPIDI].map((m) => (
            <Chip key={m} on={n === m && margine.trim() !== ''} onPress={() => setMargine(String(m))}>{m === 0 ? 'Nessuno' : `${m} min`}</Chip>
          ))}
        </div>
        <Campo label="Oppure scrivi i minuti" inputMode="numeric" value={margine} onChange={setMargine} error={errore || undefined} />
        <span className="fa-help">Si somma agli spostamenti nel controllo.</span>
      </div>
      <Interruttore label="Per tutto il viaggio" hint="Altrimenti vale solo per questo giorno." isSelected={pertutti} onChange={setPerTutti} />
      <Interruttore label="Escludi l’alloggio dal giorno" hint="Non conta come partenza né come arrivo." isSelected={escludi} onChange={setEscludi} />
      {!escludi ? (
        <div className="fa-2c">
          <div className="fa-fld">
            <label htmlFor="g-part">Partenza</label>
            <span className="fa-in"><select id="g-part" value={start} onChange={(e) => setStart(e.currentTarget.value)}>{opzioni}</select></span>
            <span className="fa-help">{auto.partenza ? `Automatico: ${auto.partenza.name}` : 'Nessun alloggio la notte prima'}</span>
          </div>
          <div className="fa-fld">
            <label htmlFor="g-arr">Arrivo</label>
            <span className="fa-in"><select id="g-arr" value={end} onChange={(e) => setEnd(e.currentTarget.value)}>{opzioni}</select></span>
            <span className="fa-help">{auto.arrivo ? `Automatico: ${auto.arrivo.name}` : 'Nessun alloggio questa notte'}</span>
          </div>
        </div>
      ) : null}
      <span className="fa-help"><Sv name="info" size={16} /> L’app segnala i problemi e non sposta mai le tappe da sola.</span>
    </Foglio>
  )
}
