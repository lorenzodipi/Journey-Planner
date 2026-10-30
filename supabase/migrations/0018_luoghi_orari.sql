-- =============================================================================
-- Faraway · 0018 · orari strutturati dei luoghi (#33)
-- Da eseguire UNA volta nell'SQL Editor di Supabase (si può rilanciare).
--
-- places.opening_spec = per ogni giorno della settimana (1 = lunedì … 7 = domenica) le fasce
-- di apertura e una nota libera: {"w": {"1": [{"from":"11:30","to":"15:00"}]}, "note": "…"}.
-- Il vecchio testo `opening_hours` resta come ripiego. Senza questa colonna l'app funziona come prima.
-- =============================================================================
alter table public.places add column if not exists opening_spec jsonb;
