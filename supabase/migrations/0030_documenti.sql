-- 0030 · Documenti con visibilità (#52, FRD BOOK-004/008/011…020/030/031, MOVE-004, STAY-006, BR-10/31…34/65).
-- Un documento = un file caricato una volta, con visibilità Tutti · Viaggiatori selezionati · Solo io e più collegamenti
-- (prenotazione, tappa, luogo, alloggio, trasporto, volo). Solo chi l'ha caricato ne cambia la visibilità.
-- I permessi valgono anche sul bucket privato «bookings»: per ogni file che ha un documento decide il documento, non il viaggio.
-- I file dei vecchi viaggi senza documento restano visibili ai membri come prima (nessuno perde l'accesso).
-- Le prenotazioni con file diventano documenti «Tutti» collegati alla prenotazione.
-- Additiva e rilanciabile; senza questa migrazione l'app funziona come prima.
-- Da eseguire dopo la 0029, nel SQL Editor di Supabase.

create table if not exists public.documents (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references public.trips (id) on delete cascade,
  file_path             text not null unique,
  name                  text not null check (length(btrim(name)) between 1 and 200),
  mime_type             text,
  size_bytes            integer,
  owner_id              uuid references auth.users (id) on delete set null default auth.uid(),
  visibility            text not null default 'all' check (visibility in ('all', 'selected', 'private')),
  created_at            timestamptz not null default now(),
  visibility_changed_at timestamptz,
  visibility_changed_by uuid references auth.users (id) on delete set null,
  unique (id, trip_id)
);
create index if not exists documents_trip on public.documents (trip_id);

create table if not exists public.document_access (
  document_id uuid not null references public.documents (id) on delete cascade,
  traveler_id uuid not null references public.trip_travelers (id) on delete cascade,
  primary key (document_id, traveler_id)
);

create table if not exists public.document_links (
  document_id uuid not null references public.documents (id) on delete cascade,
  kind        text not null check (kind in ('booking', 'day_item', 'place', 'stay', 'flight', 'transport')),
  ref_id      uuid not null,
  primary key (document_id, kind, ref_id)
);
create index if not exists document_links_ref on public.document_links (kind, ref_id);

-- chi può vedere il documento: chi l'ha caricato, tutti i membri se «Tutti», i selezionati se «Viaggiatori selezionati»
create or replace function public.can_see_document(_doc uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    where d.id = _doc and public.is_trip_member(d.trip_id)
      and (d.owner_id = (select auth.uid())
           or d.visibility = 'all'
           or (d.visibility = 'selected' and exists (
                 select 1 from public.document_access a join public.trip_travelers t on t.id = a.traveler_id
                 where a.document_id = d.id and t.user_id = (select auth.uid()))))
  )
$$;
grant execute on function public.can_see_document(uuid) to authenticated;

create or replace function public.is_document_owner(_doc uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.documents d where d.id = _doc and d.owner_id = (select auth.uid())) $$;
grant execute on function public.is_document_owner(uuid) to authenticated;

alter table public.documents enable row level security;
alter table public.document_access enable row level security;
alter table public.document_links enable row level security;
drop policy if exists "documents_select" on public.documents;
drop policy if exists "documents_insert" on public.documents;
drop policy if exists "documents_update" on public.documents;
drop policy if exists "documents_delete" on public.documents;
-- `owner_id = …` direttamente: serve a «insert … returning», dove la funzione non vedrebbe ancora la riga appena scritta
create policy "documents_select" on public.documents for select to authenticated
  using (owner_id = (select auth.uid()) or public.can_see_document(id));
create policy "documents_insert" on public.documents for insert to authenticated
  with check (public.can_edit_trip(trip_id) and owner_id = (select auth.uid()));
create policy "documents_update" on public.documents for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and public.can_edit_trip(trip_id));
create policy "documents_delete" on public.documents for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "document_access_select" on public.document_access;
drop policy if exists "document_access_write" on public.document_access;
create policy "document_access_select" on public.document_access for select to authenticated using (public.can_see_document(document_id));
create policy "document_access_write" on public.document_access for all to authenticated
  using (public.is_document_owner(document_id)) with check (public.is_document_owner(document_id));
drop policy if exists "document_links_select" on public.document_links;
drop policy if exists "document_links_write" on public.document_links;
create policy "document_links_select" on public.document_links for select to authenticated using (public.can_see_document(document_id));
create policy "document_links_write" on public.document_links for all to authenticated
  using (public.is_document_owner(document_id)) with check (public.is_document_owner(document_id));
grant select, insert, update, delete on public.documents, public.document_access, public.document_links to authenticated;

-- ---- bucket «bookings»: i file con un documento seguono il documento (anche con un URL firmato vecchio: il controllo è sul server) ----
create or replace function public.can_read_file(_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.documents d where d.file_path = _name)
      then exists (select 1 from public.documents d where d.file_path = _name and public.can_see_document(d.id))
    else public.is_trip_member(((storage.foldername(_name))[1])::uuid)
  end
$$;
grant execute on function public.can_read_file(text) to authenticated;

create or replace function public.can_change_file(_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.documents d where d.file_path = _name)
      then exists (select 1 from public.documents d where d.file_path = _name and d.owner_id = (select auth.uid()))
    else public.can_edit_trip(((storage.foldername(_name))[1])::uuid)
  end
$$;
grant execute on function public.can_change_file(text) to authenticated;

drop policy if exists bookings_files_select on storage.objects;
drop policy if exists bookings_files_update on storage.objects;
drop policy if exists bookings_files_delete on storage.objects;
create policy bookings_files_select on storage.objects for select to authenticated
  using (bucket_id = 'bookings'
         and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and public.can_read_file(name));
create policy bookings_files_update on storage.objects for update to authenticated
  using (bucket_id = 'bookings'
         and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and public.can_change_file(name));
create policy bookings_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'bookings'
         and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and public.can_change_file(name));

-- ---- le prenotazioni con file diventano documenti «Tutti» collegati alla prenotazione ----
insert into public.documents (trip_id, file_path, name, owner_id, visibility)
select b.trip_id, b.file_path, coalesce(nullif(regexp_replace(b.file_path, '^.*/[0-9a-f-]{36}-', ''), ''), b.title), t.owner_id, 'all'
from public.bookings b join public.trips t on t.id = b.trip_id
where b.file_path is not null and b.deleted_at is null
  and not exists (select 1 from public.documents d where d.file_path = b.file_path);
insert into public.document_links (document_id, kind, ref_id)
select d.id, 'booking', b.id
from public.bookings b join public.documents d on d.file_path = b.file_path
where b.file_path is not null and b.deleted_at is null
on conflict do nothing;
