-- =============================================================================
-- Journey Planner · 0014 · paese di origine del viaggio
-- Da eseguire UNA volta nell'SQL Editor di Supabase.
--
-- `origin_country` = codice ISO del paese di casa (es. 'IT'), `origin_timezone` = il suo fuso (es. 'Europe/Rome').
-- Servono a mostrare l'ora di casa con la differenza oraria e a precompilare il fuso di partenza di voli e trasporti.
-- Facoltativi: senza queste colonne l'app funziona come prima. Le policy RLS su `trips` valgono anche qui.
-- =============================================================================
alter table public.trips
  add column if not exists origin_country text,
  add column if not exists origin_timezone text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_origin_country_code') then
    alter table public.trips add constraint trips_origin_country_code check (origin_country is null or origin_country ~ '^[A-Z]{2}$');
  end if;
end $$;
