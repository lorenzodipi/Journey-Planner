-- 0059 · Alloggi, voli, trasporti e prenotazioni: versamenti e divisione del costo, come nella spesa.
--   split_mode    'percent' | 'fixed' (vuoto = parti uguali)
--   split_shares  [{"travelerId": …, "percent": n} | {"travelerId": …, "amount": n}]
--   payer_amounts [{"travelerId": …, "amount": n}]  (più paganti con la cifra di ciascuno; vuoto = parti uguali tra payer_ids)
-- Sono dati di soldi: per alloggi, voli e trasporti finiscono solo in `trip_costs` con i trigger della 0049/0050 (il
-- visualizzatore non li legge). Le prenotazioni le leggono già solo i partecipanti: lì restano nella riga.
-- Additiva e rilanciabile; senza questa migrazione l'app funziona come prima (le colonne si scrivono solo se servono).

do $$
declare
  _tab text;
begin
  foreach _tab in array array['stays', 'flights', 'transports', 'bookings'] loop
    execute format('alter table public.%I add column if not exists split_mode text', _tab);
    execute format('alter table public.%I add column if not exists split_shares jsonb', _tab);
    execute format('alter table public.%I add column if not exists payer_amounts jsonb', _tab);
    execute format('alter table public.%I drop constraint if exists %I', _tab, _tab || '_split_mode_check');
    execute format('alter table public.%I add constraint %I check (split_mode is null or split_mode in (''percent'', ''fixed''))', _tab, _tab || '_split_mode_check');
  end loop;
end $$;

-- inserimento: le colonne private di sempre più le nuove
drop trigger if exists costi_ins on public.stays;
create trigger costi_ins before insert on public.stays for each row
  execute function public.copia_costi('stay', 'total_cost', 'paid', 'paid_by', 'wifi_name', 'wifi_password', 'access_code', 'split_mode', 'split_shares', 'payer_amounts');
drop trigger if exists costi_ins on public.flights;
create trigger costi_ins before insert on public.flights for each row
  execute function public.copia_costi('flight', 'cost', 'paid', 'paid_by', 'payer_ids', 'split_mode', 'split_shares', 'payer_amounts');
drop trigger if exists costi_ins on public.transports;
create trigger costi_ins before insert on public.transports for each row
  execute function public.copia_costi('transport', 'cost', 'bought', 'paid_by', 'payer_ids', 'split_mode', 'split_shares', 'payer_amounts');

-- modifica: un trigger per ogni colonna nuova (quelli di prima restano)
do $$
declare
  _t record;
  _c text;
begin
  for _t in select * from (values ('stays', 'stay'), ('flights', 'flight'), ('transports', 'transport')) as v(tab, kind) loop
    foreach _c in array array['split_mode', 'split_shares', 'payer_amounts'] loop
      execute format('drop trigger if exists %I on public.%I', 'costi_' || _c, _t.tab);
      execute format('create trigger %I before update of %I on public.%I for each row execute function public.copia_costi(%L, %L)',
        'costi_' || _c, _c, _t.tab, _t.kind, _c);
    end loop;
  end loop;
end $$;
