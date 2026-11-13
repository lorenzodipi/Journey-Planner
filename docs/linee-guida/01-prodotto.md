# 01 · Il prodotto

## A che cosa serve

Journey Planner, con il nome e il marchio **Faraway**, è un planner di viaggio pensato per il telefono. Accompagna un viaggio dall'idea al ritorno: si costruiscono i giorni e le tappe, si salvano i luoghi, si tengono insieme alloggi, voli, trasporti, prenotazioni, documenti e soldi, e alla fine resta un riepilogo da rivedere e condividere.

- Si usa **dal telefono**, spesso con una mano e in movimento: tutto è pensato prima per uno schermo da 360–430 px.
- Si modifica **tutto dall'app**, mai dalla repo o da un foglio di calcolo.
- Funziona **anche senza rete**: le modifiche frequenti partono subito sul telefono e si inviano quando torna la connessione.
- È **condiviso**: un viaggio ha più viaggiatori, ognuno con il suo account; spese e saldi si dividono tra loro.

È disponibile come sito (GitHub Pages, PWA installabile) e come app Android e iOS (Capacitor). Backend: Supabase (Postgres con Row Level Security, Auth, Storage).

## Per chi

Per chi organizza un viaggio con amici o in coppia e vuole un posto solo per il programma, i biglietti e i conti. Il primo utente è Lorenzo, che lo usa per i viaggi veri (Giappone, novembre–dicembre 2026). I dati di prova si prendono da lì, senza mai mettere dati personali nella repo pubblica.

## Le sezioni

La barra in basso ha cinque schede. Ogni pagina interna appartiene a una scheda, e la freccia in alto a sinistra torna sempre a quella scheda.

| Scheda | Che cosa mostra | Pagine interne |
| --- | --- | --- |
| **Oggi** | Il viaggio adesso: prima della partenza il conto alla rovescia, durante il giorno corrente con meteo e orologi, dopo il riepilogo del viaggio | — |
| **Giorni** | I giorni del viaggio come calendarietti | Un giorno con le sue tappe |
| **Luoghi** | I luoghi salvati, in elenco o su mappa | — |
| **Spese** | Speso, budget, saldi | Budget, Dettaglio, Il mio bilancio |
| **Altro** | Tutto il resto | Alloggi, Voli, Trasporti, Prenotazioni, Documenti, Checklist, Viaggiatori, Profilo, Impostazioni (con Registro modifiche e Dati sul telefono) |

- **Dettaglio spese**: i gruppi sono per **giorno d'acquisto**, non d'utilizzo. Una spesa registrata a mano ha la data scelta; le spese che nascono da alloggi, voli, trasporti e prenotazioni pagati hanno il giorno in cui la voce è stata inserita nell'app (`createdAt`, nel fuso del telefono); senza quella data (demo, dati vecchi) vale il giorno d'uso. Regola in `giornoAcquisto` (`src/lib/spese.ts`); vale anche per il filtro per data.
- **Esporta il riepilogo** (l'immagine con statistiche e bilancio) sta in Impostazioni, nella sezione «Copie e file», non più in Altro.

«Tutti i viaggi» (`/viaggi`) è fuori dalle schede: niente barra in basso, niente freccia, l'avatar del profilo in alto a destra.

## I concetti

| Concetto | Che cos'è |
| --- | --- |
| Viaggio | Destinazione, date, fusi, valute, budget e viaggiatori. Si può archiviare (reversibile) o eliminare (definitivo) |
| Giorno | Una data del viaggio, con città e tappe |
| Tappa | Un elemento del giorno: luogo, pasto, attività libera, nota. Ha uno stato: da fare, fatta, saltata, rimandata |
| Luogo | Un posto salvato, con categoria e stato (da visitare, in programma, visitato, scartato) |
| Alloggio, volo, trasporto, prenotazione | I biglietti del viaggio. Se hanno un costo diventano spese |
| Spesa | Importo, valuta, chi ha pagato, come si divide. Da qui nascono saldi e rimborsi |
| Checklist | Voci comuni (per tutti o per persone scelte) e voci private |
| Documento | Un file caricato, visibile a tutti, ad alcuni o solo a chi lo carica |

## Voce e tono

- Sempre **in italiano**, con il **tu**, frasi brevi e verbi concreti.
- Pulsanti: verbo più oggetto. «Salva il trasporto», «Elimina il viaggio», «Tieni il viaggio». Mai «OK», «Sì», «No».
- Conferme: brevi, senza «con successo». «Spesa registrata.» «Viaggio eliminato.»
- Errori: dicono che cosa è successo e che cosa fare. Mai «Ops», mai punti esclamativi.
- Stati vuoti: dicono che cosa manca e offrono il passo successivo.
- Tempo: si parla di quanto manca. «Mancano 12 giorni a Lisbona.»
- Formati: data «ven 14 nov» nel testo, `gg/mm/aaaa` in bilancio e rimborsi; ora «19:30»; valuta «86,00 €»; durata «1 h 30».
- Le etichette giapponesi compaiono solo nei viaggi in Giappone. L'interfaccia delle valute extra compare solo se il viaggio ne ha.

## Che cosa non fare

- Non modificare mai la repo `stefanoVeni/iceland-roadtrip`: non è nostra.
- Non committare dati personali (prenotazioni, polizze, indirizzi), file `.env` o la chiave `service_role` di Supabase. La repo è pubblica.
- Non aggiungere funzioni che l'app non ha in un mock senza dirlo: i mock mostrano prima l'app com'è, poi le proposte.
