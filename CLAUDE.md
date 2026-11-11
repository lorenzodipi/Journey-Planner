# Journey Planner — istruzioni per agenti

Prima di toccare il codice leggi le linee guida in [docs/linee-guida](docs/linee-guida/README.md): prodotto, regole generali, modali e moduli, accessibilità, CSS e stile. Qui sotto c'è il riassunto delle regole da seguire sempre e dei controlli da rifare a ogni modifica.

## Come si lavora con Lorenzo
- Rispondi **in italiano**, in modo sintetico. Alla fine: che cosa è cambiato, che cosa hai controllato, che cosa non hai potuto provare (per esempio un dispositivo vero).
- Chiedi prima di azioni distruttive o ambigue. Fai solo ciò che è richiesto: un'analisi o un mock non toccano il codice; quello che noti ma non ti è stato chiesto lo segnali, non lo fai.
- Se una domanda resta senza risposta, non procedere su quel punto.

## Sicurezza e repo
- Lavora solo su `main` di `lorenzodipi/Journey-Planner`. **Mai** modificare `stefanoVeni/iceland-roadtrip`: non è di Lorenzo.
- La repo è **pubblica**: mai committare dati personali, email, file `.env*`, la chiave `service_role` di Supabase.
- Ogni push pubblica il sito e costruisce APK e IPA.
- Commit in italiano e descrittivi, con i trailer `Co-Authored-By` e `Claude-Session` della sessione. Dopo il push `origin/main` deve coincidere con `HEAD`.

## Prima di ogni push (NRT)
1. `npx tsc --noEmit -p .`
2. `npx vitest run`
3. `npm run test:sql` se tocchi lo schema.
4. Confronto pixel per pixel prima/dopo (base presa con `git stash`) delle pagine principali sui telefoni.
5. Per modifiche grandi l'NRT si fa **almeno due volte**.

Rumore noto del confronto: i pin della mappa nella pagina di un giorno e una riga di 1 px sotto la barra in alto (dissolvenza). Cambiano a ogni giro anche senza modifiche: tutto il resto deve essere identico.

## Telefoni: non cambiano
- Sotto i 600 px l'app è quella di sempre. Una modifica pensata per pieghevoli o computer **non deve cambiare un pixel sui telefoni**, salvo che sia la correzione di un bug: va verificato con il confronto pixel per pixel, non a occhio.
- Larghezze da controllare: **320, 344, 360, 390, 412** (telefoni), **600, 690, 839** (pieghevole in verticale), **882 con la piega** e **1280** (pieghevole in orizzontale, computer). Sempre in chiaro **e** scuro.
- Controlla anche che nulla esca dai bordi (testi sotto le icone, pulsanti sopra le frecce, scorrimento orizzontale).

## Finestre e pieghevoli (dettagli in 05-css-e-stile)
- **< 600**: telefono.
- **600–839**: due colonne «a bento» con `Affianca` e `Colonna` di `src/faraway/shell.tsx`. Mai vuoti tra i blocchi. `Colonna mobile` passa sotto la colonna alta solo se ci sta (`spostaADestra`); non va usata dove l'ordine conta (in Spese i pulsanti restano sotto «Siete in pari»).
- **≥ 840** (e non a libro mezzo aperto): barra laterale e viste affiancate.
  - **Luoghi**: elenco + mappa (`.fa-lmappa`). Card a tre colonne: freccia sopra, «Maps» sotto, stesso bordo destro.
  - **Giorni**: elenco + giorno scelto (`.fa-gaccanto`, `.fa-gpanel`). All'apertura il primo giorno, o oggi durante il viaggio; toccando un giorno l'indirizzo si sostituisce.
  - Regola in `src/faraway/mappaAccanto.ts`.
- **A libro mezzo aperto** l'app sta in un segmento ed è un telefono. Le classi del plugin `capacitor-foldable` sono `.fold-vertical`, `--fold-left` e `.horizontal-viewport-segments-2`.
- Stessa riga, stessa altezza: calendarietti, card dei luoghi, riquadri affiancati. Le card strette si adattano con le container query, non con la larghezza della finestra.

## Interfaccia
- Riusa i componenti di `src/faraway/` e `react-aria-components` prima di scrivere elementi nuovi. Una scelta da un elenco è un `<select>` vero (`Select`, `CampoPaese`), non un testo con suggerimenti.
- Chiaro e scuro sempre; nel tema scuro cambia solo la palette. Spaziature a multipli di 8 px. WCAG 2.2 AA: aree di tocco da 44 px, etichette uniche (un foglio e il suo campo non hanno lo stesso nome), `aria-label` sui pulsanti con sola icona.
- **Ogni campo ha un segnaposto**, generico: mai nomi di posti, città o persone vere («es. Nome del posto», non «es. Fushimi Inari»). `segnaposto()` in `src/faraway/base.tsx` fa da riserva.
- «Indietro» sale alla pagina madre (`src/lib/indietro.ts`). Le pagine aperte da due schede tornano a quella di partenza (`DA_PIU_SCHEDE`, oggi Budget).

## Supabase
- Migrazioni in `supabase/migrations/NNNN_nome.sql`, additive e rilanciabili. Si salvano su Git e le esegue Claude su Supabase; se mancano i permessi, si chiede a Lorenzo. L'app deve funzionare anche prima della migrazione.
- **Scritture sui dati veri solo con il consenso esplicito di Lorenzo**, anche per correggere dati sbagliati (per esempio luoghi con città «Chiyoda» invece di «Tokyo»).
- Nome del profilo: `user_metadata.display_name`, cioè il «Display name» in Authentication → Users, con una copia sul telefono in demo. Nessuna tabella. È il nome proposto in ogni nuovo viaggio; nel viaggio vale quello del viaggiatore.
- Geocodifica: Nominatim, con Photon come riserva quando è bloccato o per CORS. I quartieri di Tokyo diventano «Tokyo».

## Provare in locale
- Senza le variabili Supabase l'app parte in **demo** con dati fittizi. Avvio: `npx vite --port 5199 --strictPort --host 127.0.0.1`, indirizzo `http://127.0.0.1:5199/Journey-Planner/`.
- Nei test con Playwright blocca le richieste esterne (`https`), fissa l'orologio per avere prima, durante e dopo il viaggio, e prova anche i casi vuoti (viaggio senza tappe, senza giorni).

## Documentazione
- Quando una regola cambia, aggiorna il file giusto in `docs/linee-guida/` **nello stesso commit**, e questo file se cambia una regola di lavoro o un controllo.
