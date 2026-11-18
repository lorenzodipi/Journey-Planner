// Testo scritto a mano (note) con i link riconosciuti: si toccano e si aprono fuori dall'app. L'etichetta è il link senza
// protocollo, su una riga sola con i tre puntini se non ci sta; il link intero resta nel nome per il lettore di schermo.
import { pezziConLink } from '../lib/link'
import { t } from '../i18n'

export function TestoConLink({ testo }: { testo: string }) {
  return (
    <>
      {pezziConLink(testo).map((p, i) =>
        'url' in p ? (
          <a key={i} className="fa-lnk fa-url" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={t('Apri il link {v0}', { v0: p.etichetta })} title={p.url}>
            {p.etichetta}
          </a>
        ) : (
          <span key={i}>{p.testo}</span>
        ),
      )}
    </>
  )
}
