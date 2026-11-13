-- Visualizzatori e costi privati (fase 1 di 2).
-- Un «visualizzatore» (ruolo `viewer`) vede il viaggio in sola lettura e non ne fa parte: niente spese, rimborsi,
-- budget, documenti, prenotazioni, checklist, registro; dei luoghi solo quelli usati nelle tappe. Non scrive niente
-- (le scritture chiedono già `can_edit_trip`, cioè creatore o partecipante).
-- I costi di alloggi, voli, trasporti, tappe, luoghi e il limite di budget del viaggio stanno nelle stesse righe che il
-- visualizzatore legge: vengono copiati in `trip_costs`, leggibile solo da creatore e partecipanti. Le colonne vecchie
-- restano piene finché tutti hanno l'app nuova; la 0050 le svuota e accende gli inviti come visualizzatore.
-- Le scritture dell'app non cambiano: dei trigger copiano i costi in `trip_costs` a ogni modifica.
-- Additiva e rilanciabile; l'app funziona anche prima (senza `trip_costs` usa le colonne di sempre).

-- 0) chi fa parte del viaggio (creatore o partecipante)
create or replace function public.is_trip_participant(_trip uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = _trip and m.user_id = (select auth.uid()) and m.role in ('owner', 'editor')
  );
$$;
grant execute on function public.is_trip_participant(uuid) to authenticated;

-- fase: false finché le colonne vecchie restano piene (la 0050 la rende true)
create or replace function public.costi_separati()
returns boolean
language sql stable
set search_path = ''
as $$ select false $$;
grant execute on function public.costi_separati() to authenticated;

-- 1) costi privati
create table if not exists public.trip_costs (
  kind       text not null check (kind in ('stay', 'flight', 'transport', 'day_item', 'place', 'trip')),
  ref_id     uuid not null,
  trip_id    uuid not null, -- niente FK: il costo del viaggio nasce nel trigger «before insert» di trips
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (kind, ref_id)
);
create index if not exists trip_costs_trip_idx on public.trip_costs (trip_id);
alter table public.trip_costs enable row level security;
drop policy if exists trip_costs_select on public.trip_costs;
create policy trip_costs_select on public.trip_costs for select to authenticated using (public.is_trip_participant(trip_id));
revoke all on public.trip_costs from anon, authenticated;
grant select on public.trip_costs to authenticated;

-- copia nei costi le colonne indicate (tg_argv[0] = tipo, poi le colonne). Su UPDATE il trigger è «update of colonna»:
-- scatta quando la colonna è nella modifica, anche se il valore non cambia (così si può anche svuotare un costo).
-- Con la fase 2 la colonna nella riga diventa vuota (false per i flag «pagato»).
create or replace function public.copia_costi()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  _kind text := tg_argv[0];
  _riga jsonb := to_jsonb(new);
  _dati jsonb := '{}'::jsonb;
  _vuoto jsonb := '{}'::jsonb;
  _c text;
begin
  for i in 1 .. tg_nargs - 1 loop
    _c := tg_argv[i];
    _dati := _dati || jsonb_build_object(_c, _riga -> _c);
    _vuoto := _vuoto || jsonb_build_object(_c, case when _c in ('paid', 'bought') then 'false'::jsonb else 'null'::jsonb end);
  end loop;
  insert into public.trip_costs (kind, ref_id, trip_id, data)
  values (_kind, new.id, case when _kind = 'trip' then new.id else (_riga ->> 'trip_id')::uuid end, _dati)
  on conflict (kind, ref_id) do update set data = public.trip_costs.data || excluded.data, updated_at = now();
  if public.costi_separati() then
    new := jsonb_populate_record(new, _vuoto);
  end if;
  return new;
end;
$$;

create or replace function public.togli_costi()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.trip_costs where kind = tg_argv[0] and ref_id = old.id;
  return old;
end;
$$;

do $$
declare
  _t record;
  _c text;
begin
  for _t in
    select * from (values
      ('stays', 'stay', array['total_cost', 'paid', 'paid_by']),
      ('flights', 'flight', array['cost', 'paid', 'paid_by', 'payer_ids']),
      ('transports', 'transport', array['cost', 'bought', 'paid_by', 'payer_ids']),
      ('day_items', 'day_item', array['cost']),
      ('places', 'place', array['est_cost']),
      ('trips', 'trip', array['budget_limit'])
    ) as v(tab, kind, cols)
  loop
    -- inserimento: tutte le colonne
    execute format('drop trigger if exists costi_ins on public.%I', _t.tab);
    execute format('create trigger costi_ins before insert on public.%I for each row execute function public.copia_costi(%L, %s)',
      _t.tab, _t.kind, (select string_agg(quote_literal(c), ', ') from unnest(_t.cols) c));
    -- modifica: un trigger per colonna
    foreach _c in array _t.cols loop
      execute format('drop trigger if exists %I on public.%I', 'costi_' || _c, _t.tab);
      execute format('create trigger %I before update of %I on public.%I for each row execute function public.copia_costi(%L, %L)',
        'costi_' || _c, _c, _t.tab, _t.kind, _c);
    end loop;
    execute format('drop trigger if exists costi_del on public.%I', _t.tab);
    execute format('create trigger costi_del after delete on public.%I for each row execute function public.togli_costi(%L)', _t.tab, _t.kind);
    -- copia di quello che c'è già (rilanciabile: non sovrascrive)
    execute format('insert into public.trip_costs (kind, ref_id, trip_id, data) select %L, r.id, %s, jsonb_build_object(%s) from public.%I r on conflict (kind, ref_id) do nothing',
      _t.kind, case when _t.kind = 'trip' then 'r.id' else 'r.trip_id' end,
      (select string_agg(format('%L, r.%I', c, c), ', ') from unnest(_t.cols) c), _t.tab);
  end loop;
end $$;

-- 2) lettura solo per chi fa parte del viaggio
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select to authenticated using (public.is_trip_participant(trip_id));
drop policy if exists expense_shares_select on public.expense_shares;
create policy expense_shares_select on public.expense_shares for select to authenticated using (public.is_trip_participant(trip_id));
drop policy if exists expense_payers_select on public.expense_payers;
create policy expense_payers_select on public.expense_payers for select to authenticated using (public.is_trip_participant(trip_id));
drop policy if exists expense_files_select on public.expense_files;
create policy expense_files_select on public.expense_files for select to authenticated using (public.is_trip_participant(trip_id));
drop policy if exists expense_categories_select on public.expense_categories;
create policy expense_categories_select on public.expense_categories for select to authenticated using (public.is_trip_participant(trip_id));
drop policy if exists budget_items_select on public.budget_items;
create policy budget_items_select on public.budget_items for select to authenticated using (public.is_trip_participant(trip_id));
drop policy if exists budget_item_shares_select on public.budget_item_shares;
create policy budget_item_shares_select on public.budget_item_shares for select to authenticated using (public.is_trip_participant(trip_id));
drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements for select to authenticated
  using (public.is_trip_participant(trip_id) and (public.is_traveler_user(from_traveler) or public.is_traveler_user(to_traveler)));
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select to authenticated using (public.is_trip_participant(trip_id));
drop policy if exists booking_items_select on public.booking_items;
create policy booking_items_select on public.booking_items for select to authenticated using (public.is_trip_participant(trip_id));
drop policy if exists checklist_items_select on public.checklist_items;
create policy checklist_items_select on public.checklist_items for select to authenticated
  using (public.is_trip_participant(trip_id) and (owner_id is null or owner_id = (select auth.uid())));
drop policy if exists checklist_checks_select on public.checklist_checks;
create policy checklist_checks_select on public.checklist_checks for select to authenticated
  using (public.is_trip_participant(trip_id) and exists (select 1 from public.checklist_items i where i.id = checklist_checks.item_id));
drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log for select to authenticated
  using (public.is_trip_participant(trip_id) and (table_name <> 'settlements' or actor = (select auth.uid())));
drop policy if exists trip_invites_select on public.trip_invites;
create policy trip_invites_select on public.trip_invites for select to authenticated using (public.is_trip_participant(trip_id));
-- luoghi: tutti per chi fa parte del viaggio, al visualizzatore solo quelli delle tappe
drop policy if exists places_select on public.places;
create policy places_select on public.places for select to authenticated
  using (public.is_trip_participant(trip_id)
         or (public.is_trip_member(trip_id) and exists (select 1 from public.day_items i where i.place_id = places.id and i.deleted_at is null)));

-- voci private della checklist: solo chi fa parte del viaggio
do $$
declare _p text;
begin
  foreach _p in array array['insert', 'update', 'delete'] loop
    execute format('drop policy if exists %I on public.checklist_items', 'checklist_items_' || _p);
  end loop;
end $$;
create policy checklist_items_insert on public.checklist_items for insert to authenticated with check (
  case when owner_id is null then public.can_edit_trip(trip_id) else owner_id = (select auth.uid()) and public.is_trip_participant(trip_id) end);
create policy checklist_items_update on public.checklist_items for update to authenticated
  using (case when owner_id is null then public.can_edit_trip(trip_id) else owner_id = (select auth.uid()) and public.is_trip_participant(trip_id) end)
  with check (case when owner_id is null then public.can_edit_trip(trip_id) else owner_id = (select auth.uid()) and public.is_trip_participant(trip_id) end);
create policy checklist_items_delete on public.checklist_items for delete to authenticated
  using (case when owner_id is null then public.can_edit_trip(trip_id) else owner_id = (select auth.uid()) and public.is_trip_participant(trip_id) end);

-- documenti e file
create or replace function public.can_see_document(_doc uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    where d.id = _doc and public.is_trip_participant(d.trip_id)
      and (d.owner_id = (select auth.uid())
           or d.visibility = 'all'
           or (d.visibility = 'selected' and exists (
                 select 1 from public.document_access a join public.trip_travelers t on t.id = a.traveler_id
                 where a.document_id = d.id and t.user_id = (select auth.uid()))))
  )
$$;
create or replace function public.can_read_file(_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.documents d where d.file_path = _name)
      then exists (select 1 from public.documents d where d.file_path = _name and public.can_see_document(d.id))
    -- gli altri file del viaggio solo a chi ne fa parte; i codici dei biglietti anche al visualizzatore
    else public.is_trip_participant(((storage.foldername(_name))[1])::uuid)
      or (public.is_trip_member(((storage.foldername(_name))[1])::uuid) and exists (select 1 from public.ticket_codes c where c.file_path = _name))
  end
$$;

-- saldi
create or replace function public.balance_version(_trip uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select case when public.is_trip_participant(_trip) then md5(
    coalesce((select string_agg(e.id::text || e.updated_at::text, ',' order by e.id) from public.expenses e where e.trip_id = _trip and e.deleted_at is null), '') || '|' ||
    coalesce((select string_agg(p.expense_id::text || p.traveler_id::text || p.amount::text, ',' order by p.expense_id, p.traveler_id) from public.expense_payers p where p.trip_id = _trip), '') || '|' ||
    coalesce((select string_agg(s.id::text || s.traveler_id::text || s.weight::text || coalesce(s.percent::text, '') || coalesce(s.amount::text, ''), ',' order by s.id) from public.expense_shares s where s.trip_id = _trip and s.deleted_at is null), '') || '|' ||
    coalesce((select string_agg(r.id::text, ',' order by r.id) from public.settlements r where r.trip_id = _trip and r.status = 'confermato'), '')
  ) end
$$;
create or replace function public.my_confirmed_settlements()
returns table (id uuid, trip_id uuid, from_traveler uuid, to_traveler uuid, amount numeric, currency text)
language sql stable security definer
set search_path = ''
as $$
  with conf as (
    select s.*, (s.expense_id is not null and (e.id is null or e.deleted_at is not null)) as morto
    from public.settlements s
    left join public.expenses e on e.id = s.expense_id
    where s.status = 'confermato' and public.is_trip_participant(s.trip_id)
  ), rotti as (
    select distinct group_id from conf where compensation and group_id is not null and morto
  )
  select c.id, c.trip_id, c.from_traveler, c.to_traveler, c.amount, c.currency
  from conf c
  where not c.morto and not (c.compensation and c.group_id in (select group_id from rotti))
$$;
grant execute on function public.my_confirmed_settlements() to authenticated;

-- chi ha accesso: il visualizzatore vede ruoli, ma non le email degli altri
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
    select m.user_id,
           case when public.is_trip_participant(_trip) or m.user_id = (select auth.uid()) then u.email::text end,
           m.role
    from public.trip_members m
    join auth.users u on u.id = m.user_id
    where m.trip_id = _trip
    order by m.created_at;
end;
$$;

-- 3) inviti con ruolo: il creatore invita partecipanti e visualizzatori, un partecipante solo visualizzatori
alter table public.trip_invites add column if not exists role public.member_role not null default 'editor';
alter table public.trip_invites drop constraint if exists trip_invites_role_ok;
alter table public.trip_invites add constraint trip_invites_role_ok check (role in ('editor', 'viewer'));
drop policy if exists trip_invites_insert on public.trip_invites;
create policy trip_invites_insert on public.trip_invites for insert to authenticated
  with check (public.is_trip_owner(trip_id) or (role = 'viewer' and public.can_edit_trip(trip_id)));
drop policy if exists trip_invites_delete on public.trip_invites;
create policy trip_invites_delete on public.trip_invites for delete to authenticated
  using (public.is_trip_owner(trip_id) or (invited_by = (select auth.uid()) and public.can_edit_trip(trip_id)));

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
    if new.role = 'viewer' and not public.costi_separati() then
      raise exception 'Gli inviti come visualizzatore non sono ancora attivi';
    end if;
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

drop function if exists public.my_invites();
create function public.my_invites()
returns table (id uuid, trip_id uuid, title text, destination text, start_date date, end_date date, invited_by_name text, expires_at timestamptz, role public.member_role)
language sql stable security definer
set search_path = ''
as $$
  select i.id, i.trip_id, t.title, t.destination, t.start_date, t.end_date,
         coalesce((select tt.name from public.trip_travelers tt where tt.trip_id = i.trip_id and tt.user_id = i.invited_by and tt.deleted_at is null limit 1),
                  (select split_part(u.email::text, '@', 1) from auth.users u where u.id = i.invited_by)),
         i.expires_at, i.role
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id and t.deleted_at is null
  where i.email = public.my_email() and i.status = 'inviato' and i.expires_at > now()
  order by i.created_at desc
$$;
revoke all on function public.my_invites() from public, anon;
grant execute on function public.my_invites() to authenticated;

-- il viaggiatore di un account (lo crea o lo ritrova)
create or replace function public.viaggiatore_per(_trip uuid, _uid uuid, _label text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare _id uuid;
begin
  select id into _id from public.trip_travelers where trip_id = _trip and user_id = _uid order by deleted_at nulls first, updated_at desc limit 1;
  if _id is not null then
    update public.trip_travelers set deleted_at = null where id = _id;
  else
    insert into public.trip_travelers (trip_id, name, user_id, position)
    values (_trip, initcap(_label), _uid, coalesce((select max(position) from public.trip_travelers where trip_id = _trip), 0) + 1000)
    returning id into _id;
  end if;
  return _id;
end;
$$;
revoke all on function public.viaggiatore_per(uuid, uuid, text) from public, anon, authenticated;

-- risposta all'invito: un visualizzatore entra senza viaggiatore
create or replace function public.respond_invite(_invite uuid, _accept boolean)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  _i public.trip_invites;
  _uid uuid := (select auth.uid());
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
  insert into public.trip_members (trip_id, user_id, role) values (_i.trip_id, _uid, coalesce(_i.role, 'editor'))
    on conflict (trip_id, user_id) do nothing;
  if coalesce(_i.role, 'editor') <> 'viewer' then
    perform public.viaggiatore_per(_i.trip_id, _uid, split_part(_i.email, '@', 1));
  end if;
  update public.trip_invites set status = 'accettato', responded_at = now() where id = _invite;
  return _i.trip_id;
end;
$$;

-- 4) un visualizzatore diventa partecipante (creatore o partecipante), con il suo viaggiatore
create or replace function public.promote_viewer(_trip uuid, _user uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare _email text;
begin
  if not public.can_edit_trip(_trip) then
    raise exception 'Solo chi fa parte del viaggio può farlo';
  end if;
  update public.trip_members set role = 'editor' where trip_id = _trip and user_id = _user and role = 'viewer';
  if not found then
    raise exception 'Questa persona non è un visualizzatore del viaggio';
  end if;
  select email::text into _email from auth.users where id = _user;
  return public.viaggiatore_per(_trip, _user, split_part(coalesce(_email, 'viaggiatore'), '@', 1));
end;
$$;
revoke all on function public.promote_viewer(uuid, uuid) from public, anon;
grant execute on function public.promote_viewer(uuid, uuid) to authenticated;

-- togliere qualcuno: il creatore toglie chiunque (tranne sé), un partecipante solo i visualizzatori
drop policy if exists trip_members_delete on public.trip_members;
create policy trip_members_delete on public.trip_members for delete to authenticated using (
  role <> 'owner' and (public.is_trip_owner(trip_id) or (role = 'viewer' and public.can_edit_trip(trip_id)))
);
