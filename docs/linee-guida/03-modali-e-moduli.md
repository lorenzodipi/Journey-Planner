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

1. **Prima l'essenziale, poi il resto.** In cima i campi senza cui l'elemento non ha senso (che cosa, quando, dove), in fondo quelli che servono raramente. Se un campo può compilare gli altri (il link di Google Maps nell'alloggio, la ricerca nel luogo), viene **per primo**.
2. **Gruppi con un titolo.** Un modulo con più di 8 campi si divide in gruppi, ognuno con un titolo breve: `Gruppo` (`src/faraway/Moduli.tsx`), dentro un modulo con la classe `frm grp`.
   - Trasporto: *Tragitto* · *Costo* · *Biglietto* · *Regole e note* · *Altri dettagli*
   - Volo: *Volo* · *Tratte* · *Costo* · *Bagaglio e regole* · *Altri dettagli*
   - Alloggio: *Dove* · *Quando* · *Costo* · *Camera e contatti* · *Altri dettagli*
   - Prenotazione: *Che cosa* · *Quando* · *Costo* · *Fornitore e allegato* · *Altri dettagli*
   - Luogo: *Trova il luogo* · *Il luogo* · *La visita* · *Posizione* · *Nel viaggio* · *Altri dettagli*
   - Spesa: niente gruppi (meno di 8 campi).
3. **Spazio come separatore**: 16 px tra i campi dello stesso gruppo, 32 px tra un gruppo e l'altro. Niente linee in più.
4. **«Altri dettagli»** (`AltriDettagli`): l'**ultimo gruppo** del foglio, con i campi rari (terminal, binario, gate, imbarco, fusi, apertura del check-in, contatti, cancellazione, coordinate). Da chiuso è **solo un titolo** come gli altri gruppi, con la freccia e sotto che cosa contiene («Terminal, binario, check-in») o quanti campi sono compilati («2 compilati»): niente fondo, niente card. Aperto mostra i campi sotto, come un gruppo normale. Si apre da solo se in modifica un campo è compilato (non per i campi che si compilano da soli, come le coordinate) e a ogni salvataggio con un errore al suo interno.
5. Il pulsante «Salva» non cambia posto e non si disabilita: si valida al salvataggio e si porta il foglio al primo errore.

## Componenti dei moduli (`src/faraway/Moduli.tsx`)

| Componente | Quando | Note |
| --- | --- | --- |
| `Percorso` | Partenza → arrivo, check-in → check-out | Due punti su una linea, ognuno con il suo micro-titolo («Partenza», «Arrivo») e i campi «Luogo» o «Aeroporto», «Data», «Ora». In mezzo la durata («3 h 29 min», «5 notti») solo se si può calcolare. Mai etichette come «Partenza, data». |
| `Riquadri` | Una scelta tra poche opzioni importanti: mezzo, tipo, stato, categoria | Riquadri con il glifo dello sprite (`g-tra-*`, `g-cat-*`, `g-sez-*`) o un'icona; una riga sotto può dire la conseguenza. 3 o 4 per riga; sotto i 300 px l'etichetta passa a 12 px. |
| `PerChi` | «Per chi» di costi e spese | Una persona: non si mostra. Due: «Tutti», «Solo io», «Solo <l'altra>». Da tre: «Tutti», «Solo io», «Scegli» con l'elenco delle persone e la spunta; la scelta non resta mai vuota («Serve almeno una persona»). Senza «io» nel viaggio, «Solo io» non c'è. |
| `IlCostoE` | «A persona» / «Totale» | Sotto ogni riquadro l'altra lettura («160,00 € in tutto», «40,00 € a testa»). Con una persona sola non si mostra. |
| `Contatore` | Numeri piccoli: persone, ospiti | − n +, 44 px; con `vuoto` il numero si può togliere («—», non indicato). |
| `SegmentiFacoltativi` | Scelta breve che si può lasciare vuota (fermate) | La stessa scelta toccata di nuovo si toglie. |
| `Micro` | Titolo dentro un gruppo (una tratta, l'apertura del check-in) | `h4` (o `h5` dentro una tratta). |

Le chip restano per le scelte multiple e le liste lunghe (pasti e servizi, «Pagato da», «Quanto ci si ferma», «L'ora è»).

## Blocchi che si ripetono

Lo stesso blocco ha **lo stesso nome e lo stesso ordine** in tutti i fogli.

| Blocco | Ordine fisso | Nomi |
| --- | --- | --- |
| Persone e costo | Per chi → Costo e Valuta → Il costo è (A persona / Totale) → Pagato → Pagato da | «Per chi», «Costo», «Valuta», «Il costo è», «Pagato» |
| Quando | `Percorso`: partenza (o check-in) → arrivo (o check-out), con la durata | «Partenza» / «Arrivo», campi «Data» e «Ora» |
| Codice | Un campo solo | «Codice di prenotazione» |
| Note | In fondo all'ultimo gruppo prima di «Altri dettagli» | «Note» |

## Campi

- Ogni campo ha un'**etichetta visibile** (`Campo label=…`). Il segnaposto non la sostituisce mai.
- Il **segnaposto** è un esempio realistico e corto, sempre con «es.»: «es. 15,50», «es. Doppia». Non ripete l'etichetta (i campi «Data» e «Ora» non ne hanno), non sembra un valore già inserito, nei campi a metà larghezza sta in circa 16 caratteri. Se non c'è un buon esempio, niente segnaposto.
- Due campi affiancati (`.fa-2c`) solo se le etichette stanno su una riga e i valori sono corti (data e ora, città e indirizzo). Un nome che può essere lungo (nome del volo) va a tutta larghezza. Un campo da solo va a tutta larghezza: niente buchi a metà riga (`.fa-2c.riempi` allarga l'ultimo se sono dispari).
- Data e ora affiancate usano `.dt` (data più larga dell'ora). Sotto i 340 px di modulo le icone di calendario e orologio spariscono, così il valore si legge intero. Un orario scritto a mano («15:00–22:00») va a tutta larghezza.
- Dentro un gruppo (es. una tratta del volo) niente bordo e padding in più: il titolo basta.
- Gruppi di scelta (chip): **vanno a capo** (`.fa-chips.wrap`), non scorrono di lato. Un gruppo di scelta ha la sua etichetta visibile.
- Allegati: mai l'`<input type="file">` del browser in vista. Input nascosto e pulsante secondario («Allega PDF o immagine», «Aggiungi foto o PDF»).
- Interruttori: l'etichetta descrive lo stato acceso («Pagato», «Disponibile offline», «Dura più giorni»), il suggerimento sotto spiega l'effetto. Un campo che serve solo a volte compare quando si accende il suo interruttore («Fino al»).
- Un'informazione compare una volta sola: niente due righe con lo stesso cambio.

## Testi nei fogli

- Titolo: «Nuovo …» o «Modifica …». Pulsante primario: «Salva il …» o «Aggiungi …».
- Errori sotto il campo che li causa, con la soluzione: «Scrivi il prezzo con le cifre, es. 15,50».
- Aiuti sotto il campo, in `.fa-help`, solo se aggiungono qualcosa («Da mostrare a un tassista»).

## Modale al centro

- Disco con icona sopra il titolo: cestino rosso per le conferme definitive, spunta verde per gli esiti.
- Le conferme (`alert`) non si chiudono toccando il velo, solo con i pulsanti, Esc o indietro.
- All'apertura il focus va al modale, non al primo pulsante.
