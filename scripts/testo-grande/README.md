# Prova con il testo ingrandito

Simula il testo di sistema ingrandito di Android (la WebView moltiplica dimensione del testo e interlinea) e cerca i problemi.
Regole in `docs/linee-guida/05-css-e-stile.md`, «Testo di sistema ingrandito».

- `zoom.js`: da caricare prima della pagina con `window.__TZ = 1.3` (o 1.5, 2) davanti, per esempio con `page.add_init_script` di
  Playwright. Moltiplica `font-size` e interlinea fisse di tutte le regole CSS e degli stili in linea.
- `trova.js`: funzione da passare a `page.evaluate`. Restituisce scorrimento orizzontale, testi fuori schermo, fuori dal loro
  riquadro o tagliati e testi sovrapposti. Con `window.__tzRoot = 'dialog[open]'` guarda solo dentro un foglio aperto.

Si prova a 320, 360, 390 e 412 px, sulle pagine, sulle card aperte e sui fogli. Il risultato con il testo normale
(`__TZ = 1`) fa da base: alcune voci (testi con i puntini, numeri grandi) ci sono già e non sono problemi.
