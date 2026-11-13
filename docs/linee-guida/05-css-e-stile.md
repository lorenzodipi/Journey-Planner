# 05 · CSS e stile

## Dove sta il CSS

| File | Che cosa contiene |
| --- | --- |
| `src/faraway/faraway.css` | Token (righe dei temi `[data-theme="light"]` e `[data-theme="dark"]`) e CSS dei componenti del design system (`.fa-*`, `.k-<Componente>`) |
| `src/faraway/app.css` | Regole dell'app sopra il design system e, in fondo, le correzioni del **solo tema scuro** (`[data-theme="dark"] …`) |
| `src/styles.css` | Tailwind v4 e base |

I componenti del design system (`.k-Ticket`, `.k-Riepilogo`, …) vengono dalle anteprime di «Faraway Definitivo»: le classi interne coincidono con quelle delle anteprime.

## Token, non valori

- Colori solo da token: `var(--ink)`, `var(--surface-card)`, `var(--azzurro-solid)`… Mai un esadecimale in un componente se esiste il token. Le poche eccezioni del tema scuro (veli `rgba(…)` sui biglietti, rossi dei pulsanti Elimina) stanno in fondo ad `app.css` con un commento.
- Ogni token ha un ruolo: un token di bordo non diventa colore del testo, un fondo non diventa testo. Se un ruolo non ha token, si aggiunge il token.

### Ruoli principali

| Token | Ruolo |
| --- | --- |
| `--canvas` | Sfondo delle schermate |
| `--surface-soft` / `--surface-card` / `--surface-high` | Gradini di superficie: gruppi, card e fogli, elementi dentro una card |
| `--hairline` | Filetto decorativo da 1 px |
| `--border-strong` | Bordo dei controlli (3:1) |
| `--ink` / `--ink-muted` | Testo e testo secondario |
| `--azzurro` / `--on-azzurro` | Azione primaria, interruttori accesi, chip scelte |
| `--azzurro-solid` / `--on-azzurro-solid` | Tab attiva, intestazioni dei calendarietti, badge |
| `--azzurro-ink` | Link e icone d'azione |
| `--azzurro-soft` | Fondo tenue di selezione, pulsante secondario tenue |
| `--tinta-*`, `--bordo-*`, `--on-tinta*` | Card colorate (azzurro, acqua, lavanda, rosa, pietra) |
| `--disco-*` | I 19 colori dei dischi di icone e avatar, uguali nei due temi |
| `--danger`, `--success`, `--warning` | Stati, sempre con icona e parola |
| `--focus` | Anello di focus |

## Temi

- **Due temi, sempre.** Ogni schermata si controlla in chiaro e in scuro.
- Il tema scuro cambia **solo la palette**: forma, misure e struttura dei componenti sono quelle del chiaro. Un cambio di forma richiede l'ok di Lorenzo.
- Scuro: scala di blu-grigi poco saturi (`--canvas` `#0D1118` → `--surface-card` `#1E2534` → `--surface-high` `#323D54`), testo `#F2F4F8`, azzurro `#6EA6FF` con testo scuro. Mai nero puro.
- Rossi nello scuro: `--danger` `#FA5252`. Pulsanti Elimina ed Esci: fondo `rgba(0,0,0,.3)`, testo `#ff6b6bf5`, bordo `#fa525266`. Mai rosato o pastello.
- Pulsanti e pillole dentro una card in tinta, nello scuro: velo bianco al 10% per le azioni normali, fondo scuro al 30% per Elimina e «Non pagato».
- Il tema si sceglie con `data-theme` sulla radice, guidato dall'impostazione dell'utente o del telefono. `theme-color`: `#FAF7F3` chiaro, `#0D1118` scuro.

## Spazio e misure

- **Multipli di 8 px** per margini, padding e distanze (4 px solo dentro un componente piccolo).
- Margine laterale delle schermate 16 px.
- Raggruppare con lo spazio: la distanza tra due gruppi è almeno il doppio di quella dentro un gruppo (16 → 32).
- Misure dei controlli: pulsante 48 px (piccolo 44), campo 56, chip 36, riga di lista ≥ 44, barra delle schede 64.
- Raggi: 8 px pulsanti e campi, 12 px card, 16 px card in evidenza e biglietti, 24 px fogli e modali, `9999px` chip e pillole.
- Ombre poche: `--shadow-xs` su pulsanti e campi, `--shadow-card` sulle card in tinta nel chiaro. La profondità viene dalla superficie.

## Pieghevoli e schermi grandi

Le soglie sono le classi di larghezza di Android/Material, in px CSS (= dp nella WebView):

| Larghezza | Dispositivi | Che cosa cambia |
| --- | --- | --- |
| < 600 | Telefoni, schermo esterno dei pieghevoli | Niente: è l'app di sempre (colonna fino a 480 px, barra delle schede in basso) |
| 600–839 | Pieghevole aperto in verticale | **Vista stretta**, come il telefono: una colonna (fino a 840 px, margini di 24 px), barra delle schede in basso a tutta larghezza (lo schermo resta simmetrico rispetto alla piega); fogli fino a 640 px. Nessuna pagina si divide in colonne |
| ≥ 840 | Pieghevole aperto in orizzontale, tablet | **Vista larga**: barra laterale (navigation rail, 80 px), margini di 32 px, due colonne «a bento», griglie e viste affiancate |

**Regola**: dove il menu è in basso la vista è stretta, dove è laterale è larga. Colonne e griglie nascono tutte da 840 px, mai da 600: a 600 px le colonne sarebbero larghe ~260 px e i testi si sovrapporrebbero.

- Tutto sta nel blocco «Schermi grandi e pieghevoli» in fondo a `faraway.css`: sotto i 600 px nessuna regola cambia. Ogni modifica qui va controllata a 320, 344, 360, 390 e 412 px confrontando gli screenshot pixel per pixel prima e dopo.
- **Due colonne**: `Affianca` e `Colonna` (`src/faraway/shell.tsx`). Sul telefono sono `display: contents`, cioè non esistono: ordine, spazi e aspetto restano identici. Da 840 px diventano una griglia a due colonne. `Colonna lato="sinistra|destra"` sceglie il lato, `tutta` va da un bordo all'altro.
- **Niente vuoti tra i blocchi**: ogni colonna è una pila a sé, con 16 px tra un blocco e l'altro. Lo schema «sinistra, destra `alta`, sinistra» mette il secondo gruppo di sinistra subito sotto il primo (la riga 1 è alta quanto il primo gruppo, il resto della colonna alta va nella riga 2). Mai due gruppi affiancati riga per riga quando le altezze possono differire: le righe si accoppiano e aprono buchi.
- **Gruppo mobile** (`Colonna mobile`): nello schema «sinistra, destra `alta`, sinistra» il secondo gruppo di sinistra può passare sotto la colonna alta, se lì ci sta senza farla diventare più lunga della sinistra (`spostaADestra` in `shell.tsx`, misura dal vivo). Esempio: in Oggi durante il viaggio il cambio valuta va a destra sotto le tappe o «Giornata finita» quando sono corte, e resta in basso a sinistra quando le tappe sono lunghe. Non va usato dove l'ordine conta (in Spese i pulsanti restano sotto «Da dare» e «Da ricevere»).
- **Elenchi di gruppi** (voli, alloggi, prenotazioni, trasporti, categorie della checklist): `Affianca pesi={...}` divide i gruppi in due colonne indipendenti nel punto in cui i pesi (di solito il numero di righe) si bilanciano. L'ordine resta quello del codice, prima tutta la sinistra; un gruppo solo va a tutta larghezza. Aprire una carta non sposta i gruppi da una colonna all'altra.
- **Ordine nelle due colonne**: gli elenchi di card o biglietti (Trasporti, Alloggi, Voli, Prenotazioni, Documenti, Viaggi) vanno a righe, cioè 1 a sinistra, 2 a destra, 3 a capo sotto l'1 e così via: `Affianca uguali` senza `pesi`. Dettaglio spese e Checklist vanno a righe nello stesso modo (`Affianca` senza `pesi`, altezze naturali). `Affianca pesi={…}` (colonne indipendenti, prima tutta la sinistra poi la destra) resta solo per Impostazioni.
- **Righe di pari altezza** (`Affianca uguali`, classe `fa-uguali`): due card sulla stessa riga hanno sempre la stessa altezza; la più bassa si adatta alla più alta (la card si allunga, il testo di troppo va a capo, non esce). Nei gruppi (`.fa-gruppo`: titolo + card) il gruppo è l'unità della riga e l'ultima card si allunga. Vale solo da chiuse: aprendo una card la riga cresce ma la vicina chiusa resta alta come prima, con vuoto sotto (`align-self:start` sulla vicina di una card con `aria-expanded="true"`, via `:has()`). Se una card è sola resta in una colonna.
- **Pagine a due colonne** (tutte con `Affianca`/`Colonna`, sul telefono identiche a prima): Profilo (a sinistra icona, nome e «Cambia il nome»; a destra i tre riquadri e i distintivi; «Esci» sotto il profilo), Impostazioni (4 gruppi con i pesi), Viaggiatori (persone a sinistra, inviti a destra), Documenti, Dettaglio spese (un gruppo per giorno), Il mio bilancio («Da dare» e «Da ricevere»), Viaggi (i viaggi si alternano sinistra/destra; con un viaggio solo sta a sinistra, non a tutta larghezza; anche gli archiviati). Una pagina nuova a colonna unica non va lasciata a tutta larghezza da 840 px in su: si divide in colonne o si limita.
- **Testi grandi nelle colonne**: dimensioni fisse oltre 40 px si stringono con la carta (`container-type: inline-size` e `min(54px, 17.5cqi)` come i codici dei biglietti), le etichette lasciano spazio alle illustrazioni nell'angolo.
- **Giorni: città in fila** (`.fa-flusso` in `Giorni.tsx`). Sul pieghevole ogni città è un blocco largo quanto i suoi giorni e i blocchi vanno a capo come le parole di un testo, in ordine di data da sinistra a destra. Stessa pagina e stessi calendarietti del telefono, dove il contenitore non esiste. Mai una vista pensata solo per il pieghevole.
- **Luoghi con la mappa accanto** (`src/faraway/mappaAccanto.ts`, classe `.fa-lmappa`): da 840 px (pieghevole aperto in orizzontale, computer) non c'è «Elenco | Mappa». L'elenco resta a sinistra largo come un telefono (con la piega verticale finisce sulla piega) e la mappa sta ferma a destra, con gli stessi filtri e la stessa ricerca dell'elenco. Toccare un pin fa scorrere l'elenco fino alla card e la evidenzia, senza card sulla mappa; toccare una card accende il suo pin ma la mappa non si sposta. Le card dell'elenco hanno tre colonne: disco, testo, e a destra la freccia sopra e «Maps» sotto, con lo stesso bordo destro; se la card è stretta (sotto 380 px) «Maps» resta solo icona, con il nome nell'aria-label. Sotto 840 px, e a libro mezzo aperto, tutto resta com'è sul telefono.
- **Giorni con il giorno accanto** (stessa regola dei 840 px, `useVistaAccanto`, classi `.fa-gaccanto` e `.fa-gpanel`): a sinistra Giorni largo come un telefono, con i calendarietti al massimo su 3 colonne; a destra il dettaglio del giorno, uguale alla pagina Giorno del telefono ma senza «Indietro» e senza barra delle schede. Prima e dopo il viaggio è scelto il primo giorno, durante il viaggio oggi. Il giorno scelto è nell'indirizzo (`/giorni/:id`): toccarne un altro sostituisce l'indirizzo invece di aggiungerne uno, e il calendarietto scelto resta evidenziato e in vista. Un viaggio senza giorni mostra Giorni come sul telefono.
- **Stessa riga, stessa altezza**: calendarietti, card dei luoghi e ogni riquadro affiancato si allungano fino al più alto della riga, con il contenuto al centro. Le intestazioni dei blocchi in fila hanno righe fisse (testo troncato con «…»), così i calendarietti partono tutti alla stessa altezza. Una card aperta non allunga quella accanto.
  - L'ordine visivo segue l'ordine del codice: quello che viene prima sta a sinistra o in alto, così il lettore di schermo legge nello stesso ordine.
  - Accoppiate in uso: Home prima del viaggio (biglietto + tappe | Le mie cose), durante (ora, meteo, cambio | programma di oggi), dopo (riepilogo + giorni | il viaggio in numeri); Giorno (mappa, meteo, alloggio, spese | tappe); Spese (riepilogo + collegamenti | ricevuta); Altro (viaggio attuale | account, poi le sezioni su due colonne).
- **Piega** (plugin `@erkamyaman/capacitor-foldable`, avviato in `main.tsx` solo nell'app): mette su `<html>` `.fold-vertical` / `.fold-horizontal` e `--fold-left`, `--fold-width`. Con la piega verticale le due colonne si dividono esattamente sulla piega: la sua banda è lo spazio tra le colonne, mai meno di 24 px. Con la piega orizzontale (pieghevole in orizzontale) i contenuti che scorrono la attraversano, come previsto dalle linee guida.
- **Cerniera** a pieghevole mezzo aperto: a libro (`horizontal-viewport-segments: 2` nel browser, classe `.horizontal-viewport-segments-2` del plugin nell'app) l'app sta tutta nel segmento destro, come su un telefono, a una colonna; a tavolino (`vertical-viewport-segments: 2` / `.vertical-viewport-segments-2`) i fogli si aprono nella metà bassa.
- **Android**: sotto i 600 dp di lato corto l'app resta in verticale; da 600 in su gira con il dispositivo (`MainActivity`), senza riavviarsi quando si piega o si apre. Mai bloccare l'orientamento sugli schermi grandi: da Android 16 il sistema lo ignora comunque.
- Le liste che diventano griglie usano `repeat(auto-fill, minmax(…, 1fr))` e `align-items: start`, così una card aperta non allunga quella accanto.

## Tipografia

- Tutto in **Inter** (variabile, caricata in locale da `src/fonts/`). Il nome «faraway» del logo è disegnato da Fredoka; le etichette giapponesi usano Zen Kaku Gothic New, solo nei viaggi in Giappone.
- Scala: titoli 32/28/24/20 px semibold con spaziatura leggermente negativa; testo 16 px (`.fa-b` grassetto), secondario 14 px (`.fa-m`), aiuti 13 px (`.fa-help`), etichette della barra 12 px. Niente sotto 12 px.
- Interlinea senza unità o in px coerenti con la scala; più di due righe → almeno 1,4.
- Importi, orari e contatori con `font-variant-numeric: tabular-nums`.
- Niente maiuscolo esteso nei titoli.

## Componenti da riusare

`Pulsante` (`primary`, `secondary`, `secondary-soft`, `tertiary`, `tertiary-destructive`, `size="sm"`, `isLoading`), `PulsanteIcona`, `Chip`, `Campo`, `CampoValuta`, `CampoFuso`, `Interruttore`, `Segmenti`, `Foglio`, i pezzi dei moduli in `Moduli.tsx` (`Gruppo`, `AltriDettagli`, `Percorso`, `Riquadri`, `PerChi`, `IlCostoE`, `Contatore`, `SegmentiFacoltativi`, `Micro`), `useConferma`, `Modale`, `useConfermaCentrata`, `showAvviso`, `MenuAzioni` (tre puntini verticali con popover a freccia), `Riga`, `Pillola`, `Avatar`, `BarraAttesa`, `useInCorso`.

Prima di scrivere un elemento nuovo: cercarlo in `src/faraway/`, poi in `react-aria-components`.

- `MenuScelta` (`src/faraway/MenuScelta.tsx`): il pulsante lo disegna chi lo usa; il pannello `.fa-selpop` sta sopra il contenuto (z-index 50, sopra la barra delle schede), largo come il pulsante. Prende la classe del componente (`ambito`, es. `k-Tappa`) così le regole delle righe (`.op`, `.ox`, `.cn`, `.dn`) valgono anche fuori dalla card.
- Nomi delle classi: prima di sceglierne una nuova, cercarla nel CSS (`fa-sel` esisteva già e dava uno sfondo al contenitore).
- Le opzioni di `Segmenti` sono `<label class="fa-segr">` del `RadioGroup` e hanno le stesse regole dei pulsanti dei segmenti, compresa la larghezza minima della parola più lunga.
- Avvisi in basso: `.fa-toasts` (posizione) e `.fa-toast` (pillola scura sul chiaro, chiara sullo scuro).

## Movimento

- Transizioni, non keyframe, per gli stati interattivi. Proprietà nominate (`transition: transform 180ms …`), mai `all`.
- Uscita dal basso dei fogli 220 ms `cubic-bezier(.32,.72,0,1)`; modale al centro 200 ms `cubic-bezier(.23,1,.32,1)` da scala 0,96.
- Sotto `prefers-reduced-motion: reduce` solo dissolvenze.

## Che cosa non scrivere

- Esadecimali o `rgb()` nei componenti quando c'è un token.
- Regole del tema scuro che cambiano forma (bordi in più, padding, raggi): nello scuro cambia solo il colore.
- `outline: none` senza un focus visibile al suo posto.
- `height` fissa su contenitori di testo; `100vh` (si usa `100dvh`).
- Estetica «da AI»: card tutte uguali, gradienti decorativi, barre colorate a sinistra, maiuscoletto ovunque, emoji nei testi.
- `transition: all`, `will-change` messo per abitudine.
