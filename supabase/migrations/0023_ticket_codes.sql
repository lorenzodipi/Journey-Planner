-- 0023 · Codice del biglietto (#38).
-- Una foto o uno screenshot del QR / codice a barre per voce (trasporto, volo, prenotazione) e per passeggero.
-- Le immagini stanno nel bucket privato "bookings" (stesse policy delle prenotazioni): qui solo il percorso.
-- Additiva e rilanciabile; l'app funziona anche prima di eseguirla (la vista del codice resta vuota).
-- Da eseguire dopo la 0022, nel SQL Editor di Supabase.

create table if not exists public.ticket_codes (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  kind        text not null check (kind in ('transport', 'flight', 'booking')),
  ref_id      uuid not null,
  traveler_id uuid references public.trip_travelers (id) on delete set null,   -- null: vale per tutti
  file_path   text not null check (length(btrim(file_path)) > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists ticket_codes_trip on public.ticket_codes (trip_id);
create index if not exists ticket_codes_ref on public.ticket_codes (kind, ref_id);

alter table public.ticket_codes enable row level security;
drop policy if exists "ticket_codes_select" on public.ticket_codes;
drop policy if exists "ticket_codes_insert" on public.ticket_codes;
drop policy if exists "ticket_codes_update" on public.ticket_codes;
drop policy if exists "ticket_codes_delete" on public.ticket_codes;
create policy "ticket_codes_select" on public.ticket_codes
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "ticket_codes_insert" on public.ticket_codes
  for insert to authenticated with check (public.can_edit_trip(trip_id));
create policy "ticket_codes_update" on public.ticket_codes
  for update to authenticated
  using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create policy "ticket_codes_delete" on public.ticket_codes
  for delete to authenticated using (public.can_edit_trip(trip_id));
drop trigger if exists ticket_codes_updated on public.ticket_codes;
create trigger ticket_codes_updated before update on public.ticket_codes
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.ticket_codes to authenticated;
