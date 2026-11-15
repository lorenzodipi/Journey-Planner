// Prima la lingua (e il suo catalogo), poi l'app: così ogni modulo, anche le sue costanti, esce già tradotto.
import { avviaLingua } from './i18n'

void avviaLingua().then(() => import('./avvio'))
