-- #55 Programma del giorno verificabile: margine tra tappe, alloggio come partenza e arrivo. Additiva.
alter table public.trips add column if not exists default_margin_min int check (default_margin_min between 0 and 240);
alter table public.days
  add column if not exists margin_min     int check (margin_min between 0 and 240),
  add column if not exists start_stay_id  uuid references public.stays (id) on delete set null,
  add column if not exists end_stay_id    uuid references public.stays (id) on delete set null,
  add column if not exists exclude_stay   boolean not null default false;
