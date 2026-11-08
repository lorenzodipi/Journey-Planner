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

## Tipografia

- Tutto in **Inter** (variabile, caricata in locale da `src/fonts/`). Il nome «faraway» del logo è disegnato da Fredoka; le etichette giapponesi usano Zen Kaku Gothic New, solo nei viaggi in Giappone.
- Scala: titoli 32/28/24/20 px semibold con spaziatura leggermente negativa; testo 16 px (`.fa-b` grassetto), secondario 14 px (`.fa-m`), aiuti 13 px (`.fa-help`), etichette della barra 12 px. Niente sotto 12 px.
- Interlinea senza unità o in px coerenti con la scala; più di due righe → almeno 1,4.
- Importi, orari e contatori con `font-variant-numeric: tabular-nums`.
- Niente maiuscolo esteso nei titoli.

## Componenti da riusare

`Pulsante` (`primary`, `secondary`, `secondary-soft`, `tertiary`, `tertiary-destructive`, `size="sm"`, `isLoading`), `PulsanteIcona`, `Chip`, `Campo`, `CampoValuta`, `CampoFuso`, `Interruttore`, `Segmenti`, `Foglio`, i pezzi dei moduli in `Moduli.tsx` (`Gruppo`, `AltriDettagli`, `Percorso`, `Riquadri`, `PerChi`, `IlCostoE`, `Contatore`, `SegmentiFacoltativi`, `Micro`), `useConferma`, `Modale`, `useConfermaCentrata`, `showAvviso`, `MenuAzioni` (tre puntini verticali con popover a freccia), `Riga`, `Pillola`, `Avatar`, `BarraAttesa`, `useInCorso`.

Prima di scrivere un elemento nuovo: cercarlo in `src/faraway/`, poi in `react-aria-components`.

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
