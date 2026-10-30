-- 0020 · Paesi del viaggio (#35).
-- Un viaggio può toccare più paesi, ciascuno con le sue date: da lì fuso orario, valuta locale e cambio dei giorni.
-- I viaggi esistenti ricevono un paese solo (destinazione + valuta locale + cambio) per tutte le loro date.
-- Additiva e rilanciabile; l'app funziona anche prima di eseguirla (usa il modello di prima).
-- Da eseguire dopo la 0019, nel SQL Editor di Supabase.

create table if not exists public.trip_countries (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  country    text not null default '',                 -- codice ISO («JP»); vuoto se non è nell'elenco
  name       text not null check (length(btrim(name)) > 0),
  currency   text not null default '',
  timezone   text not null,
  start_date date not null,
  end_date   date not null,
  fx_rate    numeric,                                  -- unità di valuta di casa per 1 unità di questa valuta
  position   double precision not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_countries_dates_ok check (end_date >= start_date)
);
create index if not exists trip_countries_trip on public.trip_countries (trip_id);

alter table public.trip_countries enable row level security;
drop policy if exists "trip_countries_select" on public.trip_countries;
drop policy if exists "trip_countries_insert" on public.trip_countries;
drop policy if exists "trip_countries_update" on public.trip_countries;
drop policy if exists "trip_countries_delete" on public.trip_countries;
create policy "trip_countries_select" on public.trip_countries
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "trip_countries_insert" on public.trip_countries
  for insert to authenticated with check (public.can_edit_trip(trip_id));
create policy "trip_countries_update" on public.trip_countries
  for update to authenticated
  using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create policy "trip_countries_delete" on public.trip_countries
  for delete to authenticated using (public.can_edit_trip(trip_id));
drop trigger if exists trip_countries_updated on public.trip_countries;
create trigger trip_countries_updated before update on public.trip_countries
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.trip_countries to authenticated;

-- viaggi esistenti: un paese per tutte le date (solo se non ne hanno ancora)
insert into public.trip_countries (trip_id, name, currency, timezone, start_date, end_date, fx_rate, position)
select t.id,
       coalesce(nullif(btrim(t.destination), ''), t.title),
       coalesce(nullif(btrim(t.local_currency), ''), ''),
       t.timezone,
       coalesce(t.start_date, (select min(d.date) from public.days d where d.trip_id = t.id)),
       coalesce(t.end_date,   (select max(d.date) from public.days d where d.trip_id = t.id)),
       t.fx_rate,
       1000
from public.trips t
where t.deleted_at is null
  and not exists (select 1 from public.trip_countries c where c.trip_id = t.id)
  and coalesce(t.start_date, (select min(d.date) from public.days d where d.trip_id = t.id)) is not null
  and coalesce(t.end_date,   (select max(d.date) from public.days d where d.trip_id = t.id)) is not null;
