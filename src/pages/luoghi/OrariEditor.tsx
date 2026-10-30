// Editor degli orari strutturati di un luogo (#33): per ogni giorno le fasce di apertura, «Chiuso»,
// «Copia su tutti i giorni» e una nota (es. «Ultimo ingresso alle 16:30»).
import { WEEKDAYS, type Fascia, type OpeningSpec } from '../../lib/opening'
import { Campo } from '../../faraway/base'
import { Sv } from '../../faraway/icons'

type Day = 1 | 2 | 3 | 4 | 5 | 6 | 7

const START: OpeningSpec = { w: { 1: [{ from: '09:00', to: '18:00' }], 2: [{ from: '09:00', to: '18:00' }], 3: [{ from: '09:00', to: '18:00' }], 4: [{ from: '09:00', to: '18:00' }], 5: [{ from: '09:00', to: '18:00' }], 6: [{ from: '09:00', to: '18:00' }], 7: [{ from: '09:00', to: '18:00' }] } }

export function OrariEditor({ value, onChange, legacyText }: { value: OpeningSpec | null; onChange: (v: OpeningSpec | null) => void; legacyText?: string }) {
  if (!value) {
    return (
      <div className="fa-fld">
        Orari di apertura
        {legacyText ? <span className="fa-help">Scritti finora: {legacyText}</span> : null}
        <button type="button" className="fa-btn out" style={{ height: 44, fontSize: 14 }} onClick={() => onChange(structuredClone(START))}>
          <Sv name="clock" size={20} />
          Aggiungi gli orari
        </button>
      </div>
    )
  }
  const setDay = (d: Day, f: Fascia[]) => onChange({ ...value, w: { ...value.w, [d]: f } })
  const copyAll = (d: Day) => {
    const f = value.w[d] ?? []
    const w: OpeningSpec['w'] = {}
    for (const x of WEEKDAYS) w[x.n] = f.map((y) => ({ ...y }))
    onChange({ ...value, w })
  }
  return (
    <div className="fa-fld" role="group" aria-label="Orari di apertura">
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Orari di apertura
        <button type="button" className="fa-lnk" style={{ fontSize: 13 }} onClick={() => onChange(null)}>
          Togli gli orari
        </button>
      </span>
      <div className="fa-list fa-orari">
        {WEEKDAYS.map((d) => {
          const f = value.w[d.n] ?? []
          return (
            <div key={d.n} className="od" role="group" aria-label={d.long}>
              <span className="dn">{d.short}</span>
              <div className="fs">
                {f.length === 0 ? <span className="cl">Chiuso</span> : null}
                {f.map((x, i) => (
                  <span key={i} className="f">
                    <input type="time" aria-label={`${d.long}, apre alle`} value={x.from} onChange={(e) => setDay(d.n, f.map((y, j) => (j === i ? { ...y, from: e.currentTarget.value } : y)))} />
                    <span aria-hidden="true">–</span>
                    <input type="time" aria-label={`${d.long}, chiude alle`} value={x.to} onChange={(e) => setDay(d.n, f.map((y, j) => (j === i ? { ...y, to: e.currentTarget.value } : y)))} />
                    <button type="button" className="fa-ib" style={{ background: 'none', width: 36, height: 36 }} aria-label={`Togli la fascia ${x.from}–${x.to} di ${d.long}`} onClick={() => setDay(d.n, f.filter((_, j) => j !== i))}>
                      <Sv name="close" size={18} />
                    </button>
                  </span>
                ))}
                <span className="ac">
                  <button type="button" onClick={() => setDay(d.n, [...f, f.length === 0 ? { from: '09:00', to: '18:00' } : { from: '17:00', to: '21:00' }])}>
                    {f.length === 0 ? 'Aperto' : '+ Fascia'}
                  </button>
                  {f.length > 0 ? (
                    <button type="button" onClick={() => setDay(d.n, [])}>
                      Chiuso
                    </button>
                  ) : null}
                  <button type="button" onClick={() => copyAll(d.n)}>
                    Copia su tutti i giorni
                  </button>
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <Campo label="Nota sugli orari" value={value.note ?? ''} onChange={(v) => onChange({ ...value, note: v || undefined })} placeholder="es. Ultimo ingresso alle 16:30" maxLength={120} />
    </div>
  )
}
