-- #61 Luoghi: categorie dell'account, sito ufficiale, archivio, preferenza personale. Additiva.
create table if not exists public.user_place_categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label   text not null check (length(trim(label)) between 1 and 40),
  icon    text,
  color   text,
  primary key (user_id, label)
);
alter table public.user_place_categories enable row level security;
drop policy if exists "upc_own" on public.user_place_categories;
create policy "upc_own" on public.user_place_categories for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.user_place_categories to authenticated;

-- le categorie già usate nei viaggi di cui sono il creatore diventano le mie (una volta sola, senza doppioni di maiuscole)
insert into public.user_place_categories (user_id, label, color)
select distinct on (t.owner_id, lower(c.label)) t.owner_id, c.label, c.color
from public.categories c join public.trips t on t.id = c.trip_id
where t.owner_id is not null and c.deleted_at is null and length(trim(c.label)) between 1 and 40
on conflict do nothing;

alter table public.places
  add column if not exists website     text,
  add column if not exists archived_at timestamptz;

-- preferenza personale su un luogo: privata (solo la mia riga)
create table if not exists public.place_prefs (
  place_id uuid not null references public.places (id) on delete cascade,
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pref     text not null check (pref in ('must', 'if_time')),
  primary key (place_id, user_id)
);
alter table public.place_prefs enable row level security;
drop policy if exists "place_prefs_own" on public.place_prefs;
create policy "place_prefs_own" on public.place_prefs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.place_prefs to authenticated;
