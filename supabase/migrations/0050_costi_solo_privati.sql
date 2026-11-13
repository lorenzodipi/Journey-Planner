-- Visualizzatori e costi privati (fase 2 di 2), dopo la 0049 e quando tutti hanno l'app che legge `trip_costs`.
-- I costi di alloggi, voli, trasporti, tappe, luoghi e il limite di budget restano solo in `trip_costs` (letta da
-- creatore e partecipanti): le colonne di sempre si svuotano (i flag «pagato» tornano false) e da qui in poi i trigger
-- della 0049 le svuotano a ogni scrittura, dopo aver copiato i valori. Si accendono gli inviti come visualizzatore.
-- Prima di svuotare controlla che ogni valore sia già copiato uguale: se no si ferma e non cambia niente.
-- Rilanciabile. Copia di sicurezza delle tabelle: schema backup_20261113.

create or replace function public.costi_separati()
returns boolean
language sql stable
set search_path = ''
as $$ select true $$;
grant execute on function public.costi_separati() to authenticated;

do $$
declare
  _t record;
  _c text;
  _n int;
begin
  for _t in
    select * from (values
      ('stays', 'stay', array['total_cost', 'paid', 'paid_by']),
      ('flights', 'flight', array['cost', 'paid', 'paid_by', 'payer_ids']),
      ('transports', 'transport', array['cost', 'bought', 'paid_by', 'payer_ids']),
      ('day_items', 'day_item', array['cost']),
      ('places', 'place', array['est_cost']),
      ('trips', 'trip', array['budget_limit'])
    ) as v(tab, kind, cols)
  loop
    -- righe ancora senza copia (non dovrebbero esserci: i trigger copiano a ogni scrittura)
    execute format('insert into public.trip_costs (kind, ref_id, trip_id, data) select %L, r.id, %s, jsonb_build_object(%s) from public.%I r on conflict (kind, ref_id) do nothing',
      _t.kind, case when _t.kind = 'trip' then 'r.id' else 'r.trip_id' end,
      (select string_agg(format('%L, r.%I', c, c), ', ') from unnest(_t.cols) c), _t.tab);
    -- ogni valore pieno deve essere uguale alla copia (un flag false può essere già svuotato: non si controlla)
    foreach _c in array _t.cols loop
      execute format('select count(*) from public.%I r join public.trip_costs c on c.kind = %L and c.ref_id = r.id where r.%I is not null and to_jsonb(r.%I) <> %L::jsonb and to_jsonb(r.%I) is distinct from c.data -> %L',
        _t.tab, _t.kind, _c, _c, 'false', _c, _c) into _n;
      if _n > 0 then
        raise exception 'Costi non allineati in %.%: % righe. Non ho svuotato niente.', _t.tab, _c, _n;
      end if;
    end loop;
    -- svuota senza far scattare i trigger (niente righe nel registro, niente copie vuote)
    execute format('alter table public.%I disable trigger user', _t.tab);
    execute format('update public.%I set %s', _t.tab,
      (select string_agg(format('%I = %s', c, case when c in ('paid', 'bought') then 'false' else 'null' end), ', ') from unnest(_t.cols) c));
    execute format('alter table public.%I enable trigger user', _t.tab);
  end loop;
end $$;
