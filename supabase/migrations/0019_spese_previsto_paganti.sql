-- =============================================================================
-- Faraway · 0019 · previsto per categoria e «Pagato da / Per chi» sulle voci pagate (#34)
-- Da eseguire UNA volta nell'SQL Editor di Supabase (si può rilanciare).
--
-- expense_categories.planned  = il «previsto» della categoria scritto a mano (es. Cibo 600 €), nella
--                               valuta di casa; vuoto = l'app lo calcola dai costi inseriti.
-- stays / flights / transports / bookings:
--   paid_by        = chi ha pagato la voce (un viaggiatore del viaggio)
--   for_travelers  = per chi è (vuoto = tutti): servono per saldi e Dettaglio spese.
-- Senza queste colonne l'app funziona come prima.
-- =============================================================================
alter table public.expense_categories add column if not exists planned numeric(14,2);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'expense_categories_planned_positive') then
    alter table public.expense_categories add constraint expense_categories_planned_positive check (planned is null or planned >= 0);
  end if;
end $$;

alter table public.stays      add column if not exists paid_by uuid, add column if not exists for_travelers uuid[];
alter table public.flights    add column if not exists paid_by uuid, add column if not exists for_travelers uuid[];
alter table public.transports add column if not exists paid_by uuid, add column if not exists for_travelers uuid[];
alter table public.bookings   add column if not exists paid_by uuid, add column if not exists for_travelers uuid[];

-- chi ha pagato deve essere un viaggiatore dello stesso viaggio (se lo si elimina, il campo si svuota)
do $$
declare t text;
begin
  foreach t in array array['stays', 'flights', 'transports', 'bookings'] loop
    if not exists (select 1 from pg_constraint where conname = t || '_paid_by_fkey') then
      execute format(
        'alter table public.%I add constraint %I foreign key (paid_by, trip_id) references public.trip_travelers (id, trip_id) on delete set null (paid_by)',
        t, t || '_paid_by_fkey');
    end if;
  end loop;
end $$;
