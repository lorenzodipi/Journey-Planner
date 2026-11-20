// Allerte di viaggio (Oggi e Giorno): la più grave in grande, le altre in righe; ognuna apre il suo dettaglio.
// Il livello è sempre scritto a parole; colore e cornice lo rinforzano soltanto (`src/lib/allerte.ts`).
import { useState } from 'react'
import { Foglio } from './Foglio'
import { Pulsante } from './base'
import { cx } from './cx'
import type { Allerta, LivelloAllerta, TipoAllerta } from '../lib/allerte'
import { t as tt } from '../i18n'

const LIVELLO: Record<LivelloAllerta, () => string> = {
  pericolo: () => tt('Pericolo'),
  attenzione: () => tt('Attenzione'),
  info: () => tt('Da sapere'),
}

const PATH: Record<TipoAllerta, string> = {
  pioggia: 'M3 12a9 9 0 0 1 18 0zM12 12v6a2 2 0 0 1-4 0',
  temporale: 'M6 16a4 4 0 0 1 .5-8A6 6 0 0 1 18 9a3.5 3.5 0 0 1 0 7M12 13l-2 4h4l-2 4',
  vento: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8',
  neve: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4.5l3 2 3-2M9 19.5l3-2 3 2',
  caldo: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 10v7',
  freddo: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 15v2M18 4v4M16 6h4',
  terremoto: 'M2 12h4l2-5 3 10 3-14 3 12 2-3h3',
}

function Icona({ tipo, size = 22 }: { tipo: TipoAllerta; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATH[tipo]} />
    </svg>
  )
}

const Freccia = () => (
  <svg className="chv" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

/** Le allerte già in ordine (la più grave prima). Niente allerte, niente riquadro. */
export function Allerte({ allerte }: { allerte: Allerta[] }) {
  const [aperta, setAperta] = useState<Allerta | null>(null)
  if (allerte.length === 0) return null
  const [prima, ...altre] = allerte
  return (
    <div className="k-Allerte">
      {/* «alert» solo per il pericolo: le altre si annunciano senza interrompere il lettore di schermo */}
      <div role={prima.livello === 'pericolo' ? 'alert' : 'status'}>
        <button type="button" className={cx('al', prima.livello)} aria-haspopup="dialog" onClick={() => setAperta(prima)}>
          <span className="ai"><Icona tipo={prima.tipo} /></span>
          <span className="tx">
            <span className="lv">{LIVELLO[prima.livello]()}</span>
            <span className="v">{prima.titolo}</span>
            <span className="s">{prima.testo}</span>
            <span className="f">{prima.fonte}</span>
          </span>
          <Freccia />
        </button>
      </div>
      {altre.length > 0 ? (
        <ul className="ls" aria-label={tt('Altre allerte')}>
          {altre.map((a) => (
            <li key={a.id}>
              <button type="button" className="r" aria-haspopup="dialog" onClick={() => setAperta(a)}>
                <span className={cx('d', a.livello)}><Icona tipo={a.tipo} size={16} /></span>
                <span className="x">
                  <span className={cx('lv', a.livello)}>{LIVELLO[a.livello]()}</span>
                  <b>{a.titolo}</b>
                  <span>{a.fonte}</span>
                </span>
                <Freccia />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Foglio open={aperta !== null} title={aperta?.titolo ?? ''} onClose={() => setAperta(null)}>
        {aperta ? (
          <div className="k-AllertaDettaglio">
            <span className={cx('lv', aperta.livello)}>{LIVELLO[aperta.livello]()}</span>
            <p className="tx">{aperta.testo}</p>
            <dl>
              {aperta.dettagli.map((d) => (
                <div key={d.k}>
                  <dt>{d.k}</dt>
                  <dd>{d.v}</dd>
                </div>
              ))}
            </dl>
            {aperta.url ? (
              <Pulsante color="secondary" href={aperta.url} target="_blank">
                {tt('Apri la pagina ufficiale')}
              </Pulsante>
            ) : null}
            <p className="nota">{tt('Le allerte dell\'app si aggiornano quando la apri e non sostituiscono gli avvisi di emergenza del telefono: controlla che siano attivi.')}</p>
          </div>
        ) : null}
      </Foglio>
    </div>
  )
}
