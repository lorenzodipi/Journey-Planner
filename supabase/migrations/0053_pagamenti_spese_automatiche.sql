-- 0053 · Pagamenti legati alle spese automatiche (alloggi, voli, trasporti, prenotazioni pagati senza una spesa
-- registrata). Nell'app queste spese hanno un id «tipo:uuid» (es. «stay:…»), che non è una spesa della tabella
-- `expenses`: «Ho pagato» e «Bilancia» su una di queste card fallivano con «invalid input syntax for type uuid».
-- Ora il pagamento ricorda la voce da cui nasce la spesa (`source_kind`, `source_id`).
-- `declare_settlements` accetta la voce sia nel campo nuovo `source` sia, per le app non ancora aggiornate, in
-- `expense_id` («stay:uuid»). Un pagamento di una voce cancellata non conta più, come per le spese (0048).
-- Additiva e rilanciabile; senza questa migrazione l'app registra il pagamento senza il legame con la card.

alter table public.settlements add column if not exists source_kind text;
alter table public.settlements add column if not exists source_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'settlements_source_check') then
    alter table public.settlements add constraint settlements_source_check check (
      (source_kind is null and source_id is null)
      or (source_kind in ('stay', 'flight', 'transport', 'booking') and source_id is not null)
    );
  end if;
end $$;
create index if not exists settlements_source on public.settlements (source_kind, source_id) where source_id is not null;

-- la voce da cui nasce una spesa automatica esiste in questo viaggio (e non è cancellata)
create or replace function public.voce_di_spesa(_trip uuid, _kind text, _id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_trip_member(_trip) and case _kind
    when 'stay' then exists (select 1 from public.stays x where x.id = _id and x.trip_id = _trip and x.deleted_at is null)
    when 'flight' then exists (select 1 from public.flights x where x.id = _id and x.trip_id = _trip and x.deleted_at is null)
    when 'transport' then exists (select 1 from public.transports x where x.id = _id and x.trip_id = _trip and x.deleted_at is null)
    when 'booking' then exists (select 1 from public.bookings x where x.id = _id and x.trip_id = _trip and x.deleted_at is null)
    else false
  end
$$;
revoke all on function public.voce_di_spesa(uuid, text, uuid) from public, anon;
grant execute on function public.voce_di_spesa(uuid, text, uuid) to authenticated;

-- come la 0047, più la voce della spesa automatica
-- _rows: [{ "from": uuid, "to": uuid, "amount": 12.5, "currency": "EUR", "paid_on": "2026-11-28",
--           "expense_id": uuid|"tipo:uuid"|null, "source": "tipo:uuid"|null, "compensation": bool }]
create or replace function public.declare_settlements(_trip uuid, _rows jsonb)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  grp uuid := gen_random_uuid();
  r jsonb; f uuid; t uuid; amt numeric(14, 2); exp uuid;
  rif text; sk text; sid uuid;
  lo uuid; hi uuid;
begin
  if not public.can_edit_trip(_trip) then raise exception 'Non puoi registrare pagamenti in questo viaggio' using errcode = 'P0001'; end if;
  if jsonb_typeof(_rows) <> 'array' or jsonb_array_length(_rows) = 0 or jsonb_array_length(_rows) > 200 then
    raise exception 'Nessun pagamento da registrare' using errcode = 'P0001';
  end if;
  for r in select * from jsonb_array_elements(_rows) loop
    f := (r ->> 'from')::uuid; t := (r ->> 'to')::uuid; amt := round((r ->> 'amount')::numeric, 2);
    exp := null; sk := null; sid := null;
    -- la spesa: un uuid di `expenses`, oppure «tipo:uuid» di una spesa automatica (anche in expense_id, dalle app vecchie)
    rif := coalesce(nullif(r ->> 'source', ''), nullif(r ->> 'expense_id', ''));
    if rif is not null then
      if rif ~* '^(stay|flight|transport|booking):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        sk := lower(split_part(rif, ':', 1)); sid := split_part(rif, ':', 2)::uuid;
        if not public.voce_di_spesa(_trip, sk, sid) then raise exception 'Spesa non trovata' using errcode = 'P0001'; end if;
      elsif rif ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        exp := rif::uuid;
        if not exists (select 1 from public.expenses e where e.id = exp and e.trip_id = _trip) then
          raise exception 'Spesa non trovata' using errcode = 'P0001';
        end if;
      else
        raise exception 'Spesa non trovata' using errcode = 'P0001';
      end if;
    end if;
    if f is null or t is null or f = t or amt is null or amt <= 0 then raise exception 'Pagamento non valido' using errcode = 'P0001'; end if;
    if not (public.is_traveler_user(f) or public.is_traveler_user(t)) then
      raise exception 'Puoi registrare solo pagamenti che ti riguardano' using errcode = 'P0001';
    end if;
    if lo is null then lo := least(f, t); hi := greatest(f, t);
    elsif least(f, t) <> lo or greatest(f, t) <> hi then raise exception 'I pagamenti devono riguardare le stesse due persone' using errcode = 'P0001'; end if;
    insert into public.settlements (trip_id, from_traveler, to_traveler, amount, currency, paid_on, status, created_by, decided_by, decided_at, expense_id, source_kind, source_id, compensation, group_id)
    values (_trip, f, t, amt, r ->> 'currency', (r ->> 'paid_on')::date, 'confermato', (select auth.uid()), (select auth.uid()), now(), exp, sk, sid, coalesce((r ->> 'compensation')::boolean, false), grp);
  end loop;
  return grp;
end
$$;
grant execute on function public.declare_settlements(uuid, jsonb) to authenticated;

-- come la 0048: non contano i pagamenti di una spesa o di una voce cancellata (e le compensazioni del loro gruppo)
create or replace function public.my_confirmed_settlements()
returns table (id uuid, trip_id uuid, from_traveler uuid, to_traveler uuid, amount numeric, currency text)
language sql stable security definer
set search_path = ''
as $$
  with conf as (
    select s.*,
      ((s.expense_id is not null and (e.id is null or e.deleted_at is not null))
        or (s.source_id is not null and not public.voce_di_spesa(s.trip_id, s.source_kind, s.source_id))) as morto
    from public.settlements s
    left join public.expenses e on e.id = s.expense_id
    where s.status = 'confermato' and public.is_trip_member(s.trip_id)
  ), rotti as (
    select distinct group_id from conf where compensation and group_id is not null and morto
  )
  select c.id, c.trip_id, c.from_traveler, c.to_traveler, c.amount, c.currency
  from conf c
  where not c.morto and not (c.compensation and c.group_id in (select group_id from rotti))
$$;
grant execute on function public.my_confirmed_settlements() to authenticated;
