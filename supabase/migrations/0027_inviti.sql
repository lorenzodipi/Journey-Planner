-- Partecipanti e inviti (#44, FRD TRIP-004/005/006/013, BR-57).
-- Ruoli: creatore (owner) e partecipante (editor); «Solo vede» non esiste più.
-- Inviti per email con stato (inviato, accettato, rifiutato, scaduto): chi è invitato non vede nulla del viaggio finché non accetta.
-- Additiva: l'app funziona anche prima (senza la tabella non ci sono inviti). Si può rilanciare.

-- 1) nessun «Solo vede»: i vecchi viewer diventano partecipanti
update public.trip_members set role = 'editor' where role = 'viewer';

-- 2) inviti
create table if not exists public.trip_invites (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips (id) on delete cascade,
  email        text not null,
  status       text not null default 'inviato' check (status in ('inviato', 'accettato', 'rifiutato', 'scaduto')),
  invited_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz,
  constraint trip_invites_email_ok check (email = lower(btrim(email)) and position('@' in email) > 1)
);
create index if not exists trip_invites_trip_idx on public.trip_invites (trip_id);
create index if not exists trip_invites_email_idx on public.trip_invites (email);
-- una sola richiesta aperta per indirizzo e viaggio
create unique index if not exists trip_invites_open_idx on public.trip_invites (trip_id, email) where status = 'inviato';

-- email dell'utente collegato
create or replace function public.my_email()
returns text
language sql stable security definer
set search_path = ''
as $$ select lower(u.email::text) from auth.users u where u.id = (select auth.uid()) $$;

-- validazione (TRIP-005): email già partecipante o doppia
create or replace function public.check_trip_invite()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.email := lower(btrim(new.email));
  if tg_op = 'INSERT' then
    new.status := 'inviato';
    new.invited_by := (select auth.uid());
    new.expires_at := now() + interval '7 days';
    new.responded_at := null;
    if exists (
      select 1 from public.trip_members m join auth.users u on u.id = m.user_id
      where m.trip_id = new.trip_id and lower(u.email::text) = new.email
    ) then
      raise exception 'Questa persona è già nel viaggio';
    end if;
    -- gli inviti scaduti non bloccano un nuovo invito
    update public.trip_invites set status = 'scaduto'
     where trip_id = new.trip_id and email = new.email and status = 'inviato' and expires_at < now();
  end if;
  return new;
end;
$$;
drop trigger if exists trip_invites_check on public.trip_invites;
create trigger trip_invites_check before insert on public.trip_invites
  for each row execute function public.check_trip_invite();

alter table public.trip_invites enable row level security;
drop policy if exists trip_invites_select on public.trip_invites;
create policy trip_invites_select on public.trip_invites
  for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists trip_invites_insert on public.trip_invites;
create policy trip_invites_insert on public.trip_invites
  for insert to authenticated with check (public.is_trip_owner(trip_id));
drop policy if exists trip_invites_delete on public.trip_invites;
create policy trip_invites_delete on public.trip_invites
  for delete to authenticated using (public.is_trip_owner(trip_id));
grant select, insert, delete on public.trip_invites to authenticated;

-- 3) inviti ricevuti: solo i miei, ancora aperti e non scaduti (chi è invitato non ha accesso alle tabelle del viaggio)
create or replace function public.my_invites()
returns table (id uuid, trip_id uuid, title text, destination text, start_date date, end_date date, invited_by_name text, expires_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select i.id, i.trip_id, t.title, t.destination, t.start_date, t.end_date,
         coalesce((select tt.name from public.trip_travelers tt where tt.trip_id = i.trip_id and tt.user_id = i.invited_by and tt.deleted_at is null limit 1),
                  (select split_part(u.email::text, '@', 1) from auth.users u where u.id = i.invited_by)),
         i.expires_at
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id and t.deleted_at is null
  where i.email = public.my_email() and i.status = 'inviato' and i.expires_at > now()
  order by i.created_at desc
$$;

-- 4) risposta all'invito: solo la persona invitata; se accetta entra come partecipante (editor) e ha il suo viaggiatore
create or replace function public.respond_invite(_invite uuid, _accept boolean)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  _i public.trip_invites;
  _uid uuid := (select auth.uid());
  _label text;
  _id uuid;
begin
  select * into _i from public.trip_invites where id = _invite for update;
  if not found or _i.email is distinct from public.my_email() then
    raise exception 'Invito non trovato';
  end if;
  if _i.status <> 'inviato' then
    raise exception 'Questo invito non è più valido';
  end if;
  if _i.expires_at < now() then
    update public.trip_invites set status = 'scaduto' where id = _invite;
    raise exception 'Questo invito è scaduto: chiedi di invitarti di nuovo';
  end if;
  if not _accept then
    update public.trip_invites set status = 'rifiutato', responded_at = now() where id = _invite;
    return null;
  end if;
  insert into public.trip_members (trip_id, user_id, role) values (_i.trip_id, _uid, 'editor')
    on conflict (trip_id, user_id) do nothing;
  _label := split_part(_i.email, '@', 1);
  select id into _id from public.trip_travelers where trip_id = _i.trip_id and user_id = _uid order by deleted_at nulls first, updated_at desc limit 1;
  if _id is not null then
    update public.trip_travelers set deleted_at = null where id = _id;
  else
    insert into public.trip_travelers (trip_id, name, user_id, position)
    values (_i.trip_id, initcap(_label), _uid, coalesce((select max(position) from public.trip_travelers where trip_id = _i.trip_id), 0) + 1000);
  end if;
  update public.trip_invites set status = 'accettato', responded_at = now() where id = _invite;
  return _i.trip_id;
end;
$$;

-- 5) chi crea il viaggio non si può togliere dai partecipanti
drop policy if exists trip_members_delete on public.trip_members;
create policy trip_members_delete on public.trip_members
  for delete to authenticated using (
    public.is_trip_owner(trip_id) and role <> 'owner'
  );

revoke all on function public.my_email() from public, anon;
revoke all on function public.my_invites() from public, anon;
revoke all on function public.respond_invite(uuid, boolean) from public, anon;
grant execute on function public.my_email() to authenticated;
grant execute on function public.my_invites() to authenticated;
grant execute on function public.respond_invite(uuid, boolean) to authenticated;
