-- 0026 · Checklist: lista comune «Tutti» con spunte personali e lista privata (#41, FRD LIST-001…012).
-- · `owner_id` vuoto = voce comune; valorizzato = voce privata di quell'utente (la vede solo lui, anche dall'API).
-- · `description`, `unit`, `category` (testo: «Documenti», «Valigia», …, o una categoria personalizzata).
-- · `checklist_checks`: la spunta e i pezzi fatti di ogni viaggiatore sulle voci comuni.
-- Le voci esistenti diventano comuni; `done` / `quantity_done` diventano una spunta per ciascun viaggiatore,
-- così nessuno perde lo stato che vede oggi. Le voci «per una persona» con account diventano private di quella persona.
-- Additiva e rilanciabile; senza questa migrazione l'app funziona come prima.
-- Da eseguire dopo la 0025, nel SQL Editor di Supabase.

alter table public.checklist_items add column if not exists owner_id    uuid references auth.users (id) on delete cascade;
alter table public.checklist_items add column if not exists description text;
alter table public.checklist_items add column if not exists unit        text;
alter table public.checklist_items add column if not exists category    text;

create table if not exists public.checklist_checks (
  item_id       uuid not null,
  trip_id       uuid not null references public.trips (id) on delete cascade,
  traveler_id   uuid not null,
  done          boolean not null default false,
  quantity_done integer check (quantity_done is null or quantity_done >= 0),
  updated_at    timestamptz not null default now(),
  primary key (item_id, traveler_id),
  foreign key (item_id, trip_id) references public.checklist_items (id, trip_id) on delete cascade,
  foreign key (traveler_id, trip_id) references public.trip_travelers (id, trip_id) on delete cascade
);
create index if not exists checklist_checks_trip on public.checklist_checks (trip_id);

-- ---- checklist_items: le voci private le vede e le modifica solo il proprietario ----
drop policy if exists "checklist_items_select" on public.checklist_items;
drop policy if exists "checklist_items_insert" on public.checklist_items;
drop policy if exists "checklist_items_update" on public.checklist_items;
drop policy if exists "checklist_items_delete" on public.checklist_items;
create policy "checklist_items_select" on public.checklist_items
  for select to authenticated
  using (public.is_trip_member(trip_id) and (owner_id is null or owner_id = (select auth.uid())));
create policy "checklist_items_insert" on public.checklist_items
  for insert to authenticated
  with check (case when owner_id is null then public.can_edit_trip(trip_id)
                   else owner_id = (select auth.uid()) and public.is_trip_member(trip_id) end);
create policy "checklist_items_update" on public.checklist_items
  for update to authenticated
  using (case when owner_id is null then public.can_edit_trip(trip_id)
              else owner_id = (select auth.uid()) and public.is_trip_member(trip_id) end)
  with check (case when owner_id is null then public.can_edit_trip(trip_id)
                   else owner_id = (select auth.uid()) and public.is_trip_member(trip_id) end);
create policy "checklist_items_delete" on public.checklist_items
  for delete to authenticated
  using (case when owner_id is null then public.can_edit_trip(trip_id)
              else owner_id = (select auth.uid()) and public.is_trip_member(trip_id) end);

-- ---- checklist_checks: si legge ciò che si vede (le voci private altrui restano nascoste), si scrive solo la propria spunta ----
alter table public.checklist_checks enable row level security;
drop policy if exists "checklist_checks_select" on public.checklist_checks;
drop policy if exists "checklist_checks_insert" on public.checklist_checks;
drop policy if exists "checklist_checks_update" on public.checklist_checks;
drop policy if exists "checklist_checks_delete" on public.checklist_checks;
create policy "checklist_checks_select" on public.checklist_checks
  for select to authenticated
  using (public.is_trip_member(trip_id)
         and exists (select 1 from public.checklist_items i where i.id = item_id));
create policy "checklist_checks_insert" on public.checklist_checks
  for insert to authenticated
  with check (exists (select 1 from public.trip_travelers t where t.id = traveler_id and t.user_id = (select auth.uid()))
              and exists (select 1 from public.checklist_items i where i.id = item_id));
create policy "checklist_checks_update" on public.checklist_checks
  for update to authenticated
  using (exists (select 1 from public.trip_travelers t where t.id = traveler_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trip_travelers t where t.id = traveler_id and t.user_id = (select auth.uid())));
create policy "checklist_checks_delete" on public.checklist_checks
  for delete to authenticated
  using (exists (select 1 from public.trip_travelers t where t.id = traveler_id and t.user_id = (select auth.uid())));
drop trigger if exists checklist_checks_updated on public.checklist_checks;
create trigger checklist_checks_updated before update on public.checklist_checks
  for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.checklist_checks to authenticated;

-- ---- dati esistenti (solo la prima volta: se nessuna voce ha ancora categoria né spunte) ----
do $$
begin
  if not exists (select 1 from public.checklist_checks) and not exists (select 1 from public.checklist_items where category is not null or owner_id is not null) then
    update public.checklist_items set category = case kind when 'docs' then 'Documenti' when 'packing' then 'Valigia' else 'Altro' end;
    -- voci «per una persona» con account → private di quella persona (la spunta resta sua)
    update public.checklist_items i set owner_id = t.user_id
      from public.trip_travelers t
     where i.traveler_id = t.id and t.user_id is not null;
    -- voci comuni: lo stato di oggi diventa la spunta di ogni viaggiatore
    insert into public.checklist_checks (item_id, trip_id, traveler_id, done, quantity_done)
    select i.id, i.trip_id, t.id, i.done, case when (i.quantity_done is not null and i.quantity_done > 0) then i.quantity_done end
      from public.checklist_items i
      join public.trip_travelers t on t.trip_id = i.trip_id and t.deleted_at is null
     where i.owner_id is null and i.deleted_at is null and (i.done or coalesce(i.quantity_done, 0) > 0)
    on conflict do nothing;
  end if;
end
$$;
