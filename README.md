# Journey Planner

Planner di viaggio personale, pensato per il telefono: crei e modifichi viaggi, giorni, tappe, luoghi, alloggi e soldi direttamente dal sito, anche senza rete.

- **Sito**: https://lorenzodipi.github.io/Journey-Planner/
- **Stack**: Vite + TypeScript + Preact + Tailwind, PWA installabile, Supabase (Postgres, Auth, Storage) come backend, GitHub Pages per l'hosting.
- **Roadmap e decisioni**: nel Project "Journey Planner" su claude.ai (doc "Roadmap di progetto").

> Il repo è **pubblico**: non committare mai dati personali (prenotazioni, polizze, indirizzi privati), file `.env` o la chiave `service_role` di Supabase. Il `.gitignore` esclude `.env*`, `private/`, `*.xlsx` e `*.csv`.

## Avvio in locale

Serve Node 22 o superiore.

```bash
npm install
npm run dev          # http://localhost:5173/Journey-Planner/
```

Senza variabili d'ambiente l'app parte in **modalità demo**, con dati fittizi.
Per collegare Supabase copia `.env.example` in `.env.local` e compila:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxx
```

Sono valori pubblici per progettazione: la sicurezza sta nella Row Level Security. Non inserire mai la `service_role` / secret key.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm run build` | Controllo dei tipi e build di produzione in `dist/` |
| `npm run preview` | Prova la build locale |
| `npm test` | Test unitari (voli, soldi, luce, ordinamento) |
| `npm run test:sql` | Test della sicurezza RLS su un Postgres in memoria (PGlite) |

## Configurare Supabase (una volta)

1. Crea un progetto (piano Free, regione UE). Impostazioni del progetto: **Data API** attiva, **Automatically expose new tables** disattivato, **Automatic RLS** attivo.
2. **Authentication → Sign In / Providers → Email**: disattiva le nuove registrazioni.
3. **Authentication → Users → Add user**: crea gli utenti (email, password, conferma automatica).
4. **SQL Editor**: incolla ed esegui `supabase/migrations/0001_init.sql`. Esegui lo script una sola volta.
5. **Authentication → URL Configuration**: Site URL `https://lorenzodipi.github.io/Journey-Planner/`.
6. **Project Settings → API**: copia Project URL e publishable/anon key.

Per far vedere un viaggio a un altro utente (il proprietario del viaggio esegue):

```sql
select add_member_by_email('<id-del-viaggio>', 'email@esempio.it', 'editor');
```

## Pubblicare su GitHub Pages

> **Da fare una volta**: i due file di `docs/github-workflows/` (`deploy.yml`, `keepalive.yml`) vanno spostati in `.github/workflows/`. Quella cartella è protetta e gli strumenti di Claude non possono scriverci.

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: aggiungi `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (sono pubbliche, vanno come *variabili*, non come segreti).
3. Ogni push su `main` esegue controlli, test e deploy (`.github/workflows/deploy.yml`).

## Tenere sveglio Supabase (piano Free)

Il piano Free mette in pausa il progetto dopo 7 giorni di inattività, e riattivarlo richiede la dashboard. Tre protezioni:

1. **GitHub Action** `keepalive.yml`: legge la tabella `health` ogni 3 giorni.
2. **Ping a ogni apertura dell'app** (`pingSupabase` in `src/lib/supabase.ts`).
3. **Ping esterno gratuito** (consigliato, perché GitHub disattiva i workflow programmati dopo 60 giorni senza attività nel repo): su cron-job.org o UptimeRobot crea un controllo ogni 2–3 giorni su
   `https://<progetto>.supabase.co/rest/v1/health?select=ok&limit=1`
   con l'header `apikey: <publishable key>`.

## Struttura

```
src/
  app.tsx, main.tsx        shell, router ad hash, registrazione del service worker
  pages/                   Oggi, Giorni, Mappa, Luoghi, Altro, Login
  ui/                      componenti (barra in basso, barra della luce, card)
  lib/                     supabase, auth, sun, flights, money, position, dates
  state/                   viaggio attivo (per ora demo)
  demo/                    dati fittizi per l'anteprima
supabase/
  migrations/0001_init.sql schema, RLS, storage, keep-alive
  tests/rls.test.mjs       test della sicurezza
.github/workflows/         deploy.yml, keepalive.yml
```

## Stato

Sprint 0 completato: scheletro PWA, tema per viaggio, login con password, schema del database con RLS testata. Prossimi passi: viaggi e giorni (Sprint 1), itinerario e luoghi (Sprint 2).
