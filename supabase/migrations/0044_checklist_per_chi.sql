-- 0044 · Checklist «Per chi». Rilanciabile.
-- 1) Una voce comune può riguardare solo alcune persone («Scegli»). Vuoto = tutti.
alter table public.checklist_items add column if not exists for_travelers uuid[];

-- 2) Quando entra una persona nuova, le voci comuni «per tutti» già scritte restano di chi c'era:
--    diventano «Scegli» con le persone di prima, così il nuovo arrivato non si ritrova da spuntare la lista vecchia.
create or replace function public.checklist_fissa_per_chi()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  prima uuid[];
begin
  if new.deleted_at is not null then return new; end if;
  if tg_op = 'UPDATE' and not (old.deleted_at is not null and new.deleted_at is null) then return new; end if;
  select array_agg(t.id order by t.position) into prima
    from public.trip_travelers t
   where t.trip_id = new.trip_id and t.deleted_at is null and t.id <> new.id;
  if prima is null then return new; end if;
  update public.checklist_items c
     set for_travelers = prima
   where c.trip_id = new.trip_id and c.owner_id is null and c.deleted_at is null and c.for_travelers is null;
  return new;
end;
$$;

drop trigger if exists checklist_fissa_per_chi on public.trip_travelers;
create trigger checklist_fissa_per_chi
  after insert or update of deleted_at on public.trip_travelers
  for each row execute function public.checklist_fissa_per_chi();
