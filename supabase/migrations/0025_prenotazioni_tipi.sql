-- 0025 · Prenotazioni: nuovi tipi e campi (#40).
-- Tipi: ristorante, noleggio, attività. Campi facoltativi: dettaglio breve («Tavolo 6», «Binario 14»), numero di persone e luogo.
-- I tipi di prima restano validi. L'ora della prenotazione è `valid_from`.
-- Additiva e rilanciabile; senza questa migrazione la pagina funziona con i tipi di prima.
-- Da eseguire dopo la 0024, nel SQL Editor di Supabase.

alter type public.booking_type add value if not exists 'restaurant';
alter type public.booking_type add value if not exists 'rental';
alter type public.booking_type add value if not exists 'activity';

alter table public.bookings add column if not exists detail     text;
alter table public.bookings add column if not exists party_size integer check (party_size is null or party_size > 0);
alter table public.bookings add column if not exists place      text;
