-- 0028 · Spese avanzate (#50, FRD SPESE): più paganti, divisione per percentuali o importi fissi, cambio con fonte,
-- ricevute, categorie archiviabili e protette, modifica solo di chi ha creato o pagato.
-- · `expenses.split_mode`  equal | percent | fixed; `expense_shares.percent` / `amount` (nella valuta della spesa).
-- · `expense_payers`      più paganti per spesa (la somma dei versamenti = importo). Con un solo pagante resta `paid_by`.
-- · `expenses.created_by` chi ha creato la spesa; le spese vecchie (vuoto) restano modificabili da tutti i partecipanti.
-- · `expenses.fx_source/fx_at/fx_manual/fx_set_by`  da dove viene il cambio, quando, e chi l'ha scritto a mano.
-- · `expense_files`       ricevute (foto o PDF) nel bucket privato «bookings», sotto <viaggio>/spese/<spesa>/…
-- · `expense_categories.archived_at`; il budget per categoria è la colonna `planned` della 0019.
-- Additiva e rilanciabile; senza questa migrazione l'app funziona come prima.
-- Da eseguire dopo la 0027, nel SQL Editor di Supabase.

alter table public.expenses add column if not exists split_mode text not null default 'equal';
alter table public.expenses add column if not exists created_by uuid references auth.users (id) on delete set null default auth.uid();
alter table public.expenses add column if not exists fx_source  text;
alter table public.expenses add column if not exists fx_at      timestamptz;
alter table public.expenses add column if not exists fx_manual  boolean not null default false;
alter table public.expenses add column if not exists fx_set_by  uuid references auth.users (id) on delete set null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_split_mode_ok') then
    alter table public.expenses add constraint expenses_split_mode_ok check (split_mode in ('equal', 'percent', 'fixed'));
  end if;
end $$;

alter table public.expense_shares add column if not exists percent numeric(7, 4) check (percent is null or (percent >= 0 and percent <= 100));
alter table public.expense_shares add column if not exists amount  numeric(14, 2) check (amount is null or amount >= 0);

alter table public.expense_categories add column if not exists archived_at timestamptz;

-- ---- paganti ----
create table if not exists public.expense_payers (
  expense_id  uuid not null,
  trip_id     uuid not null references public.trips (id) on delete cascade,
  traveler_id uuid not null,
  amount      numeric(14, 2) not null check (amount >= 0),
  primary key (expense_id, traveler_id),
  foreign key (expense_id, trip_id) references public.expenses (id, trip_id) on delete cascade,
  foreign key (traveler_id, trip_id) references public.trip_travelers (id, trip_id) on delete cascade
);
create index if not exists expense_payers_trip on public.expense_payers (trip_id);

-- ---- ricevute ----
create table if not exists public.expense_files (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  expense_id uuid not null,
  file_path  text not null,
  file_name  text,
  mime_type  text,
  size_bytes integer,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (expense_id, trip_id) references public.expenses (id, trip_id) on delete cascade
);
create index if not exists expense_files_expense on public.expense_files (expense_id);

-- ---- chi può modificare una spesa: chi l'ha creata o l'ha pagata (le spese senza autore: tutti i partecipanti) ----
create or replace function public.can_edit_expense(_expense uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.expenses e
    where e.id = _expense
      and public.can_edit_trip(e.trip_id)
      and (
        e.created_by is null
        or e.created_by = (select auth.uid())
        or exists (select 1 from public.trip_travelers t where t.id = e.paid_by and t.trip_id = e.trip_id and t.user_id = (select auth.uid()))
        or exists (select 1 from public.expense_payers p join public.trip_travelers t on t.id = p.traveler_id and t.trip_id = p.trip_id
                   where p.expense_id = e.id and t.user_id = (select auth.uid()))
      )
  )
$$;
grant execute on function public.can_edit_expense(uuid) to authenticated;

-- la spesa nuova non esiste ancora quando arriva la riga: la prima scrittura passa dal viaggio
drop policy if exists "expenses_update" on public.expenses;
drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_update" on public.expenses
  for update to authenticated
  using (public.can_edit_expense(id)) with check (public.can_edit_trip(trip_id));
create policy "expenses_delete" on public.expenses
  for delete to authenticated using (public.can_edit_expense(id));

drop policy if exists "expense_shares_insert" on public.expense_shares;
drop policy if exists "expense_shares_update" on public.expense_shares;
drop policy if exists "expense_shares_delete" on public.expense_shares;
create policy "expense_shares_insert" on public.expense_shares
  for insert to authenticated with check (public.can_edit_expense(expense_id));
create policy "expense_shares_update" on public.expense_shares
  for update to authenticated using (public.can_edit_expense(expense_id)) with check (public.can_edit_expense(expense_id));
create policy "expense_shares_delete" on public.expense_shares
  for delete to authenticated using (public.can_edit_expense(expense_id));

alter table public.expense_payers enable row level security;
drop policy if exists "expense_payers_select" on public.expense_payers;
drop policy if exists "expense_payers_insert" on public.expense_payers;
drop policy if exists "expense_payers_update" on public.expense_payers;
drop policy if exists "expense_payers_delete" on public.expense_payers;
create policy "expense_payers_select" on public.expense_payers for select to authenticated using (public.is_trip_member(trip_id));
create policy "expense_payers_insert" on public.expense_payers for insert to authenticated with check (public.can_edit_expense(expense_id));
create policy "expense_payers_update" on public.expense_payers for update to authenticated
  using (public.can_edit_expense(expense_id)) with check (public.can_edit_expense(expense_id));
create policy "expense_payers_delete" on public.expense_payers for delete to authenticated using (public.can_edit_expense(expense_id));
grant select, insert, update, delete on public.expense_payers to authenticated;

alter table public.expense_files enable row level security;
drop policy if exists "expense_files_select" on public.expense_files;
drop policy if exists "expense_files_insert" on public.expense_files;
drop policy if exists "expense_files_update" on public.expense_files;
drop policy if exists "expense_files_delete" on public.expense_files;
create policy "expense_files_select" on public.expense_files for select to authenticated using (public.is_trip_member(trip_id));
create policy "expense_files_insert" on public.expense_files for insert to authenticated with check (public.can_edit_expense(expense_id));
create policy "expense_files_update" on public.expense_files for update to authenticated
  using (public.can_edit_expense(expense_id)) with check (public.can_edit_expense(expense_id));
create policy "expense_files_delete" on public.expense_files for delete to authenticated using (public.can_edit_expense(expense_id));
grant select, insert, update, delete on public.expense_files to authenticated;

-- ---- categorie protette: finché una spesa o una voce di budget la usa non si elimina (si archivia) ----
create or replace function public.check_expense_category_delete()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if new.deleted_at is not null and old.deleted_at is null then
    select (select count(*) from public.expenses e where e.category_id = new.id and e.deleted_at is null)
         + (select count(*) from public.budget_items b where b.category_id = new.id and b.deleted_at is null) into n;
    if n > 0 then
      raise exception 'Usata da % %: spostale prima o archiviala', n, case when n = 1 then 'spesa' else 'spese' end using errcode = 'P0001';
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists expense_categories_protect on public.expense_categories;
create trigger expense_categories_protect before update on public.expense_categories
  for each row execute function public.check_expense_category_delete();
