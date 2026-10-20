-- Aggiornamenti in tempo reale: quando un'altra persona (es. un compagno di viaggio) modifica qualcosa,
-- l'app la vede subito, senza dover riaprire l'app. Si eseguono UNA VOLTA nell'SQL Editor di Supabase.
-- Sicuro da rilanciare: le tabelle già abilitate o non ancora esistenti vengono saltate.
-- I permessi non cambiano: ognuno riceve solo le modifiche dei viaggi di cui è membro (Row Level Security).

do $$
declare
  t text;
begin
  foreach t in array array[
    'trips', 'days', 'trip_travelers', 'places', 'categories', 'expense_categories', 'day_items',
    'stays', 'transports', 'flights', 'flight_legs', 'budget_items', 'budget_item_shares',
    'expenses', 'expense_shares', 'checklist_items', 'bookings'
  ]
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
