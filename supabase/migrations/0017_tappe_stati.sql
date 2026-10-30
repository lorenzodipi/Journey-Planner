-- =============================================================================
-- Faraway · 0017 · stati delle tappe, partecipanti e spese collegate (#32, #34)
-- Da eseguire UNA volta nell'SQL Editor di Supabase (si può rilanciare).
--
-- day_items.status            todo | done | skipped | late | postponed | cancelled
-- day_items.status_changed_at quando è cambiato lo stato («Fatta alle 08:34»)
-- day_items.postponed_from_day_id   giorno da cui la tappa è stata rimandata
-- day_items.participants      per chi è la tappa (vuoto = tutti): serve alla spesa collegata
-- expenses.source_kind / source_id  spesa nata da un'altra voce (tappa con costo, alloggio,
--                             volo, trasporto, prenotazione pagati): una sola spesa per voce.
-- Senza questa migrazione l'app funziona come prima: la tappa ha solo «fatta sì/no».
-- =============================================================================
alter table public.day_items add column if not exists status text not null default 'todo';
alter table public.day_items add column if not exists status_changed_at timestamptz;
alter table public.day_items add column if not exists postponed_from_day_id uuid references public.days(id) on delete set null;
alter table public.day_items add column if not exists participants uuid[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'day_items_status_check') then
    alter table public.day_items add constraint day_items_status_check
      check (status in ('todo', 'done', 'skipped', 'late', 'postponed', 'cancelled'));
  end if;
end $$;

-- le tappe già segnate «fatte» diventano «Fatta»
update public.day_items set status = 'done' where done = true and status = 'todo';

alter table public.expenses add column if not exists source_kind text;
alter table public.expenses add column if not exists source_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_source_kind_check') then
    alter table public.expenses add constraint expenses_source_kind_check
      check (source_kind is null or source_kind in ('day_item', 'stay', 'flight', 'transport', 'booking'));
  end if;
end $$;

-- una sola spesa (non eliminata) per voce collegata
create unique index if not exists expenses_source_unique
  on public.expenses (source_kind, source_id)
  where source_kind is not null and deleted_at is null;

-- categoria propria della tappa (icona e pillole del foglio «Aggiungi tappa»); vuota = quella del luogo
alter table public.day_items add column if not exists category_id uuid references public.categories(id) on delete set null;
