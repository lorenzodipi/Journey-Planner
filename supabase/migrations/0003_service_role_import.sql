-- Permessi per lo script locale di import dello Sheet (scripts/import-sheet).
-- Il progetto è creato con "Automatically expose new tables" disattivato, quindi nemmeno
-- service_role (la chiave "secret") ha accesso alle tabelle finché non lo concediamo.
-- Il minimo necessario: leggere i viaggi e i viaggiatori, creare/aggiornare ciò che l'import scrive.
-- service_role salta la RLS, ma la chiave resta solo in .env.local sul tuo PC.
grant usage on schema public to service_role;
grant select on public.trips, public.trip_travelers to service_role;
grant select, insert, update on
  public.categories, public.places, public.stays, public.transports,
  public.budget_items, public.budget_item_shares, public.days
  to service_role;
