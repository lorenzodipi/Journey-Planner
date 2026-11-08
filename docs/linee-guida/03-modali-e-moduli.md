# 03 · Modali e moduli

Fogli dal basso, modali al centro e i moduli che contengono. I fogli sono la parte più densa dell'app: le regole qui servono a tenerli ordinati senza togliere informazioni.

## Quale contenitore

| Contenitore | Quando | Componente |
| --- | --- | --- |
| Foglio dal basso | Aggiungere o modificare un elemento, scegliere, filtrare, confermare un'azione recuperabile | `Foglio` (`src/faraway/Foglio.tsx`), `useConferma()` |
| Modale al centro | Confermare un'azione definitiva, comunicare un esito da leggere | `Modale`, `useConfermaCentrata()`, `showAvviso()` (`src/faraway/Modale.tsx`) |
| Messaggio in basso | Esito breve di un'azione, con eventuale «Annulla» | `showToast()` |

Tutti usano `<dialog>` nativo aperto con `showModal()`: focus intrappolato, sfondo inerte, Esc e tasto indietro di Android chiudono.

## Struttura del foglio

- **Testata**: «Chiudi» a sinistra, titolo al centro («Nuovo trasporto», «Modifica alloggio»).
- **Corpo**: scorre da solo, il resto del foglio no.
- **Piede**: un solo pulsante primario, fisso in basso e sempre visibile («Salva il trasporto»). Le azioni secondarie (Elimina) stanno nel corpo, in fondo.
- Il foglio segue il contenuto fino al 90% dello schermo, poi scorre. Con la tastiera aperta sale sopra di essa.

## Moduli: l'ordine delle cose

1. **Prima l'essenziale, poi il resto.** In cima i campi senza cui l'elemento non ha senso (che cosa, quando, dove), in fondo quelli che servono raramente.
2. **Gruppi con un titolo.** Un modulo con più di 8 campi si divide in 3–4 gruppi, ognuno con un titolo breve (una sezione con `h3`; il componente comune è da introdurre). Esempi:
   - Trasporto: *Tragitto* · *Costo* · *Biglietto* · *Regole e note*
   - Volo: *Volo* · *Tratte* · *Costo* · *Bagaglio e regole*
   - Alloggio: *Dove* · *Quando* · *Costo* · *Camera e contatti*
   - Prenotazione: *Che cosa* · *Quando* · *Costo* · *Fornitore e allegato*
   - Luogo: *Trova il luogo* · *Il luogo* · *La visita* · *Posizione*
3. **Spazio come separatore**: 16 px tra i campi dello stesso gruppo, 32 px tra un gruppo e l'altro. Niente linee in più.
4. **«Altri dettagli»**: i gruppi rari (terminal, binario, gate, check-in, politica di cancellazione, contatti, coordinate) stanno dentro una sezione chiusa con il conteggio dei campi compilati («Altri dettagli · 2 compilati»). Se in modifica uno di quei campi è già compilato, la sezione si apre da sola.
5. Il pulsante «Salva» non cambia posto e non si disabilita: si valida al salvataggio e si porta il foglio al primo errore.

## Blocchi che si ripetono

Lo stesso blocco ha **lo stesso nome e lo stesso ordine** in tutti i fogli.

| Blocco | Ordine fisso | Nomi |
| --- | --- | --- |
| Persone e costo | Per chi → Costo e Valuta → Il costo è (A persona / Totale) → Pagato → Pagato da | «Per chi», «Costo», «Valuta», «Il costo è», «Pagato» |
| Quando | Data e ora di partenza (o check-in) → data e ora di arrivo (o check-out) | «Partenza, data» / «Partenza, ora» |
| Codice | Un campo solo | «Codice di prenotazione» |
| Note | In fondo | «Note» |

## Campi

- Ogni campo ha un'**etichetta visibile** (`Campo label=…`). Il segnaposto non la sostituisce mai.
- Il **segnaposto** è un esempio realistico e corto, sempre con «es.»: «es. 15,50», «es. Doppia». Non ripete l'etichetta, non sembra un valore già inserito, nei campi a metà larghezza sta in circa 16 caratteri. Se non c'è un buon esempio, niente segnaposto.
- Due campi affiancati (`.fa-2c`) solo se le etichette stanno su una riga e i campi sono corti (data e ora, città e indirizzo). Un campo da solo va a tutta larghezza: niente buchi a metà riga.
- Dentro un gruppo incorniciato (es. una tratta del volo) niente bordo e padding in più: il titolo basta. A 320 px un campo affiancato deve mostrare il valore intero.
- Gruppi di scelta (chip): **vanno a capo** (`.fa-chips.wrap`), non scorrono di lato, così ogni opzione si vede. Un gruppo di scelta ha la sua etichetta visibile.
- Allegati: mai l'`<input type="file">` del browser in vista. Input nascosto e pulsante secondario («Allega PDF o immagine», «Aggiungi foto o PDF»).
- Interruttori: l'etichetta descrive lo stato acceso («Pagato», «Disponibile offline»), il suggerimento sotto spiega l'effetto.
- Un'informazione compare una volta sola: niente due righe con lo stesso cambio arrotondato in modo diverso.

## Testi nei fogli

- Titolo: «Nuovo …» o «Modifica …». Pulsante primario: «Salva il …» o «Aggiungi …».
- Errori sotto il campo che li causa, con la soluzione: «Scrivi il prezzo con le cifre, es. 15,50».
- Aiuti sotto il campo, in `.fa-help`, solo se aggiungono qualcosa («Da mostrare a un tassista»).

## Modale al centro

- Disco con icona sopra il titolo: cestino rosso per le conferme definitive, spunta verde per gli esiti.
- Le conferme (`alert`) non si chiudono toccando il velo, solo con i pulsanti, Esc o indietro.
- All'apertura il focus va al modale, non al primo pulsante.
