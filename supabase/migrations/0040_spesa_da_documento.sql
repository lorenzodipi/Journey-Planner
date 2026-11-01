-- 0040 · Costo di un documento (es. assicurazione di viaggio)
-- Un documento può avere una spesa collegata (facoltativa): expenses.source_kind accetta anche 'document'.
-- Additiva: senza questa migrazione l'app funziona e il costo del documento non si può salvare.

alter table public.expenses drop constraint if exists expenses_source_kind_check;
alter table public.expenses add constraint expenses_source_kind_check
  check (source_kind is null or source_kind in ('day_item', 'stay', 'flight', 'transport', 'booking', 'document'));
