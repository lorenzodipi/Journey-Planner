# Journey Planner — istruzioni per agenti

Prima di toccare il codice leggi le linee guida in [docs/linee-guida](docs/linee-guida/README.md): prodotto, regole generali, modali e moduli, accessibilità, CSS e stile.

In breve:
- Rispondi in italiano. Chiedi prima di azioni distruttive o ambigue. Fai solo ciò che è richiesto.
- Lavora su `main` di `lorenzodipi/Journey-Planner`; mai su `stefanoVeni/iceland-roadtrip`.
- Prima del push: `npx tsc --noEmit -p .` e `npx vitest run`.
- Riusa i componenti di `src/faraway/` e `react-aria-components` prima di scrivere elementi nuovi.
- Chiaro e scuro sempre; nel tema scuro cambia solo la palette. Spaziature a multipli di 8 px, WCAG 2.2 AA, controlli a 390 e 320 px.
- Migrazioni in `supabase/migrations/`, additive e rilanciabili: le esegue Lorenzo.
