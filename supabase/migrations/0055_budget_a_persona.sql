-- 0055 · Budget a persona: ognuno scrive il suo, chi può modificare il viaggio scrive quello di chi non ha l'account.
-- traveler_budgets: una riga per viaggiatore (importo nella valuta di casa del viaggio).
--   Si legge e si scrive solo la propria riga, oppure quella di un viaggiatore senza account se si può modificare il viaggio.
--   Il visualizzatore non vede niente (is_trip_participant).
-- trip_budget_totals(): per ogni viaggio il budget = somma dei budget messi, con quante persone l'hanno messo e quante sono.
--   Solo per chi partecipa al viaggio: i budget degli altri restano privati, si vede solo la somma.
-- trips.budget_limit (0013) resta per le app vecchie e non si usa più.
-- Additiva e rilanciabile; l'app funziona anche prima di eseguirla (nessun budget a persona).

create table if not exists public.traveler_budgets (
  traveler_id uuid primary key,
  trip_id     uuid not null references public.trips (id) on delete cascade,
  amount      numeric(14,2) not null check (amount > 0),
  updated_at  timestamptz not null default now(),
  foreign key (traveler_id, trip_id) references public.trip_travelers (id, trip_id) on delete cascade
);
create index if not exists traveler_budgets_trip on public.traveler_budgets (trip_id);

-- chi può leggere e scrivere il budget di questo viaggiatore
create or replace function public.can_see_traveler_budget(_traveler uuid, _trip uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_trip_participant(_trip) and exists (
    select 1 from public.trip_travelers t
    where t.id = _traveler and t.trip_id = _trip and t.deleted_at is null
      and (t.user_id = (select auth.uid()) or (t.user_id is null and public.can_edit_trip(_trip)))
  );
$$;
revoke all on function public.can_see_traveler_budget(uuid, uuid) from public, anon;
grant execute on function public.can_see_traveler_budget(uuid, uuid) to authenticated;

alter table public.traveler_budgets enable row level security;
drop policy if exists traveler_budgets_select on public.traveler_budgets;
drop policy if exists traveler_budgets_insert on public.traveler_budgets;
drop policy if exists traveler_budgets_update on public.traveler_budgets;
drop policy if exists traveler_budgets_delete on public.traveler_budgets;
create policy traveler_budgets_select on public.traveler_budgets for select to authenticated
  using (public.can_see_traveler_budget(traveler_id, trip_id));
create policy traveler_budgets_insert on public.traveler_budgets for insert to authenticated
  with check (public.can_see_traveler_budget(traveler_id, trip_id));
create policy traveler_budgets_update on public.traveler_budgets for update to authenticated
  using (public.can_see_traveler_budget(traveler_id, trip_id))
  with check (public.can_see_traveler_budget(traveler_id, trip_id));
create policy traveler_budgets_delete on public.traveler_budgets for delete to authenticated
  using (public.can_see_traveler_budget(traveler_id, trip_id));
grant select, insert, update, delete on public.traveler_budgets to authenticated;

-- budget di ogni viaggio a cui si partecipa: somma dei budget dei viaggiatori ancora nel viaggio
create or replace function public.trip_budget_totals()
returns table (trip_id uuid, total numeric, persone integer, viaggiatori integer)
language sql stable security definer
set search_path = ''
as $$
  select t.trip_id, coalesce(sum(b.amount), 0)::numeric, count(b.traveler_id)::integer, count(t.id)::integer
  from public.trip_travelers t
  join public.trip_members m on m.trip_id = t.trip_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'editor')
  left join public.traveler_budgets b on b.traveler_id = t.id and b.trip_id = t.trip_id
  where t.deleted_at is null
  group by t.trip_id;
$$;
revoke all on function public.trip_budget_totals() from public, anon;
grant execute on function public.trip_budget_totals() to authenticated;
