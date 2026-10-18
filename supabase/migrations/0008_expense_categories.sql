-- 0008 · Categorie di spesa vere.
-- Prima la categoria di una spesa o di una voce di budget era un testo libero: "Cibo" e "cibo" erano due cose diverse
-- e il totale di una categoria non si poteva ricavare dalle spese. Ora le categorie sono righe del viaggio
-- (si creano, si rinominano, si eliminano) e spese e voci di budget puntano a una categoria.
-- Le categorie già scritte a mano vengono recuperate: una per nome (senza badare alle maiuscole), per ogni viaggio.
-- Da eseguire dopo la 0007, una volta sola, nel SQL Editor di Supabase.

create table public.expense_categories (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  label      text not null check (length(btrim(label)) between 1 and 60),
  color      text,
  position   double precision not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, trip_id)
);

-- un nome solo per viaggio (le categorie eliminate non contano: si può ricreare lo stesso nome)
create unique index expense_categories_trip_label
  on public.expense_categories (trip_id, lower(btrim(label))) where deleted_at is null;
create index on public.expense_categories (trip_id);

alter table public.expenses     add column category_id uuid;
alter table public.budget_items add column category_id uuid;

alter table public.expenses
  add constraint expenses_category_fk foreign key (category_id, trip_id)
  references public.expense_categories (id, trip_id) on delete set null (category_id);
alter table public.budget_items
  add constraint budget_items_category_fk foreign key (category_id, trip_id)
  references public.expense_categories (id, trip_id) on delete set null (category_id);

create index on public.expenses     (category_id);
create index on public.budget_items (category_id);

-- recupero delle categorie già in uso
insert into public.expense_categories (trip_id, label, position)
select trip_id, label, (row_number() over (partition by trip_id order by lower(label))) * 1000
from (
  select distinct on (trip_id, lower(btrim(category))) trip_id, btrim(category) as label
  from (
    select trip_id, category from public.expenses     where deleted_at is null
    union all
    select trip_id, category from public.budget_items where deleted_at is null
  ) used
  where btrim(coalesce(category, '')) <> ''
  order by trip_id, lower(btrim(category)), btrim(category)
) names;

update public.expenses e set category_id = c.id
from public.expense_categories c
where c.trip_id = e.trip_id and c.deleted_at is null and lower(btrim(e.category)) = lower(c.label);

update public.budget_items b set category_id = c.id
from public.expense_categories c
where c.trip_id = b.trip_id and c.deleted_at is null and lower(btrim(b.category)) = lower(c.label);

-- sicurezza: stesse regole delle altre tabelle del viaggio
alter table public.expense_categories enable row level security;
create policy "expense_categories_select" on public.expense_categories
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "expense_categories_insert" on public.expense_categories
  for insert to authenticated with check (public.can_edit_trip(trip_id));
create policy "expense_categories_update" on public.expense_categories
  for update to authenticated
  using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
create policy "expense_categories_delete" on public.expense_categories
  for delete to authenticated using (public.can_edit_trip(trip_id));
create trigger expense_categories_updated before update on public.expense_categories
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.expense_categories to authenticated;
