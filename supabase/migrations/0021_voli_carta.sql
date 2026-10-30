-- 0021 · Voli: carta d'imbarco (#36, #58).
-- Per tratta: terminal, gate, ora di imbarco (ora locale, «HH:MM») e posto per ogni passeggero.
-- Per volo: bagaglio, politiche di cambio/rimborso e apertura del check-in online (promemoria locale).
-- «Chi vola» è già `flights.for_travelers` (0019): vuoto = tutti i viaggiatori.
-- Additiva e rilanciabile; senza questa migrazione la carta mostra solo i campi di prima.
-- Da eseguire dopo la 0020, nel SQL Editor di Supabase.

alter table public.flight_legs add column if not exists terminal      text;
alter table public.flight_legs add column if not exists gate          text;
alter table public.flight_legs add column if not exists boarding_time text check (boarding_time is null or boarding_time ~ '^[0-2][0-9]:[0-5][0-9]$');
alter table public.flight_legs add column if not exists seats_by      jsonb;

alter table public.flights add column if not exists baggage    text;
alter table public.flights add column if not exists policy     text;
alter table public.flights add column if not exists checkin_at timestamptz;
