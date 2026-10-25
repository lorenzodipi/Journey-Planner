-- =============================================================================
-- Faraway · 0016 · link nelle voci della checklist
-- Da eseguire UNA volta nell'SQL Editor di Supabase.
--
-- `checklist_items.url` = link facoltativo (es. la pagina di un prodotto da comprare).
-- Senza questa colonna l'app funziona come prima: le voci si salvano senza link.
-- =============================================================================
alter table public.checklist_items add column if not exists url text;
