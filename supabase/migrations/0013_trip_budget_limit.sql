-- =============================================================================
-- Journey Planner · 0013 · budget massimo del viaggio
-- Da eseguire UNA volta nell'SQL Editor di Supabase.
--
-- `budget_limit` = quanto si vuole spendere al massimo nel viaggio, nella valuta base. Facoltativo.
-- Senza questa colonna l'app funziona come prima, senza confronto con un tetto di spesa.
-- Le policy RLS su `trips` valgono anche qui.
-- =============================================================================
alter table public.trips
  add column if not exists budget_limit numeric(14,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_budget_limit_positive') then
    alter table public.trips add constraint trips_budget_limit_positive check (budget_limit is null or budget_limit > 0);
  end if;
end $$;
