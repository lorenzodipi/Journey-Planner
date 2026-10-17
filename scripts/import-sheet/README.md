# Import dello Sheet

Porta nel database i dati del vecchio Google Sheet (luoghi, hotel, trasporti, spese previste).
Si lancia dal tuo PC, una volta (o più volte: non duplica nulla).

## Prima volta

1. `npm install`
2. Esporta lo Sheet da Google (File → Scarica → Microsoft Excel) e mettilo in `private/viaggio.xlsx`.
   La cartella `private/` e i file `.xlsx` sono ignorati da git: i dati personali non finiscono nel repo pubblico.
3. In `.env.local` aggiungi `SUPABASE_SERVICE_ROLE_KEY=...`
   (Supabase → Project Settings → API Keys → chiave *secret*). Solo lì, mai altrove.
4. Crea il viaggio dall'app (titolo, date, viaggiatori) se non l'hai già fatto.

## Uso

```
npm run import:sheet -- --file private/viaggio.xlsx --dry-run
npm run import:sheet -- --file private/viaggio.xlsx --trip "Giappone"
```

- `--dry-run` legge e conta, non scrive nulla e non cerca le coordinate.
- `--trip` è il titolo (anche una parte) del viaggio già creato.
- `--skip-geocode` salta la ricerca delle coordinate (i luoghi non hanno il pin).

Le coordinate vengono cercate con Nominatim (OpenStreetMap), 1 richiesta al secondo: per 140 luoghi servono 3–5 minuti.
I risultati restano in `private/geocode-cache.json`, quindi un secondo lancio è immediato.
Quelli non trovati sono elencati a fine corsa e in `private/import-report.txt`: nell'app si sistemano spostando il pin.

## Cosa importa

Luoghi (con tipologia → categoria, città, note), alloggi, trasporti, voci di spesa previste, e la città dei giorni ricavata dagli alloggi.
**Non importa** la colonna «Dettagli» del foglio Principale (può contenere codici di prenotazione e di polizza) né i voli: quelli si inseriscono dall'app.

## Opzioni

`private/import-config.json` (facoltativo): `{ "blockCities": ["Nome città da ignorare"] }`.
