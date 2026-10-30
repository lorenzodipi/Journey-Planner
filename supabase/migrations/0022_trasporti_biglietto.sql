-- 0022 · Trasporti: biglietto orizzontale (#37, #58).
-- Nome/numero del mezzo («Haruka 33»), fermate (0 = diretto), operatore, binario, bagaglio, politiche di cambio/rimborso
-- e apertura del check-in. «Chi viaggia» è già `transports.for_travelers` (0019): vuoto = tutti i viaggiatori.
-- Additiva e rilanciabile; senza questa migrazione la carta mostra solo i campi di prima.
-- Da eseguire dopo la 0021, nel SQL Editor di Supabase.

alter table public.transports add column if not exists title      text;
alter table public.transports add column if not exists stops      integer check (stops is null or stops >= 0);
alter table public.transports add column if not exists operator   text;
alter table public.transports add column if not exists platform   text;
alter table public.transports add column if not exists baggage    text;
alter table public.transports add column if not exists policy     text;
alter table public.transports add column if not exists checkin_at timestamptz;
