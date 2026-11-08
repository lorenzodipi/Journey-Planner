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
- Le esegue Lorenzo nello SQL Editor. L'app deve funzionare anche prima che siano eseguite: si scrive una colonna nuova solo quando serve e, se manca, si mostra un messaggio chiaro («Per … serve la migrazione 0044 del database.»).
- I dati di prova si inseriscono con il suo consenso esplicito.

### Codice
- **Prima si cerca nella libreria, poi si costruisce**: componenti Faraway (`src/faraway/base.tsx` e vicini), poi `react-aria-components`. Solo se non c'è nulla si scrive a mano.
- Nessuna dipendenza nuova se non serve.
- `localStorage` sempre in `try/catch`, solo per comodità del singolo dispositivo.
- Azioni di massa in **una sola chiamata API**; dopo una scrittura si ricarica solo il gruppo di dati toccato.
- La logica che si può testare sta in `src/lib/` con il suo `*.test.ts`.

## Navigazione

- La freccia in alto a sinistra **sale alla pagina madre** della sezione, non torna alla pagina precedente. Da un giorno si torna a Giorni anche dopo aver scorso tre giorni di fila. Lo swipe dal bordo (iOS) e il tasto indietro (Android) fanno lo stesso, dopo aver chiuso un foglio aperto.
- Le pagine sorelle (giorno precedente e successivo) si sostituiscono nella cronologia invece di accumularsi.
- La logica sta in `src/lib/indietro.ts`: `genitore()` dice la madre di ogni percorso, `tornaSu()` ci va.

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

## Offline

- Le modifiche frequenti si salvano sul telefono e partono quando torna la rete. Ogni schermata dice se i dati sono aggiornati.
- Le azioni che richiedono il server (inviti, eliminazioni di viaggio, file) dicono chiaramente che serve la connessione.

## Riepilogo dopo il viaggio

- Sotto il totale ci sono **sempre due blocchi**, mai uno solo con un buco accanto.
- Ogni statistica compare solo se ha un valore che dice qualcosa. Se non ce l'ha si passa alla successiva (`statisticheDopo()` in `src/lib/oggi.ts`), e l'ultima riserva c'è sempre.
- Una barra o una legenda senza dati (es. nessuna città) non si mostra.

## Checklist

- «Dove» compare solo in gruppo: due persone → «Tutti» e «Solo io»; da tre in su anche «Scegli».
- Quando entra una persona nuova, le voci «per tutti» già scritte restano delle persone di prima (trigger `checklist_fissa_per_chi`).
