-- 0060 · La bici come mezzo tra le tappe. Rilanciabile: ricrea i due controlli di 0045 con il valore in più.
-- 1) Mezzo di solito usato del viaggio: «A piedi», «In bici», «Con i mezzi», «In auto».
-- 2) Mezzo scelto a mano per arrivare a una tappa: aggiunta la bici.
-- Nessun dato da cambiare: le righe di prima restano valide.
alter table public.trips drop constraint if exists trips_move_mode_check;
alter table public.trips add constraint trips_move_mode_check check (move_mode is null or move_mode in ('walk', 'bike', 'transit', 'car'));

alter table public.day_items drop constraint if exists day_items_arrive_mode_check;
alter table public.day_items add constraint day_items_arrive_mode_check check (arrive_mode is null or arrive_mode in ('walk', 'bike', 'metro', 'bus', 'train', 'taxi', 'car'));
