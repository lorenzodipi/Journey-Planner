-- 0061 · Più spese per una tappa.
-- Una spesa si collega a una tappa dal foglio della spesa (campo «Tappa»): source_kind = 'day_item', source_id = la tappa.
-- Prima la 0017 voleva una sola spesa per voce collegata; ora le tappe ne possono avere più d'una (il costo scritto in
-- «Modifica tappa» più quelle collegate da Spese). Alloggi, voli, trasporti, prenotazioni e documenti restano a una sola.
-- Additiva e rilanciabile; senza questa migrazione l'app funziona come prima (collegare una seconda spesa alla stessa
-- tappa dà un messaggio chiaro).

drop index if exists public.expenses_source_unique;
create unique index if not exists expenses_source_unique_voci
  on public.expenses (source_kind, source_id)
  where source_kind is not null and source_kind <> 'day_item' and deleted_at is null;
create index if not exists expenses_source_tappa
  on public.expenses (source_id)
  where source_kind = 'day_item' and deleted_at is null;
