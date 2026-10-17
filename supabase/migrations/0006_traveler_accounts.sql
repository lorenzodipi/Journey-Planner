-- 0006 · I viaggiatori sono persone con un account reale + quantità nella checklist.
--
-- Prima: un viaggiatore era solo un nome scritto a mano (trip_travelers.user_id restava vuoto).
-- Ora: un viaggiatore nuovo si aggiunge SOLO con l'email di un account che esiste già
-- (Authentication > Users). La persona diventa anche membro del viaggio, così vede e modifica
-- ciò che le spetta. I viaggiatori già presenti (senza account) restano e si collegano dopo.
--
-- Esegui questo file nel SQL Editor di Supabase, una volta sola.

-- 1) un account può comparire una sola volta tra i viaggiatori attivi di un viaggio
create unique index if not exists trip_travelers_user_unique
  on public.trip_travelers (trip_id, user_id)
  where user_id is not null and deleted_at is null;

-- 2) guardia sulle scritture dirette dell'app: niente persone inventate.
--    Vale per chi scrive con il ruolo "authenticated" (l'app). Le funzioni qui sotto e gli
--    script di import (service_role) non passano da questo controllo.
create or replace function public.check_traveler_account()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user_id is null then
      raise exception 'Un viaggiatore deve avere un account: aggiungilo con la sua email';
    end if;
  elsif new.user_id is not distinct from old.user_id then
    return new;                                   -- nome, colore, posizione, eliminazione
  elsif new.user_id is null then
    raise exception 'Non si può scollegare l''account di un viaggiatore';
  end if;

  if not exists (
    select 1 from public.trip_members m
    where m.trip_id = new.trip_id and m.user_id = new.user_id
  ) then
    raise exception 'La persona non è membro del viaggio: aggiungila con la sua email';
  end if;
  return new;
end;
$$;

create trigger trip_travelers_check_account
  before insert or update on public.trip_travelers
  for each row execute function public.check_traveler_account();

-- 3) aggiunge un viaggiatore cercando l'email di un account esistente (solo l'owner).
--    Se la persona non è ancora membro del viaggio lo diventa; se lo è già, il ruolo resta.
create or replace function public.add_traveler_by_email(
  _trip uuid, _email text, _name text default null, _color text default '#c8402f',
  _role public.member_role default 'editor'
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  _uid uuid;
  _id  uuid;
  _label text;
begin
  if not public.is_trip_owner(_trip) then
    raise exception 'Solo il proprietario del viaggio può aggiungere persone';
  end if;
  select id into _uid from auth.users where lower(email) = lower(trim(_email));
  if _uid is null then
    raise exception 'Nessun account con questa email: la persona deve prima registrarsi';
  end if;
  if exists (select 1 from public.trip_travelers
             where trip_id = _trip and user_id = _uid and deleted_at is null) then
    raise exception 'Questa persona è già nel viaggio';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (_trip, _uid, _role)
  on conflict (trip_id, user_id) do nothing;

  _label := coalesce(nullif(trim(_name), ''), split_part(trim(_email), '@', 1));

  -- se la persona era stata tolta in passato la riprendo, così le sue spese restano collegate
  select id into _id from public.trip_travelers
   where trip_id = _trip and user_id = _uid and deleted_at is not null
   order by updated_at desc limit 1;
  if _id is not null then
    update public.trip_travelers set deleted_at = null, name = _label where id = _id;
    return _id;
  end if;

  insert into public.trip_travelers (trip_id, name, color, user_id, position)
  values (_trip, _label, coalesce(_color, '#c8402f'), _uid,
          coalesce((select max(position) from public.trip_travelers where trip_id = _trip), 0) + 1000)
  returning id into _id;
  return _id;
end;
$$;

-- 4) collega a un account un viaggiatore che c'è già (solo l'owner)
create or replace function public.link_traveler_to_email(_traveler uuid, _email text, _role public.member_role default 'editor')
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  _trip uuid;
  _uid  uuid;
begin
  select trip_id into _trip from public.trip_travelers where id = _traveler and deleted_at is null;
  if _trip is null then
    raise exception 'Viaggiatore non trovato';
  end if;
  if not public.is_trip_owner(_trip) then
    raise exception 'Solo il proprietario del viaggio può collegare un account';
  end if;
  select id into _uid from auth.users where lower(email) = lower(trim(_email));
  if _uid is null then
    raise exception 'Nessun account con questa email: la persona deve prima registrarsi';
  end if;
  if exists (select 1 from public.trip_travelers
             where trip_id = _trip and user_id = _uid and deleted_at is null and id <> _traveler) then
    raise exception 'Questo account è già collegato a un altro viaggiatore';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (_trip, _uid, _role)
  on conflict (trip_id, user_id) do nothing;

  update public.trip_travelers set user_id = _uid where id = _traveler;
end;
$$;

-- 5) chi c'è nel viaggio, con l'email: serve a mostrare "Mario · mario@…" nell'app.
--    Lo può chiamare solo chi è già membro del viaggio.
create or replace function public.trip_people(_trip uuid)
returns table (user_id uuid, email text, role public.member_role)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_trip_member(_trip) then
    raise exception 'Non sei membro di questo viaggio';
  end if;
  return query
    select m.user_id, u.email::text, m.role
    from public.trip_members m
    join auth.users u on u.id = m.user_id
    where m.trip_id = _trip
    order by m.created_at;
end;
$$;

-- 6) ripristino da backup JSON: i viaggiatori tornano con lo stesso id (le spese li richiamano)
--    ma senza account; si collegano dopo da Altro. Solo l'owner, solo su un viaggio vuoto.
create or replace function public.restore_travelers(_trip uuid, _travelers jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.is_trip_owner(_trip) then
    raise exception 'Solo il proprietario del viaggio può ripristinare';
  end if;
  if exists (select 1 from public.trip_travelers where trip_id = _trip) then
    raise exception 'Il viaggio ha già dei viaggiatori';
  end if;
  insert into public.trip_travelers (id, trip_id, name, color, position)
  select (x->>'id')::uuid, _trip, x->>'name',
         coalesce(x->>'color', '#c8402f'),
         coalesce((x->>'position')::double precision, 1000)
  from jsonb_array_elements(_travelers) as x;
end;
$$;

revoke all on function public.check_traveler_account() from public, anon;
revoke all on function public.add_traveler_by_email(uuid, text, text, text, public.member_role) from public, anon;
revoke all on function public.link_traveler_to_email(uuid, text, public.member_role) from public, anon;
revoke all on function public.trip_people(uuid) from public, anon;
revoke all on function public.restore_travelers(uuid, jsonb) from public, anon;
grant execute on function public.add_traveler_by_email(uuid, text, text, text, public.member_role) to authenticated;
grant execute on function public.link_traveler_to_email(uuid, text, public.member_role) to authenticated;
grant execute on function public.trip_people(uuid) to authenticated;
grant execute on function public.restore_travelers(uuid, jsonb) to authenticated;

-- ---------- checklist: quantità per voce ---------------------------------------------------------
-- Vuoto = 1 pezzo. Serve per "3 magliette", "2 adattatori"...
alter table public.checklist_items add column if not exists quantity integer
  check (quantity is null or quantity between 1 and 999);
