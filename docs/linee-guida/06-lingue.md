# Lingue

L'app parla italiano e inglese. Le frasi si scrivono **in italiano nel codice** e passano da `t()`; la traduzione inglese sta in `src/i18n/en.json`, con la frase italiana come chiave. Aggiungere una lingua vuol dire aggiungere un catalogo, senza toccare le pagine.

## Come si sceglie la lingua

- In **Impostazioni → Lingua** c'è un elenco vero (`CampoScelta`): «Come il telefono (…)», poi ogni lingua scritta nella sua lingua (Italiano, English).
- «Come il telefono» è la scelta di partenza: italiano se il telefono è in italiano, inglese per ogni altra lingua.
- La scelta sta sul telefono (`jp.lingua`) e resta anche dopo il logout, come il tema (`CHIAVI_DA_TENERE`).
- Cambiando lingua l'app si riapre (`cambiaLingua()`): il catalogo si carica in `main.tsx` **prima** dell'app (`avviaLingua()`), così anche le costanti dei moduli escono già tradotte.
- `<html lang>` segue la lingua attiva.

## Scrivere un testo nuovo

- Ogni testo che si legge (pulsanti, titoli, etichette, `aria-label`, segnaposto, avvisi, errori, notifiche) passa da `t('Frase intera')`, **letterale**: il test del catalogo la trova nel codice. Mai `t(variabile)`.
- Segnaposto alla ICU: `t('Speso {importo} di {budget}', { importo, budget })`. Plurali: `t('{n, plural, one {# giorno} other {# giorni}}', { n })` oppure due frasi (`n === 1 ? t('giorno') : t('giorni')`), che in inglese bastano; per le lingue con più forme si usa `plural`.
- Una frase intera, non pezzi da incollare: «Ti mancano {n} luoghi», non «Ti» + «mancano» + … (l'ordine delle parole cambia da lingua a lingua).
- Elenchi di nomi con `elenco()` («A, B e C», «A, B and C»), mai `join(' e ')`.
- Una parola italiana con due significati usa `tc(testo, contesto)`: «Altro» scheda (More) e categoria (Other), «Ora» adesso (Now) e campo (Time), «Spesa» acquisto e alimentari.
- In un file che ha già una variabile `t` (es. `const t = useTrips()`), la funzione si importa come `t as tt`.
- Date, ore, numeri, valute e ordinamenti usano `LOCALE` e `LINGUA` di `src/i18n`, mai `'it-IT'` o `'it'` scritti a mano.
- Ogni frase nuova va anche in `src/i18n/en.json`. `src/i18n/catalogo.test.ts` fallisce se una frase non è tradotta, se una traduzione non serve più o se ha segnaposto che l'italiano non ha.

## Cosa non si traduce

- **Ciò che scrive chi usa l'app** resta com'è: nomi di viaggi, luoghi, tappe, spese, note, categorie create a mano.
- Le **categorie che l'app propone da sola** (Voli, Alloggi, Trasporti, Cibo, Attività, Altro, Documenti, Valigia, Salute, Tecnologia, l'Alloggio tra i luoghi) sono salvate in italiano e si traducono solo quando si mostrano, con `nomeCategoria()`. Il valore salvato resta italiano.
- Le chiavi interne (stati, tipi, nomi delle schede usati nel codice) non passano da `t()`: si traducono dove si mostrano con `tv()`.
- I dati dell'anteprima demo restano in italiano.

## Controlli

- `npx vitest run src/i18n`: catalogo completo e segnaposto giusti.
- Pagine e fogli nuovi si guardano anche in inglese (Playwright con `locale: 'en-GB'`): niente testo italiano rimasto, niente fuori dai bordi a 320 px.
- Il confronto pixel per pixel (NRT) si fa con il browser in italiano (`locale: 'it-IT'`): l'app in italiano non deve cambiare.

## Aggiungere una lingua

1. `src/i18n/<codice>.json` con le stesse chiavi di `en.json`.
2. Il codice in `Lingua`, in `LINGUE` (con il nome nella sua lingua) e in `CATALOGHI` di `src/i18n/index.ts`; in `risolviLingua()` la regola del telefono.
3. Il test del catalogo esteso alla nuova lingua.
4. Le frasi con plurali scritti come due frasi si portano a `{n, plural, …}` se la lingua ha più forme (polacco, russo, arabo…).
