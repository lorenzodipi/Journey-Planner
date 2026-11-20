-- 0056 · Previsto a persona per categoria, come il budget (0055): ognuno scrive il suo previsto di Cibo, Trasporti…,
-- chi può modificare il viaggio scrive quello di chi non ha l'account.
-- traveler_category_planned: una riga per viaggiatore e categoria (importo nella valuta di casa del viaggio).
--   Si legge e si scrive solo la propria riga, oppure quella di un viaggiatore senza account se si può modificare il
--   viaggio (stessa regola dei budget: can_see_traveler_budget). Il visualizzatore non vede niente.
-- trip_category_planned_totals(): per ogni categoria la somma dei previsti scritti e chi li ha scritti (senza gli importi
--   dei singoli). Per chi non ha scritto il suo, l'app conta la sua quota stimata dai costi inseriti.
-- I previsti scritti finora per tutto il viaggio (expense_categories.planned, 0019) si dividono in parti uguali tra i
--   viaggiatori (i centesimi che avanzano al primo) e poi si tolgono, così una seconda esecuzione non li divide di nuovo.
--   La colonna resta per le app vecchie: l'app nuova la conta ancora, divisa tra tutti, per chi non ha il suo previsto.
-- Additiva e rilanciabile; l'app funziona anche prima di eseguirla (un previsto solo per categoria, come prima).

create table if not exists public.traveler_category_planned (
  traveler_id uuid not null,
  category_id uuid not null,
  trip_id     uuid not null references public.trips (id) on delete cascade,
  amount      numeric(14,2) not null check (amount >= 0),
  updated_at  timestamptz not null default now(),
  primary key (traveler_id, category_id),
  foreign key (traveler_id, trip_id) references public.trip_travelers (id, trip_id) on delete cascade,
  foreign key (category_id, trip_id) references public.expense_categories (id, trip_id) on delete cascade
);
create index if not exists traveler_category_planned_trip on public.traveler_category_planned (trip_id);
create index if not exists traveler_category_planned_category on public.traveler_category_planned (category_id);

alter table public.traveler_category_planned enable row level security;
drop policy if exists traveler_category_planned_select on public.traveler_category_planned;
drop policy if exists traveler_category_planned_insert on public.traveler_category_planned;
drop policy if exists traveler_category_planned_update on public.traveler_category_planned;
drop policy if exists traveler_category_planned_delete on public.traveler_category_planned;
create policy traveler_category_planned_select on public.traveler_category_planned for select to authenticated
  using (public.can_see_traveler_budget(traveler_id, trip_id));
create policy traveler_category_planned_insert on public.traveler_category_planned for insert to authenticated
  with check (public.can_see_traveler_budget(traveler_id, trip_id));
create policy traveler_category_planned_update on public.traveler_category_planned for update to authenticated
  using (public.can_see_traveler_budget(traveler_id, trip_id))
  with check (public.can_see_traveler_budget(traveler_id, trip_id));
create policy traveler_category_planned_delete on public.traveler_category_planned for delete to authenticated
  using (public.can_see_traveler_budget(traveler_id, trip_id));
grant select, insert, update, delete on public.traveler_category_planned to authenticated;

-- previsti di ogni categoria dei viaggi a cui si partecipa: somma e chi li ha scritti (viaggiatori ancora nel viaggio)
create or replace function public.trip_category_planned_totals()
returns table (trip_id uuid, category_id uuid, total numeric, chi uuid[])
language sql stable security definer
set search_path = ''
as $$
  select p.trip_id, p.category_id, sum(p.amount)::numeric, array_agg(p.traveler_id order by p.traveler_id)
  from public.traveler_category_planned p
  join public.trip_travelers t on t.id = p.traveler_id and t.trip_id = p.trip_id and t.deleted_at is null
  join public.trip_members m on m.trip_id = p.trip_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'editor')
  group by p.trip_id, p.category_id;
$$;
revoke all on function public.trip_category_planned_totals() from public, anon;
grant execute on function public.trip_category_planned_totals() to authenticated;

-- i previsti di prima, divisi tra i viaggiatori del viaggio
do $$
declare
  c record;
  n integer;
  quota numeric(14,2);
  resto numeric(14,2);
  i integer;
  t record;
begin
  for c in
    select ec.id, ec.trip_id, ec.planned from public.expense_categories ec
    where ec.planned is not null and ec.deleted_at is null
  loop
    select count(*) into n from public.trip_travelers where trip_id = c.trip_id and deleted_at is null;
    continue when n = 0;
    quota := trunc(c.planned / n, 2);
    resto := c.planned - quota * n;
    i := 0;
    for t in
      select id from public.trip_travelers where trip_id = c.trip_id and deleted_at is null order by position nulls last, created_at, id
    loop
      insert into public.traveler_category_planned (traveler_id, category_id, trip_id, amount)
      values (t.id, c.id, c.trip_id, quota + case when i = 0 then resto else 0 end)
      on conflict (traveler_id, category_id) do nothing;
      i := i + 1;
    end loop;
    update public.expense_categories set planned = null where id = c.id;
  end loop;
end
$$;

-- tempo reale, come le altre tabelle delle spese (0046)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'traveler_category_planned'
  ) and exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.traveler_category_planned;
  end if;
end
$$;
