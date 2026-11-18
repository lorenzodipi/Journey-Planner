-- 0054 · Passeggeri del volo: chi viaggia con questo biglietto, separato da «Diviso tra» (for_travelers, il costo).
-- flights.passenger_ids: i viaggiatori che hanno il biglietto (servono ai posti e alla carta d'imbarco).
--   null = non scelto (voli salvati prima): l'app usa for_travelers e, se vuoto, tutti.
--   {}   = tutti i viaggiatori del viaggio.
-- Additiva e rilanciabile; l'app funziona anche prima di eseguirla (i passeggeri restano quelli di «Diviso tra»).

alter table public.flights add column if not exists passenger_ids uuid[];
