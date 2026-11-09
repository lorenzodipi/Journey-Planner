-- 0045 · Come ci si sposta tra le tappe. Rilanciabile, solo colonne nuove e facoltative.
-- 1) Sul viaggio il mezzo di solito usato («A piedi», «Con i mezzi», «In auto») e fino a quanti minuti si va a piedi.
--    Vuoti = come prima: a piedi i tratti brevi, con i mezzi gli altri.
alter table public.trips add column if not exists move_mode text;
alter table public.trips add column if not exists walk_max_min smallint;

-- 2) Sulla tappa d'arrivo il mezzo scelto a mano per lo spostamento che porta lì e, se la si conosce, la durata vera.
--    Vuoti = si usa il mezzo del viaggio e la durata stimata.
alter table public.day_items add column if not exists arrive_mode text;
alter table public.day_items add column if not exists arrive_minutes smallint;

do $$
begin
  alter table public.trips add constraint trips_move_mode_check check (move_mode is null or move_mode in ('walk', 'transit', 'car'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.trips add constraint trips_walk_max_min_check check (walk_max_min is null or walk_max_min between 0 and 120);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.day_items add constraint day_items_arrive_mode_check check (arrive_mode is null or arrive_mode in ('walk', 'metro', 'bus', 'train', 'taxi', 'car'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.day_items add constraint day_items_arrive_minutes_check check (arrive_minutes is null or arrive_minutes between 1 and 1440);
exception when duplicate_object then null;
end $$;
