-- Tempo reale anche per chi ha pagato (expense_payers) e per i rimborsi (settlements): quando un compagno
-- registra una spesa o dichiara un rimborso, la pagina Spese si aggiorna da sola, senza ricaricare.
-- Completa 0011_realtime. Sicuro da rilanciare: le tabelle già abilitate o non ancora esistenti vengono saltate.
-- I permessi non cambiano: ognuno riceve solo le modifiche dei viaggi di cui è membro (Row Level Security).

do $$
declare
  t text;
begin
  foreach t in array array['expense_payers', 'settlements']
  loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
