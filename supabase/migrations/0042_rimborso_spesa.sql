-- 0042 · Rimborso legato alla spesa da cui è dichiarato («Ho pagato» su una card di Da dare).
-- Senza questo legame un rimborso copriva le spese dalla più vecchia, e la card su cui si era premuto
-- poteva restare «da pagare» anche dopo la conferma. Additiva e rilanciabile; senza, l'app funziona come prima.
alter table public.settlements add column if not exists expense_id uuid references public.expenses (id) on delete set null;
