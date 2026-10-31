-- #53 Prenotazioni come tappe con file. Additiva: l'app funziona anche senza.
alter table public.bookings
  add column if not exists status              text not null default 'confirmed' check (status in ('to_confirm', 'confirmed', 'cancelled')),
  add column if not exists provider            text,
  add column if not exists contact             text,
  add column if not exists cancellation_policy text,
  add column if not exists participants        uuid[] not null default '{}';

-- collegamento N:M prenotazione ↔ tappa: scollegare non elimina né la prenotazione né la tappa
create table if not exists public.booking_items (
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  day_item_id uuid not null references public.day_items (id) on delete cascade,
  trip_id     uuid not null references public.trips (id) on delete cascade,
  primary key (booking_id, day_item_id)
);
create index if not exists booking_items_item on public.booking_items (day_item_id);
create index if not exists booking_items_trip on public.booking_items (trip_id);
alter table public.booking_items enable row level security;
drop policy if exists "booking_items_select" on public.booking_items;
drop policy if exists "booking_items_write" on public.booking_items;
create policy "booking_items_select" on public.booking_items for select to authenticated using (public.is_trip_member(trip_id));
create policy "booking_items_write" on public.booking_items for all to authenticated
  using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
grant select, insert, update, delete on public.booking_items to authenticated;
