-- 0007 · Checklist: quanti pezzi hai già (es. 8 su 10 magliette).
-- Vuoto = nessun pezzo ancora. La voce risulta "fatta" quando i pezzi arrivano alla quantità.
-- Da eseguire dopo la 0006, una volta sola, nel SQL Editor di Supabase.

alter table public.checklist_items add column if not exists quantity_done integer
  check (quantity_done is null or quantity_done >= 0);

alter table public.checklist_items drop constraint if exists checklist_quantity_done_le_quantity;
alter table public.checklist_items add constraint checklist_quantity_done_le_quantity
  check (quantity_done is null or quantity is null or quantity_done <= quantity);
