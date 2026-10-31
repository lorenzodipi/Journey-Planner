-- #60 Registro delle modifiche: chi, quando e che cosa sui contenuti condivisi. Additiva.
-- Senza FK su trips: quando un viaggio si elimina il registro non deve bloccare la cancellazione a cascata.
create table if not exists public.activity_log (
  id         bigint generated always as identity primary key,
  trip_id    uuid not null,
  table_name text not null,
  row_id     uuid not null,
  action     text not null check (action in ('insert', 'update', 'delete', 'restore')),
  actor      uuid,
  at         timestamptz not null default now(),
  summary    jsonb not null default '{}'
);
create index if not exists activity_log_trip_at on public.activity_log (trip_id, at desc);
create index if not exists activity_log_row on public.activity_log (table_name, row_id, at desc);
alter table public.activity_log enable row level security;
drop policy if exists "activity_log_select" on public.activity_log;
-- leggono i membri del viaggio; i rimborsi solo chi li ha fatti (niente dati privati degli altri)
create policy "activity_log_select" on public.activity_log for select to authenticated
  using (public.is_trip_member(trip_id) and (table_name <> 'settlements' or actor = (select auth.uid())));
grant select on public.activity_log to authenticated;

create or replace function public.log_activity()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  r jsonb;
  t uuid;
  act text;
begin
  if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  t := (r ->> 'trip_id')::uuid;
  if t is null then return coalesce(new, old); end if;
  -- viaggio eliminato (cascata): niente registro
  if tg_op = 'DELETE' and not exists (select 1 from public.trips where id = t) then return old; end if;
  -- liste personali della checklist: private, mai nel registro
  if tg_table_name = 'checklist_items' and (r ->> 'owner_id') is not null then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then return new; end if;
    if to_jsonb(old) ->> 'deleted_at' is null and r ->> 'deleted_at' is not null then act := 'delete';
    elsif to_jsonb(old) ->> 'deleted_at' is not null and r ->> 'deleted_at' is null then act := 'restore';
    else act := 'update'; end if;
  else
    act := lower(tg_op);
  end if;
  insert into public.activity_log (trip_id, table_name, row_id, action, actor, summary)
  values (t, tg_table_name, (r ->> 'id')::uuid, act,
          (select auth.uid()),
          case when tg_table_name = 'settlements' then '{}'::jsonb
               else jsonb_build_object('title', coalesce(r ->> 'title', r ->> 'name', r ->> 'label', r ->> 'text', r ->> 'from_label', r ->> 'city', '')) end);
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['places', 'days', 'day_items', 'stays', 'transports', 'flights', 'bookings', 'expenses', 'checklist_items', 'settlements']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', 'log_' || t, t);
      execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_activity()', 'log_' || t, t);
    end if;
  end loop;
end $$;
