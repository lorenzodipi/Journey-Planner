-- Un pagamento legato a una spesa cancellata (deleted_at) non conta più nei saldi di tutti: prima chi aveva pagato
-- risultava in credito anche dopo aver tolto la spesa. In una «Bilancia» (group_id) le compensazioni vanno a coppie:
-- se una spesa compensata è cancellata, non vale nessuna compensazione del gruppo. Niente viene cancellato:
-- se la spesa torna, tornano anche i suoi pagamenti. Stessa regola dell'app (`rimborsiValidi`). Rilanciabile.
create or replace function public.my_confirmed_settlements()
returns table (id uuid, trip_id uuid, from_traveler uuid, to_traveler uuid, amount numeric, currency text)
language sql stable security definer
set search_path = ''
as $$
  with conf as (
    select s.*, (s.expense_id is not null and (e.id is null or e.deleted_at is not null)) as morto
    from public.settlements s
    left join public.expenses e on e.id = s.expense_id
    where s.status = 'confermato' and public.is_trip_member(s.trip_id)
  ), rotti as (
    select distinct group_id from conf where compensation and group_id is not null and morto
  )
  select c.id, c.trip_id, c.from_traveler, c.to_traveler, c.amount, c.currency
  from conf c
  where not c.morto and not (c.compensation and c.group_id in (select group_id from rotti))
$$;
grant execute on function public.my_confirmed_settlements() to authenticated;
