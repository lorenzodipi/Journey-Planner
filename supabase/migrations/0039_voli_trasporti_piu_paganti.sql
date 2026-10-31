-- Voli e trasporti: più persone che hanno pagato (es. 311,50 € a testa su 623 €). Additiva.
-- `payer_ids` vuoto/NULL = ha pagato `paid_by` (o nessuno); con 2+ persone il totale si divide in parti uguali.
alter table public.flights    add column if not exists payer_ids uuid[];
alter table public.transports add column if not exists payer_ids uuid[];
