# 02 · Regole generali

## Come si lavora

### Con Lorenzo
- Si risponde **in italiano**, in modo sintetico.
- Se un dubbio cambia che cosa costruire, o un'azione è distruttiva o ambigua, **si chiede prima**.
- Si fa solo quello che è stato chiesto: se chiede un'analisi non si tocca il codice; se chiede una issue non la si risolve.
- Una issue risolta si chiude su GitHub via REST (`gh api -X PATCH repos/lorenzodipi/Journey-Planner/issues/N -f state=closed -f state_reason=completed`): «Chiude #N» nel commit non basta.
- Prima di cambiare un'interfaccia importante si mostra un mock se lo chiede; nei mock si usano i dati veri del viaggio.

### Repo e Git
- Si lavora solo su `lorenzodipi/Journey-Planner`, direttamente su `main`. Ogni push pubblica il sito e costruisce APK e IPA.
- Messaggi di commit in italiano e descrittivi, con i trailer `Co-Authored-By` e `Claude-Session` della sessione.
- Prima di ogni push: `npx tsc --noEmit -p .`, `npx vitest run`, e `npm run test:sql` se si tocca lo schema.
- Dopo il push si controlla che `origin/main` coincida con `HEAD`.

### Database
- Le migrazioni stanno in `supabase/migrations/NNNN_nome.sql`, numerate in ordine, **additive** (colonne nullable, tabelle nuove, `grant` espliciti) e rilanciabili (`if not exists`, `create or replace`).
- Il file si salva su Git e la migrazione la esegue Claude sul progetto Supabase (strumento `apply_migration`); se mancano i permessi, si chiede a Lorenzo. L'app deve funzionare anche prima che siano eseguite: si scrive una colonna nuova solo quando serve e, se manca, si mostra un messaggio chiaro («Per … serve la migrazione 0045 del database.»).
- I dati di prova e le modifiche ai dati veri si fanno con il suo consenso esplicito.

### Codice
- **Prima si cerca nella libreria, poi si costruisce**: componenti Faraway (`src/faraway/base.tsx` e vicini), poi `react-aria-components`. Solo se non c'è nulla si scrive a mano.
- Nessuna dipendenza nuova se non serve.
- `localStorage` sempre in `try/catch`, solo per comodità del singolo dispositivo.
- **Uscire dall'account non lascia niente sul telefono** (`src/lib/datiLocali.ts`, `cancellaDatiLocali()`): copia dei viaggi, coda delle modifiche, nome del profilo, ultimo account, percorsi, meteo, foto, documenti offline e la loro chiave, file dei biglietti (IndexedDB), sessione, avvisi programmati. Si cancella ogni chiave che inizia per `jp.` o `sb-`, quindi **ogni dato nuovo dell'app va salvato con una chiave `jp.…`**: viene cancellato da solo. Restano solo l'aspetto (tema, ora e unità, stile della mappa: `CHIAVI_DA_TENERE`); una nuova impostazione che è del telefono e non dell'account va aggiunta lì. Lo stesso pulisce quando la sessione finisce da sola e quando entra un account diverso dall'ultimo (la coda del precedente non parte mai con l'account nuovo). L'app non usa cookie. Se ci sono modifiche non inviate, «Esci dall'account» chiede conferma.
- Azioni di massa in **una sola chiamata API**; dopo una scrittura si ricarica solo il gruppo di dati toccato.
- La logica che si può testare sta in `src/lib/` con il suo `*.test.ts`.

## Navigazione

- La freccia in alto a sinistra **sale alla pagina madre** della sezione, non torna alla pagina precedente. Da un giorno si torna a Giorni anche dopo aver scorso tre giorni di fila. Lo swipe dal bordo (iOS) e il tasto indietro (Android) fanno lo stesso, dopo aver chiuso un foglio aperto.
- Le pagine sorelle (giorno precedente e successivo) si sostituiscono nella cronologia invece di accumularsi.
- Le pagine che si aprono da due schede (oggi solo Budget, da Spese e da Altro) tornano a quella da cui si è arrivati: l'elenco è `DA_PIU_SCHEDE` in `indietro.ts`.
- La logica sta in `src/lib/indietro.ts`: `genitore()` dice la madre di ogni percorso, `tornaSu()` ci va.
- **Da dare e da ricevere**: in alto (Spese e Oggi dopo il viaggio) ci sono sempre due riquadri, «Da dare» e «Da ricevere», anche a 0 €, solo con il totale (niente nomi). Sono la somma delle card aperte di «Il mio bilancio» (`totaliAperti` in `src/lib/debitiSpese.ts`): **niente si compensa da solo**, né nei riquadri né nelle card; compensare è una scelta di chi usa l'app, voce per voce. Gli importi lunghi si restringono alla larghezza della card (container query).
- **Pagamenti tra persone (migrazione 0047)**: niente doppia conferma. «Ho pagato» e «Bilancia tutte le spese» creano righe già `confermato` (RPC `declare_settlements`, con `group_id` comune alle righe di una stessa bilancia). Chi riceve non conferma: vede un avviso **solo nell'app** (banner in Oggi e Spese, pallino sulla scheda Spese; mai push: l'IPA non firmata non le riceve) e, se non torna, dal menu ⋮ della card sceglie **Reclamo** (`dispute_settlement`): la voce torna aperta come «Contestato», visibile a entrambi. Chi ha creato il pagamento può annullarlo dallo stesso menu. Le richieste `in_attesa` di prima restano com'erano (si confermano con «Rispondi»). Prima della 0047 l'app funziona: «Ho pagato» singolo ricade sul vecchio flusso con conferma, «Bilancia» dice che manca la migrazione.
- **Spesa cancellata**: i pagamenti legati a una spesa cancellata non contano più (né nelle card né nei saldi: `rimborsiValidi` in `src/lib/rimborsi.ts` e, per i saldi di tutti, `my_confirmed_settlements` dalla 0048); in una «Bilancia», se sparisce una spesa compensata, saltano tutte le compensazioni del gruppo e le altre spese tornano aperte. Non si cancella niente: se la spesa torna, tornano i pagamenti. Il foglio «Eliminare la spesa?» lo dice quando c'è un pagamento. I pagamenti senza spesa (quelli di prima della 0042) restano.
- **Bilancia tutte le spese**: nella ricevuta, accanto a «X deve N a Y» se ci sono io; la possono premere entrambi. Chiude tutte le card dirette tra le due persone: le voci opposte si compensano (`compensation`, in cronologia «Compensato», non «ha pagato»), il resto è un pagamento vero. Il piano è `pianoBilancia` in `src/lib/debitiSpese.ts`; si conferma in un foglio e compare solo se c'è qualcosa da chiudere.
- **Il mio bilancio**: «Filtri e ordine» (`FiltriBilancio.tsx`, logica in `src/lib/filtriBilancio.ts`) per persona, categoria, stato, date, importo, con ordinamento per data, importo, categoria, persona. Il totale di sezione conta solo le voci mostrate.
- **Tempo reale**: le modifiche degli altri compaiono da sole. Ogni tabella con dati del viaggio (con `trip_id`) va in `WATCHED_TABLES` (`src/state/trips.tsx`), nel gruppo giusto di `scopeOfTable` e in una migrazione che la aggiunge alla pubblicazione `supabase_realtime` (come 0011 e 0046): se manca, l'altra persona vede il dato solo dopo aver ricaricato. Oggi non sono ascoltate `checklist_checks`, `booking_items`, `documents`, `ticket_codes` e `activity_log`.
- **Posizione di scorrimento** (`src/lib/posizioni.ts`, usata da `ScrollToTop` in `app.tsx`): una pagina aperta toccando una voce riparte dall'alto; con «Indietro» (bottone, tasto o gesto di sistema, tasto del browser) la pagina madre ritrova la posizione che aveva. Vale per tutte le pagine; le posizioni stanno solo in memoria. Se la pagina non è ancora alta abbastanza, riprova per ~650 ms e si ferma se la persona tocca o scorre. Cambiando scheda dalla barra in basso si riparte dall'alto. Ogni nuovo «Indietro» deve passare da `tornaSu` (o dalla cronologia del browser), non da un `navigate` a mano, altrimenti la posizione non si ripristina.
- **Testa fissa nelle pagine principali** (Oggi, Giorni, Luoghi, Spese, Altro): la barra con titolo e sottotitolo resta sempre visibile in cima, scorre solo il resto. Si attiva con `fisso` su `Schermata`; quello che deve restare fermo insieme alla barra va in `fissa`: il saluto con il profilo in Oggi, la ricerca in Giorni e Altro, la ricerca, la scelta Elenco/Mappa e i filtri in Luoghi. Il meteo, i banner e gli avvisi scorrono. Un filo sottile compare in fondo alla testa solo quando il contenuto scorre sotto di lei. La sua altezza è in `--head-h`, usata da `scroll-padding-top` perché gli scroll automatici non finiscano nascosti. Sotto i 700 px di altezza il sottotitolo si nasconde per lasciare spazio alla lista. Le pagine interne (un giorno, una prenotazione) non la usano.

## Azioni, conferme e annullamenti

| Situazione | Che cosa si fa |
| --- | --- |
| Azione frequente e reversibile (eliminare una tappa, una spesa, archiviare un luogo) | Si fa subito e si offre **Annulla** nel messaggio in basso |
| Azione che riguarda altri ma si può recuperare (togliere una persona, eliminare una prenotazione) | Foglio di conferma dal basso, con titolo che nomina azione e oggetto |
| Azione definitiva che cancella molto (eliminare un viaggio) | **Modale al centro** (`useConfermaCentrata`), poi l'esito in un altro modale al centro (`showAvviso`) |

- Il titolo di una conferma nomina azione e oggetto: «Eliminare «Giappone»?». Il testo dice che cosa si perde. I pulsanti sono «Elimina il …» (rosso) e «Tieni il …», con la stessa forma.
- Dopo l'eliminazione di un viaggio si va a «Tutti i viaggi», mai dentro un altro viaggio scelto dall'app.

## Caricamenti

- Ogni scrittura che aspetta il server mostra la **barra d'attesa** in cima (`BarraAttesa`), che compare dopo 150 ms per non lampeggiare.
- Il pulsante premuto mostra la rotellina (`isLoading` di `Pulsante`, con `useInCorso()` per sapere quale). Dove c'è una conferma, la rotellina parte dopo la conferma.
- Le modifiche frequenti (spunte, stato delle tappe) passano dalla coda locale e non aspettano: lì non serve caricamento.
- Il primo caricamento dell'app usa gli skeleton (`SchermataCaricamento`).
- Quello che arriva dalla rete dopo (il meteo, l'anteprima di un file) mostra uno **scheletro** con la stessa forma e altezza del contenuto (`.fa-sk`, `MeteoScheletro`), così quando arriva non sposta nulla. Lo scheletro compare solo se c'è una risposta da aspettare (rete presente, niente copia sul telefono) e sparisce anche se la richiesta fallisce o non risponde. Le rotelle (`Loader`) restano per le azioni dell'utente (ricerca, mappa).

## Offline

- Le modifiche frequenti si salvano sul telefono e partono quando torna la rete. Ogni schermata dice se i dati sono aggiornati.
- Le azioni che richiedono il server (inviti, eliminazioni di viaggio, file) dicono chiaramente che serve la connessione.

## Spostamenti tra le tappe

- Il viaggio ha un mezzo di solito usato («In auto», «Con i mezzi», «A piedi») e una soglia «A piedi se ci vogliono meno di» (15 minuti se non scelta), in «Modifica viaggio». Senza scelta l'app propone l'auto dove serve (paesi senza metro, noleggio auto tra le prenotazioni), ma non mostra avvisi nella pagina del giorno.
- Ogni spostamento si può cambiare dalla sua riga tra le due tappe: mezzo e, se la si conosce, durata vera, che vince sulla stima. Quello scelto a mano resta anche se cambia il mezzo del viaggio; scegliere il mezzo che il viaggio darebbe comunque non lo fissa.
- Ordine: scelta a mano → trasporto del giorno che copre il tratto → a piedi se breve → mezzo del viaggio. La logica sta in `src/lib/spostamenti.ts`.
- Sulla mappa a piedi e in auto (o taxi) si va lungo le strade (OSRM, profili `foot` e `car`); con i mezzi e i trasporti del giorno in linea d'aria tratteggiata.

## Riepilogo dopo il viaggio

- Sotto il totale ci sono **sempre due blocchi**, mai uno solo con un buco accanto.
- Ogni statistica compare solo se ha un valore che dice qualcosa. Se non ce l'ha si passa alla successiva (`statisticheDopo()` in `src/lib/oggi.ts`), e l'ultima riserva c'è sempre.
- Una barra o una legenda senza dati (es. nessuna città) non si mostra.

## Checklist

- «Dove» compare solo in gruppo: due persone → «Tutti» e «Solo io»; da tre in su anche «Scegli».
- Quando entra una persona nuova, le voci «per tutti» già scritte restano delle persone di prima (trigger `checklist_fissa_per_chi`).

- **Nome del profilo**: si imposta da Altro → Profilo → «Cambia il nome» ed è quello già scritto in «Il tuo nome» quando si crea un viaggio (poi si cambia per ogni viaggio). Sta nell'account (`user_metadata.display_name`, il «Display name» che si vede anche in Supabase, nessuna migrazione); in demo e con i dati salvati, sul telefono. Senza nome scelto si usa quello dell'account o, in mancanza, l'email.
