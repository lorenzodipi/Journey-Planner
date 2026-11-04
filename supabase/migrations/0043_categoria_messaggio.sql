-- 0043 · Messaggio più chiaro quando una categoria di spesa non si può eliminare: distingue spese e costi previsti
-- (voci di budget). Prima diceva «Usata da 1 spesa» anche quando a usarla era solo un costo previsto. Rilanciabile.
create or replace function public.check_expense_category_delete()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  ns integer;
  nb integer;
begin
  if new.deleted_at is not null and old.deleted_at is null then
    select count(*) into ns from public.expenses e where e.category_id = new.id and e.deleted_at is null;
    select count(*) into nb from public.budget_items b where b.category_id = new.id and b.deleted_at is null;
    if ns > 0 then
      raise exception 'Usata da % %: spostale prima o archiviala', ns, case when ns = 1 then 'spesa' else 'spese' end using errcode = 'P0001';
    end if;
    if nb > 0 then
      raise exception 'Ha % %: spostali in un''altra categoria prima di eliminarla', nb, case when nb = 1 then 'costo previsto' else 'costi previsti' end using errcode = 'P0001';
    end if;
  end if;
  return new;
end
$$;
