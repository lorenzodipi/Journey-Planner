-- Icona scelta per una categoria (luoghi/tappe e spese). Nullable: senza, l'app la deduce dal nome come prima.
alter table public.categories add column if not exists icon text;
alter table public.expense_categories add column if not exists icon text;
