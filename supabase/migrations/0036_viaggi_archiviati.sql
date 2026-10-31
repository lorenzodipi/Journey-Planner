-- #59 Archivia un viaggio (reversibile). Additiva.
alter table public.trips add column if not exists archived_at timestamptz;
