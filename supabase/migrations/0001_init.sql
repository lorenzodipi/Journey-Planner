-- =============================================================================
-- Journey Planner · schema iniziale
-- Da eseguire UNA volta nell'SQL Editor di Supabase (o con `supabase db push`).
--
-- Principi
--  * Ogni riga appartiene a un viaggio (trip_id) e l'accesso passa dalla tabella
--    trip_members: chi non è membro non vede e non scrive nulla.
--  * Le registrazioni sono disabilitate dalla dashboard: gli utenti si creano a mano.
--  * Eliminazione logica (deleted_at) per undo e sincronizzazione offline.
--  * Ordinamento con "position" double precision (punto medio, nessuna riscrittura).
--  * Importi in numeric(12,2); i costi hanno scope per_person | total.
--  * Orari dei voli in timestamptz + fuso IANA dell'aeroporto: durate e scali
--    si calcolano, non si digitano.
-- =============================================================================

-- ---------- tipi -------------------------------------------------------------
create type public.member_role     as enum ('owner', 'editor', 'viewer');
create type public.place_status    as enum ('idea', 'planned', 'done', 'skipped');
create type public.item_kind       as enum ('visit', 'meal', 'transport', 'free', 'note', 'flight');
create type public.transport_mode  as enum ('train', 'metro', 'bus', 'taxi', 'walk', 'car', 'plane', 'ferry', 'other');
create type public.budget_scope    as enum ('per_person', 'total');
create type public.checklist_kind  as enum ('todo', 'packing', 'docs');
create type public.booking_type    as enum ('flight', 'hotel', 'train', 'ticket', 'insurance', 'esim', 'other');

-- ---------- utilità ----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- viaggi e membri --------------------------------------------------
create table public.trips (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users (id),
  title          text not null,
  destination    text,
  start_date     date,
  end_date       date,
  timezone       text not null default 'UTC',          -- fuso IANA della destinazione
  home_timezone  text not null default 'Europe/Rome',
  base_currency  char(3) not null default 'EUR',
  local_currency char(3),
  theme          text not null default 'default',      -- default | japan | iceland | ...
  center_lat     double precision,
  center_lng     double precision,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint trips_dates_ok check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.trip_members (
  trip_id    uuid not null references public.trips (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.member_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index trip_members_user_idx on public.trip_members (user_id);

-- funzioni usate dalle policy (security definer: evitano ricorsioni nella RLS)
create or replace function public.is_trip_member(_trip uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = _trip and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_trip(_trip uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = _trip
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'editor')
  );
$$;

create or replace function public.is_trip_owner(_trip uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = _trip and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

-- chi crea un viaggio ne diventa owner
create or replace function public.add_owner_membership()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger trips_add_owner
  after insert on public.trips
  for each row execute function public.add_owner_membership();

-- aggiunge un membro (es. il compagno di viaggio) cercandolo per email; solo l'owner
create or replace function public.add_member_by_email(_trip uuid, _email text, _role public.member_role default 'editor')
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  _uid uuid;
begin
  if not public.is_trip_owner(_trip) then
    raise exception 'Solo il proprietario del viaggio può aggiungere membri';
  end if;
  select id into _uid from auth.users where lower(email) = lower(_email);
  if _uid is null then
    raise exception 'Nessun utente con questa email: crealo prima da Authentication > Users';
  end if;
  insert into public.trip_members (trip_id, user_id, role)
  values (_trip, _uid, _role)
  on conflict (trip_id, user_id) do update set role = excluded.role;
end;
$$;

-- ---------- viaggiatori e categorie -------------------------------------------
create table public.trip_travelers (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  name       text not null,
  color      text not null default '#c8402f',
  user_id    uuid references auth.users (id) on delete set null,   -- se la persona ha un account
  position   double precision not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, trip_id)
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  label      text not null,
  icon       text,
  color      text,
  position   double precision not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, trip_id),
  unique (trip_id, label)
);

-- ---------- giorni, alloggi, luoghi, tappe -------------------------------------
create table public.days (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  date       date not null,
  day_number int,
  city       text,
  title      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, trip_id),
  unique (trip_id, date)
);

create table public.stays (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips (id) on delete cascade,
  city           text,
  name           text not null,
  check_in       date not null,
  check_out      date not null,
  check_in_info  text,                 -- es. "17:00–22:00"
  check_out_info text,                 -- es. "entro 10:30"
  address        text,
  lat            double precision,
  lng            double precision,
  maps_url       text,
  total_cost     numeric(12,2),        -- costo totale per tutti i viaggiatori
  currency       char(3) not null default 'EUR',
  breakfast      boolean not null default false,
  kitchen        boolean not null default false,
  booked         boolean not null default false,
  paid           boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  unique (id, trip_id),
  constraint stays_dates_ok check (check_out >= check_in)
);

create table public.places (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  category_id   uuid,
  name          text not null,
  name_local    text,                  -- nome nella lingua del posto (da mostrare a un tassista)
  city          text,
  address       text,
  lat           double precision,
  lng           double precision,
  maps_url      text,
  opening_hours text,
  est_cost      numeric(12,2),
  currency      char(3),
  status        public.place_status not null default 'idea',
  tags          text[] not null default '{}',
  notes         text,
  source        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (id, trip_id),
  foreign key (category_id, trip_id) references public.categories (id, trip_id),
  constraint places_lat_ok check (lat is null or lat between -90 and 90),
  constraint places_lng_ok check (lng is null or lng between -180 and 180)
);

create table public.day_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  day_id     uuid not null,
  place_id   uuid,
  kind       public.item_kind not null default 'visit',
  title      text not null,
  start_time time,
  end_time   time,
  cost       numeric(12,2),
  currency   char(3),
  notes      text,
  done       boolean not null default false,
  position   double precision not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, trip_id),
  foreign key (day_id, trip_id)   references public.days   (id, trip_id) on delete cascade,
  foreign key (place_id, trip_id) references public.places (id, trip_id) on delete set null (place_id)
);

-- ---------- trasporti e voli ---------------------------------------------------
create table public.transports (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  day_id     uuid,
  from_label text not null,
  to_label   text not null,
  mode       public.transport_mode not null default 'train',
  depart_at  timestamptz,
  arrive_at  timestamptz,
  cost       numeric(12,2),
  currency   char(3) not null default 'EUR',
  scope      public.budget_scope not null default 'per_person',
  bought     boolean not null default false,
  ref_code   text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, trip_id),
  foreign key (day_id, trip_id) references public.days (id, trip_id) on delete set null (day_id)
);

create table public.flights (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  title       text not null,           -- es. "Andata", "Ritorno"
  airline     text,
  booking_ref text,
  cost        numeric(12,2),
  currency    char(3) not null default 'EUR',
  scope       public.budget_scope not null default 'per_person',
  paid        boolean not null default false,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (id, trip_id)
);

create table public.flight_legs (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  flight_id     uuid not null,
  seq           int  not null,
  flight_number text,
  from_airport  char(3) not null,      -- codice IATA
  to_airport    char(3) not null,
  depart_at     timestamptz not null,
  arrive_at     timestamptz not null,
  from_tz       text not null,         -- fuso IANA dell'aeroporto di partenza
  to_tz         text not null,
  cabin         text,
  seats         text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (id, trip_id),
  unique (flight_id, seq),
  foreign key (flight_id, trip_id) references public.flights (id, trip_id) on delete cascade,
  constraint flight_legs_time_ok check (arrive_at > depart_at)
);

-- ---------- soldi ---------------------------------------------------------------
-- Una voce di budget vale "per persona" (ognuno paga amount) oppure "totale"
-- (amount diviso tra i viaggiatori assegnati). Lo stato "pagato" è per viaggiatore.
create table public.budget_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  label      text not null,
  category   text,
  amount     numeric(12,2) not null default 0,
  currency   char(3) not null default 'EUR',
  scope      public.budget_scope not null default 'per_person',
  due_date   date,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, trip_id)
);

create table public.budget_item_shares (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips (id) on delete cascade,
  budget_item_id uuid not null,
  traveler_id    uuid not null,
  paid           boolean not null default false,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  unique (budget_item_id, traveler_id),
  foreign key (budget_item_id, trip_id) references public.budget_items  (id, trip_id) on delete cascade,
  foreign key (traveler_id, trip_id)    references public.trip_travelers (id, trip_id) on delete cascade
);

create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  day_id      uuid,
  label       text not null,
  category    text,
  amount      numeric(12,2) not null,
  currency    char(3) not null,
  fx_rate     numeric(14,6),           -- unità di valuta base per 1 unità di currency
  paid_by     uuid,
  spent_at    timestamptz not null default now(),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (id, trip_id),
  foreign key (day_id, trip_id)  references public.days (id, trip_id) on delete set null (day_id),
  foreign key (paid_by, trip_id) references public.trip_travelers (id, trip_id) on delete set null (paid_by)
);

create table public.expense_shares (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  expense_id  uuid not null,
  traveler_id uuid not null,
  weight      numeric(8,3) not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (expense_id, traveler_id),
  foreign key (expense_id, trip_id)  references public.expenses (id, trip_id) on delete cascade,
  foreign key (traveler_id, trip_id) references public.trip_travelers (id, trip_id) on delete cascade
);

-- ---------- checklist e prenotazioni ---------------------------------------------
create table public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  traveler_id uuid,                    -- null = per tutti
  kind        public.checklist_kind not null default 'todo',
  text        text not null,
  done        boolean not null default false,
  due_date    date,
  position    double precision not null default 1000,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (id, trip_id),
  foreign key (traveler_id, trip_id) references public.trip_travelers (id, trip_id) on delete set null (traveler_id)
);

create table public.bookings (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  type              public.booking_type not null default 'other',
  title             text not null,
  confirmation_code text,
  url               text,
  valid_from        timestamptz,
  valid_to          timestamptz,
  file_path         text,              -- percorso nel bucket privato "bookings": <trip_id>/<file>
  keep_offline      boolean not null default false,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  unique (id, trip_id)
);

-- ---------- indici -----------------------------------------------------------------
create index on public.trip_travelers      (trip_id);
create index on public.categories          (trip_id);
create index on public.days                (trip_id, date);
create index on public.stays               (trip_id, check_in);
create index on public.places              (trip_id, city);
create index on public.places              (category_id);
create index on public.day_items           (day_id, position);
create index on public.day_items           (trip_id);
create index on public.day_items           (place_id);
create index on public.transports          (trip_id, depart_at);
create index on public.flights             (trip_id);
create index on public.flight_legs         (flight_id, seq);
create index on public.flight_legs         (trip_id);
create index on public.budget_items        (trip_id);
create index on public.budget_item_shares  (trip_id);
create index on public.budget_item_shares  (traveler_id);
create index on public.expenses            (trip_id, spent_at);
create index on public.expense_shares      (trip_id);
create index on public.expense_shares      (traveler_id);
create index on public.checklist_items     (trip_id, kind, position);
create index on public.bookings            (trip_id);

-- ---------- RLS: tabelle con trip_id ------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'trip_travelers', 'categories', 'days', 'stays', 'places', 'day_items',
    'transports', 'flights', 'flight_legs', 'budget_items', 'budget_item_shares',
    'expenses', 'expense_shares', 'checklist_items', 'bookings'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format($f$create policy "%1$s_select" on public.%1$I
                      for select to authenticated using (public.is_trip_member(trip_id))$f$, t);
    execute format($f$create policy "%1$s_insert" on public.%1$I
                      for insert to authenticated with check (public.can_edit_trip(trip_id))$f$, t);
    execute format($f$create policy "%1$s_update" on public.%1$I
                      for update to authenticated
                      using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id))$f$, t);
    execute format($f$create policy "%1$s_delete" on public.%1$I
                      for delete to authenticated using (public.can_edit_trip(trip_id))$f$, t);

    execute format('create trigger %1$s_updated before update on public.%1$I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end
$$;

-- ---------- RLS: trips e trip_members -------------------------------------------------
alter table public.trips        enable row level security;
alter table public.trip_members enable row level security;

-- L'owner deve poter leggere subito la riga appena inserita: `insert ... returning`
-- controlla questa policy prima che il trigger crei la riga in trip_members.
create policy trips_select on public.trips
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_trip_member(id));
create policy trips_insert on public.trips
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy trips_update on public.trips
  for update to authenticated
  using (public.can_edit_trip(id)) with check (public.can_edit_trip(id));
create policy trips_delete on public.trips
  for delete to authenticated using (public.is_trip_owner(id));

create trigger trips_updated before update on public.trips
  for each row execute function public.set_updated_at();

create policy trip_members_select on public.trip_members
  for select to authenticated using (public.is_trip_member(trip_id));
create policy trip_members_insert on public.trip_members
  for insert to authenticated with check (public.is_trip_owner(trip_id));
create policy trip_members_update on public.trip_members
  for update to authenticated
  using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));
create policy trip_members_delete on public.trip_members
  for delete to authenticated using (public.is_trip_owner(trip_id));

-- ---------- permessi sulle funzioni (le funzioni in "public" sono esposte via RPC) ------
revoke all on function public.is_trip_member(uuid)     from public, anon;
revoke all on function public.can_edit_trip(uuid)      from public, anon;
revoke all on function public.is_trip_owner(uuid)      from public, anon;
revoke all on function public.add_member_by_email(uuid, text, public.member_role) from public, anon;
revoke all on function public.add_owner_membership()   from public, anon, authenticated;
revoke all on function public.set_updated_at()         from public, anon;
grant execute on function public.is_trip_member(uuid)  to authenticated;
grant execute on function public.can_edit_trip(uuid)   to authenticated;
grant execute on function public.is_trip_owner(uuid)   to authenticated;
grant execute on function public.add_member_by_email(uuid, text, public.member_role) to authenticated;

-- ---------- permessi sulle tabelle (Data API) ----------------------------------------------
-- Il progetto va creato con "Automatically expose new tables" DISATTIVATO: nessuna tabella
-- è raggiungibile finché non la concediamo qui. Solo gli utenti loggati (authenticated)
-- ricevono i permessi; la RLS decide poi quali righe vedono. "anon" non ha accesso a nulla
-- tranne la tabella health (keep-alive), concessa più sotto.
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.trips, public.trip_members, public.trip_travelers, public.categories,
  public.days, public.stays, public.places, public.day_items, public.transports,
  public.flights, public.flight_legs, public.budget_items, public.budget_item_shares,
  public.expenses, public.expense_shares, public.checklist_items, public.bookings
  to authenticated;

-- ---------- keep-alive: tabella minima, leggibile anche da anonimo ---------------------
-- Serve solo per tenere attivo il progetto (piano Free: pausa dopo 7 giorni di inattività).
create table public.health (
  id int primary key default 1,
  ok boolean not null default true,
  constraint health_single_row check (id = 1)
);
insert into public.health (id, ok) values (1, true);
alter table public.health enable row level security;
create policy health_read on public.health
  for select to anon, authenticated using (true);

-- ---------- Storage: bucket privato per biglietti e documenti ---------------------------
-- Convenzione di percorso: <trip_id>/<nome-file>
insert into storage.buckets (id, name, public)
values ('bookings', 'bookings', false)
on conflict (id) do nothing;

create policy bookings_files_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bookings'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );
create policy bookings_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bookings'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_edit_trip(((storage.foldername(name))[1])::uuid)
  );
create policy bookings_files_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'bookings'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_edit_trip(((storage.foldername(name))[1])::uuid)
  );
create policy bookings_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bookings'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_edit_trip(((storage.foldername(name))[1])::uuid)
  );

-- health: lettura anche anonima (serve al keep-alive di GitHub Actions)
grant select on public.health to anon, authenticated;
