-- =============================================================================
-- Journey Planner · 0012 · cambi di più valute per viaggio
-- Da eseguire UNA volta nell'SQL Editor di Supabase.
--
-- `fx_rates` = i cambi delle valute EXTRA del viaggio (oltre alla valuta locale, che resta in `fx_rate`):
-- un oggetto { "KRW": 0.00065, "THB": 0.026 } con quante unità della valuta base valgono 1 unità di quella valuta.
-- Senza questa colonna l'app funziona come prima, con base e locale. Le policy RLS su `trips` valgono anche qui.
-- =============================================================================
alter table public.trips
  add column if not exists fx_rates jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_fx_rates_object') then
    alter table public.trips add constraint trips_fx_rates_object check (jsonb_typeof(fx_rates) = 'object');
  end if;
end $$;
