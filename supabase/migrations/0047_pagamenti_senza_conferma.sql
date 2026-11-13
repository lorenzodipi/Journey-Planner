-- 0047 · Pagamenti registrati subito, reclamo e «Bilancia tutte le spese».
-- Prima: chi paga dichiara «Ho pagato», il destinatario deve confermare (0029). Ora il pagamento vale subito e il
-- destinatario, se non è d'accordo, lo contesta (`contestato`): il pagamento smette di contare e la voce torna aperta.
-- «Bilancia» registra in un colpo solo (stesso `group_id`) i pagamenti e le compensazioni tra due persone: una compensazione
-- (`compensation`) è un debito che si annulla con un credito, non un versamento di soldi.
-- Le richieste già in attesa restano com'erano e si decidono con `decide_settlement`. Additiva e rilanciabile;
-- senza questa migrazione l'app funziona come prima (con la conferma del destinatario).
-- Da eseguire dopo la 0046, nel SQL Editor di Supabase.

alter table public.settlements add column if not exists compensation boolean not null default false;
alter table public.settlements add column if not exists group_id uuid;
create index if not exists settlements_group on public.settlements (group_id) where group_id is not null;

alter table public.settlements drop constraint if exists settlements_status_check;
alter table public.settlements add constraint settlements_status_check
  check (status in ('in_attesa', 'confermato', 'rifiutato', 'annullato', 'contestato'));

-- registra uno o più pagamenti tra due persone, già confermati; chi li registra è una delle due
-- _rows: [{ "from": uuid, "to": uuid, "amount": 12.5, "currency": "EUR", "paid_on": "2026-11-28", "expense_id": uuid|null, "compensation": bool }]
create or replace function public.declare_settlements(_trip uuid, _rows jsonb)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  grp uuid := gen_random_uuid();
  r jsonb; f uuid; t uuid; amt numeric(14, 2); exp uuid;
  lo uuid; hi uuid;
begin
  if not public.can_edit_trip(_trip) then raise exception 'Non puoi registrare pagamenti in questo viaggio' using errcode = 'P0001'; end if;
  if jsonb_typeof(_rows) <> 'array' or jsonb_array_length(_rows) = 0 or jsonb_array_length(_rows) > 200 then
    raise exception 'Nessun pagamento da registrare' using errcode = 'P0001';
  end if;
  for r in select * from jsonb_array_elements(_rows) loop
    f := (r ->> 'from')::uuid; t := (r ->> 'to')::uuid; amt := round((r ->> 'amount')::numeric, 2);
    exp := nullif(r ->> 'expense_id', '')::uuid;
    if f is null or t is null or f = t or amt is null or amt <= 0 then raise exception 'Pagamento non valido' using errcode = 'P0001'; end if;
    if not (public.is_traveler_user(f) or public.is_traveler_user(t)) then
      raise exception 'Puoi registrare solo pagamenti che ti riguardano' using errcode = 'P0001';
    end if;
    if lo is null then lo := least(f, t); hi := greatest(f, t);
    elsif least(f, t) <> lo or greatest(f, t) <> hi then raise exception 'I pagamenti devono riguardare le stesse due persone' using errcode = 'P0001'; end if;
    if exp is not null and not exists (select 1 from public.expenses e where e.id = exp and e.trip_id = _trip) then
      raise exception 'Spesa non trovata' using errcode = 'P0001';
    end if;
    insert into public.settlements (trip_id, from_traveler, to_traveler, amount, currency, paid_on, status, created_by, decided_by, decided_at, expense_id, compensation, group_id)
    values (_trip, f, t, amt, r ->> 'currency', (r ->> 'paid_on')::date, 'confermato', (select auth.uid()), (select auth.uid()), now(), exp, coalesce((r ->> 'compensation')::boolean, false), grp);
  end loop;
  return grp;
end
$$;
grant execute on function public.declare_settlements(uuid, jsonb) to authenticated;

-- il destinatario contesta un pagamento (se è una «Bilancia», lo può fare una qualsiasi delle due persone):
-- smette di contare nei saldi e la voce torna aperta
create or replace function public.dispute_settlement(_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare r public.settlements;
begin
  select * into r from public.settlements where id = _id for update;
  if not found or not (public.is_traveler_user(r.to_traveler) or (r.group_id is not null and public.is_traveler_user(r.from_traveler))) then
    raise exception 'Pagamento non trovato' using errcode = 'P0001';
  end if;
  if r.status = 'contestato' then return; end if; -- reclami ripetuti: nessun effetto in più
  if r.status <> 'confermato' then raise exception 'Il pagamento è già stato %', replace(r.status, '_', ' ') using errcode = 'P0001'; end if;
  update public.settlements set status = 'contestato', decided_by = (select auth.uid()), decided_at = now()
   where status = 'confermato' and (id = _id or (r.group_id is not null and group_id = r.group_id));
end
$$;
grant execute on function public.dispute_settlement(uuid) to authenticated;

-- annulla: il mittente una richiesta ancora in attesa (come prima); chi ha registrato un pagamento già valido lo ritira
-- (tutta la «Bilancia» se è di gruppo), purché non sia stato contestato
create or replace function public.cancel_settlement(_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare r public.settlements;
begin
  select * into r from public.settlements where id = _id for update;
  if not found or not (public.is_traveler_user(r.from_traveler) or r.created_by = (select auth.uid())) then
    raise exception 'Rimborso non trovato' using errcode = 'P0001';
  end if;
  if r.status = 'annullato' then return; end if;
  if r.status = 'in_attesa' and public.is_traveler_user(r.from_traveler) then
    update public.settlements set status = 'annullato', decided_by = (select auth.uid()), decided_at = now() where id = _id;
  elsif r.status = 'confermato' and r.created_by = (select auth.uid()) then
    update public.settlements set status = 'annullato', decided_by = (select auth.uid()), decided_at = now()
     where status = 'confermato' and (id = _id or (r.group_id is not null and group_id = r.group_id));
  else
    raise exception 'Il rimborso è già stato %', replace(r.status, '_', ' ') using errcode = 'P0001';
  end if;
end
$$;
grant execute on function public.cancel_settlement(uuid) to authenticated;
