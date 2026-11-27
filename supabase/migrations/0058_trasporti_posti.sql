-- 0058 · Trasporti: posti a sedere, testo libero («Carrozza 7, posti 12A e 12B»). Additiva e rilanciabile.
-- Senza questa migrazione l'app funziona come prima: la colonna si scrive solo se il campo è compilato.
-- Non è un dato di costo né privato: il visualizzatore lo vede come binario e terminal.
alter table public.transports add column if not exists seats text;
