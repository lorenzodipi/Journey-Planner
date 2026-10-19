-- 0010 · Prenotazioni e documenti: il costo (es. l'assicurazione) e chi lo ha pagato.
-- Il costo entra nel Budget come già pagato, nella categoria del tipo di documento (Assicurazione, eSIM…).
-- `payer_ids` sono i viaggiatori che lo hanno pagato; vuoto = tutti.
-- Da eseguire dopo la 0009, una volta sola, nel SQL Editor di Supabase.

alter table public.bookings
  add column if not exists cost      numeric(12,2),
  add column if not exists currency  char(3) not null default 'EUR',
  add column if not exists scope     public.budget_scope not null default 'per_person',
  add column if not exists payer_ids uuid[] not null default '{}';
