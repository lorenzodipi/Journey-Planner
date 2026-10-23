-- =============================================================================
-- Journey Planner · 0015 · tempo di permanenza di luoghi e tappe
-- Da eseguire UNA volta nell'SQL Editor di Supabase.
--
-- `places.visit_minutes` = quanto fermarsi in un luogo (facoltativo).
-- `day_items.duration_minutes` = durata propria di una tappa; NULL = «come il luogo» (la tappa eredita quella del luogo).
-- Senza queste colonne l'app funziona come prima, senza durate. Le policy RLS valgono anche qui.
-- =============================================================================
alter table public.places
  add column if not exists visit_minutes integer;
alter table public.day_items
  add column if not exists duration_minutes integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'places_visit_minutes_positive') then
    alter table public.places add constraint places_visit_minutes_positive check (visit_minutes is null or visit_minutes > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'day_items_duration_minutes_positive') then
    alter table public.day_items add constraint day_items_duration_minutes_positive check (duration_minutes is null or duration_minutes > 0);
  end if;
end $$;
