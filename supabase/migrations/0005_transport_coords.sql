-- Trasporti: posizione di partenza e di arrivo (es. due stazioni), per disegnarli sulla mappa del giorno.
alter table public.transports
  add column if not exists from_lat double precision,
  add column if not exists from_lng double precision,
  add column if not exists to_lat   double precision,
  add column if not exists to_lng   double precision;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transports_coords_ok') then
    alter table public.transports add constraint transports_coords_ok check (
      (from_lat is null) = (from_lng is null)
      and (to_lat is null) = (to_lng is null)
      and (from_lat is null or (from_lat between -90 and 90 and from_lng between -180 and 180))
      and (to_lat is null or (to_lat between -90 and 90 and to_lng between -180 and 180))
    );
  end if;
end $$;
