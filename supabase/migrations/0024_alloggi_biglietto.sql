-- 0024 · Alloggi: biglietto lavanda (#39).
-- Camera (numero), tipo di camera (es. Washitsu, Doppia) e codice di prenotazione, tutti facoltativi.
-- Gli orari di check-in/out ci sono già (`check_in_info`, `check_out_info`); «Pagato da» e «Per chi» sono già in 0019.
-- Additiva e rilanciabile; senza questa migrazione la carta mostra solo i campi di prima.
-- Da eseguire dopo la 0023, nel SQL Editor di Supabase.

alter table public.stays add column if not exists room         text;
alter table public.stays add column if not exists room_type    text;
alter table public.stays add column if not exists booking_code text;
