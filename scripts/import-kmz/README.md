# Import della mappa Google (.kmz)

Porta nell'app i luoghi della tua mappa di Google My Maps **con il link al punto vero su Google Maps**
(scheda con foto, orari e recensioni), invece delle sole coordinate trovate da OpenStreetMap.

## Prima volta

1. Su Google My Maps apri la tua mappa → menu ⋮ accanto al titolo → **Esporta in KML/KMZ** → scegli la mappa intera
   (lascia *non* spuntato «Esporta in un file KML») → scarica il `.kmz`.
2. Mettilo in `private/mappa.kmz` (la cartella e i `.kmz` sono ignorati da git).
3. Servono `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` e il viaggio già creato, come per `import:sheet`.

## Uso

```
npm run import:kmz -- --file private/mappa.kmz --email tuo@indirizzo --trip "Giappone" --dry-run
npm run import:kmz -- --file private/mappa.kmz --email tuo@indirizzo --trip "Giappone"
```

- `--dry-run`: legge il database e mostra cosa farebbe, senza scrivere nulla.
- `--keep-coords`: non sposta i pin dei luoghi già presenti (di default prendono le coordinate di Google).
- `--force-links`: sostituisce anche i link già salvati (di default si riempiono solo quelli vuoti).
- `--no-new`: aggiorna solo i luoghi già presenti, non aggiunge quelli mancanti.
- `--radius 150`: raggio in metri per abbinare per vicinanza.

## Quale viaggio (importante)

La chiave di servizio vede i viaggi di **tutti** gli account e il titolo non è univoco, quindi lo script vuole
l'indirizzo email con cui accedi all'app (`--email`, oppure `IMPORT_EMAIL=...` in `.env.local`): considera solo i
viaggi di quell'account. Se ne restano più d'uno li elenca con titolo, date, id e account, e si sceglie con
`--trip-id`. Senza `--email` né `--trip-id` non scrive nulla.

## Cosa fa

- **Luoghi già nell'app** (stesso nome, anche nome locale, o vicinissimi con nome simile): ricevono il link di Google
  e il pin sulle coordinate di Google. Nome, categoria e note non si toccano.
- **Luoghi che nell'app non ci sono**: vengono aggiunti, con il *livello* della mappa come categoria
  (creata se manca), le note della descrizione e la città del luogo già presente più vicino (entro 30 km).
- Rilanciabile: non duplica nulla. L'elenco finale mostra anche gli abbinamenti sospetti (oltre 2 km).

## Mappe create da un foglio

Se la mappa è stata creata importando un foglio Google, il KMZ **non contiene coordinate né link**: solo nome,
indirizzo, tipologia, città e note (Google le calcola al momento, ma non le esporta). In quel caso il link è
`https://www.google.com/maps/search/?api=1&query=<nome + indirizzo>`: la stessa ricerca che fa la mappa, che apre
la scheda del luogo. I pin non si toccano. Tipologia e città servono per i luoghi nuovi.

## Come è fatto il link

Il file KMZ non contiene l'identificativo del locale su Google, quindi:

1. se nella descrizione del punto hai già incollato un link di Google Maps, viene usato quello;
2. altrimenti `https://www.google.com/maps/search/<nome>/@lat,lng,17z`: una ricerca per nome sulle coordinate esatte
   del tuo punto. Per i punti aggiunti cercando un locale su Google il nome coincide e si apre la scheda del posto.
   Per i punti messi a mano sulla mappa si apre la zona, con il nome cercato.
