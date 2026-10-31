-- 0029 · Rimborsi con doppia conferma (#51, FRD COST-015/016/028…039, BR-19…25).
-- Il debitore dichiara «Ho pagato» (in attesa di conferma); il destinatario conferma o rifiuta; il mittente può annullare.
-- I saldi cambiano solo alla conferma, una volta sola. I rimborsi non sono spese. Una correzione è una rettifica tracciata (`corrects`).
-- Leggono e agiscono solo le due controparti; i saldi di tutti restano calcolabili da `my_confirmed_settlements()` (solo importi confermati).
-- Additiva e rilanciabile; senza questa migrazione l'app funziona come prima (nessun rimborso).
-- Da eseguire dopo la 0028, nel SQL Editor di Supabase.

create table if not exists public.settlements (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips (id) on delete cascade,
  from_traveler   uuid not null,
  to_traveler     uuid not null,
  amount          numeric(14, 2) not null check (amount > 0),
  currency        text not null,
  paid_on         date not null,
  status          text not null default 'in_attesa' check (status in ('in_attesa', 'confermato', 'rifiutato', 'annullato')),
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  decided_by      uuid references auth.users (id) on delete set null,
  decided_at      timestamptz,
  balance_version text,
  corrects        uuid references public.settlements (id) on delete set null,
  constraint settlements_two_people check (from_traveler <> to_traveler),
  foreign key (from_traveler, trip_id) references public.trip_travelers (id, trip_id) on delete cascade,
  foreign key (to_traveler, trip_id) references public.trip_travelers (id, trip_id) on delete cascade
);
create index if not exists settlements_trip on public.settlements (trip_id);

-- l'utente collegato è questo viaggiatore
create or replace function public.is_traveler_user(_traveler uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.trip_travelers t where t.id = _traveler and t.user_id = (select auth.uid())) $$;
grant execute on function public.is_traveler_user(uuid) to authenticated;

alter table public.settlements enable row level security;
drop policy if exists "settlements_select" on public.settlements;
drop policy if exists "settlements_insert" on public.settlements;
create policy "settlements_select" on public.settlements for select to authenticated
  using (public.is_trip_member(trip_id) and (public.is_traveler_user(from_traveler) or public.is_traveler_user(to_traveler)));
create policy "settlements_insert" on public.settlements for insert to authenticated
  with check (public.can_edit_trip(trip_id) and public.is_traveler_user(from_traveler)
              and status = 'in_attesa' and decided_by is null and decided_at is null);
grant select, insert on public.settlements to authenticated;

-- «versione» dei saldi: cambia con ogni spesa, paganti, quote o rimborso confermato
create or replace function public.balance_version(_trip uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select case when public.is_trip_member(_trip) then md5(
    coalesce((select string_agg(e.id::text || e.updated_at::text, ',' order by e.id) from public.expenses e where e.trip_id = _trip and e.deleted_at is null), '') || '|' ||
    coalesce((select string_agg(p.expense_id::text || p.traveler_id::text || p.amount::text, ',' order by p.expense_id, p.traveler_id) from public.expense_payers p where p.trip_id = _trip), '') || '|' ||
    coalesce((select string_agg(s.id::text || s.traveler_id::text || s.weight::text || coalesce(s.percent::text, '') || coalesce(s.amount::text, ''), ',' order by s.id) from public.expense_shares s where s.trip_id = _trip and s.deleted_at is null), '') || '|' ||
    coalesce((select string_agg(r.id::text, ',' order by r.id) from public.settlements r where r.trip_id = _trip and r.status = 'confermato'), '')
  ) end
$$;
grant execute on function public.balance_version(uuid) to authenticated;

-- il mittente annulla una richiesta ancora in attesa
create or replace function public.cancel_settlement(_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare r public.settlements;
begin
  select * into r from public.settlements where id = _id;
  if not found or not public.is_traveler_user(r.from_traveler) then raise exception 'Rimborso non trovato' using errcode = 'P0001'; end if;
  if r.status = 'annullato' then return; end if;
  if r.status <> 'in_attesa' then raise exception 'Il rimborso è già stato %', replace(r.status, '_', ' ') using errcode = 'P0001'; end if;
  update public.settlements set status = 'annullato', decided_by = (select auth.uid()), decided_at = now() where id = _id;
end
$$;
grant execute on function public.cancel_settlement(uuid) to authenticated;

-- il destinatario conferma o rifiuta, una volta sola; la conferma vale solo se i saldi sono quelli che vedeva
create or replace function public.decide_settlement(_id uuid, _accept boolean, _version text default null)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare r public.settlements; wanted text;
begin
  select * into r from public.settlements where id = _id for update;
  if not found or not public.is_traveler_user(r.to_traveler) then raise exception 'Rimborso non trovato' using errcode = 'P0001'; end if;
  wanted := case when _accept then 'confermato' else 'rifiutato' end;
  if r.status = wanted then return r.status; end if; -- conferme ripetute: nessun effetto in più
  if r.status <> 'in_attesa' then raise exception 'Il rimborso è già stato %', replace(r.status, '_', ' ') using errcode = 'P0001'; end if;
  if _accept and _version is not null and _version <> public.balance_version(r.trip_id) then
    raise exception 'I saldi sono cambiati: controlla il piano aggiornato' using errcode = 'P0001';
  end if;
  update public.settlements set status = wanted, decided_by = (select auth.uid()), decided_at = now(),
         balance_version = coalesce(_version, public.balance_version(r.trip_id)) where id = _id;
  return wanted;
end
$$;
grant execute on function public.decide_settlement(uuid, boolean, text) to authenticated;

-- i rimborsi confermati di tutti i miei viaggi (solo chi, a chi e quanto): servono a calcolare i saldi uguali per tutti
create or replace function public.my_confirmed_settlements()
returns table (id uuid, trip_id uuid, from_traveler uuid, to_traveler uuid, amount numeric, currency text)
language sql stable security definer
set search_path = ''
as $$
  select s.id, s.trip_id, s.from_traveler, s.to_traveler, s.amount, s.currency
  from public.settlements s where s.status = 'confermato' and public.is_trip_member(s.trip_id)
$$;
grant execute on function public.my_confirmed_settlements() to authenticated;
