# 04 · Accessibilità

Obiettivo: **WCAG 2.2 livello AA** in chiaro e in scuro, su telefono, con VoiceOver e TalkBack. Un'eccezione si discute, non si fa in silenzio.

## Struttura

- Una pagina, un `h1`. Dove il titolo non si vede (Oggi) c'è comunque, con `className="sr-only"` (mai `display: none`, che lo nasconde anche agli screen reader).
- Un solo `main` visibile; la barra delle schede è un `nav`.
- Elementi nativi prima di ARIA: `<button>` per le azioni, `<a href>` per la navigazione, `<dialog>` per fogli e modali.

## Nomi accessibili

- Ogni pulsante solo icona ha un `aria-label` che nomina l'azione: «Chiudi», «Profilo di Lorenzo», «Azioni su Hotel Asakusa».
- Le icone decorative hanno `aria-hidden="true"`.
- Immagini: decorative `alt=""` (copertine, illustrazioni); informative con un testo che dice che cosa mostrano («Foto di Torre di Belém», «Anteprima di Passaporto.pdf»).

## Tastiera e focus

- Tutto si raggiunge e si usa con la tastiera. Esc chiude fogli e modali; il focus torna a chi li ha aperti.
- Focus visibile: anello `--focus` da 3 px con scarto di 2 px, su `:focus-visible`. Mai `outline: none` senza un sostituto.
- Niente `tabindex` positivi.

## Moduli

- Ogni campo ha `<label for>` (lo fa `Campo`). Il segnaposto non è un'etichetta.
- `type` e `inputMode` giusti: `decimal` per gli importi, `email`, `tel`, `date`, `time`.
- Validazione al salvataggio, mai disabilitando «Salva». Il campo sbagliato ha `aria-invalid`, l'errore è collegato con `aria-describedby` ed è annunciato; il foglio scorre al primo errore (`useVaiAllErrore`).
- Testo dei campi a **16 px** almeno, così iOS non ingrandisce la pagina.

## Bersagli di tocco

- Minimo WCAG 24×24 px; nell'app **44×44 px** per pulsanti, righe e icone, 48 px per i pulsanti principali, 56 px per i campi. Le chip sono alte 36 px con area di tocco da 44 px.
- Le aree di tocco non si sovrappongono.

## Colore e contrasto

- Testo 4,5:1 sul fondo su cui sta davvero (3:1 da 24 px o 18,67 px in grassetto). Bordi dei controlli, icone che portano significato e anello di focus 3:1.
- Il colore non è mai l'unico segnale: ogni stato ha anche icona o parola («Pagato» con la spunta, «Non pagato» con l'orologio).
- I bordi decorativi possono stare sotto 3:1 solo se il controllo si riconosce da testo e icona (es. il bordo dei pulsanti Elimina nello scuro).

## Movimento

- Ogni animazione rispetta `prefers-reduced-motion`: senza movimento resta solo una dissolvenza o una pulsazione d'opacità.
- Niente che si muove da solo per più di 5 secondi senza poterlo fermare.

## Annunci

- Messaggi in basso e barra d'attesa: regione `role="status"` già montata, il testo cambia dentro.
- Errori di campo: `role="alert"` sul testo collegato al campo.

## Zoom e larghezze

- Nessuno scorrimento orizzontale a 320 px; testo leggibile al 200%.
- Contenitori di testo con `min-height`, mai altezza fissa. A 320 px un valore in un campo affiancato si vede intero.

## Controlli prima di consegnare

1. Screenshot di chiaro e scuro a 390 e 320 px della schermata toccata.
2. Audit automatico (axe-core) delle pagine toccate: nessuna violazione di contrasto o di nome.
3. Giro con la tastiera: ogni controllo raggiungibile, focus visibile, Esc chiude.
4. Quello che non si è potuto verificare si dice esplicitamente.

## Scorrere non è scegliere

- Le righe di chip che scorrono di lato (`.fa-chips.scroll`) non devono selezionare nulla quando il dito si alza dopo uno scorrimento. Nei pulsanti e nei link non si imposta `touch-action: manipulation`: Safari, con quel valore, non annulla il «press» di react-aria durante lo scroll e il chip sotto il dito si attiva. Si usa `pan-x pan-y pinch-zoom` (come fa react-aria), che toglie comunque il ritardo del doppio tocco.
- `Chip` ignora in più il «press» di un dito che si è mosso di oltre 10 px o che ha fatto scorrere un contenitore negli ultimi 120 ms (`eScorrimento` in `src/faraway/base.tsx`); tastiera e lettori di schermo non sono toccati.
