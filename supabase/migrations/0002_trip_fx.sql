-- =============================================================================
-- Journey Planner · 0002 · tasso di cambio del viaggio
-- Da eseguire UNA volta nell'SQL Editor di Supabase, dopo 0001_init.sql.
--
-- `fx_rate` = quante unità della valuta base (es. EUR) valgono 1 unità della valuta
-- locale (es. JPY). Serve a confrontare budget e spese in una sola valuta. Si modifica
-- dall'app (Altro → Budget → Cambio) ed è condiviso tra tutti i membri del viaggio.
-- Le policy RLS esistenti su `trips` valgono anche per la nuova colonna.
-- =============================================================================
alter table public.trips
  add column if not exists fx_rate numeric(14,6),
  add constraint trips_fx_rate_ok check (fx_rate is null or fx_rate > 0);
