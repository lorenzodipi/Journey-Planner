-- 0044 · Checklist «Per chi»: una voce comune può riguardare solo alcune persone (Scegli). Vuoto = tutti. Rilanciabile.
alter table public.checklist_items add column if not exists for_travelers uuid[];
