-- 0057 · Pagamenti «visti» su tutti i dispositivi: l'avviso «Gaia ti ha dato 20 €» sparisce ovunque appena lo si segna
-- «Ho visto» (o si tocca «Controlla») da un telefono o dal web. Prima era salvato solo sul dispositivo.
-- settlement_seen: una riga per persona, viaggio e pagamento visto. `ref` è l'id del pagamento o, per una «Bilancia» che
--   registra più righe insieme, l'id del gruppo (settlements.group_id). Ognuno legge, scrive e toglie solo le sue righe,
--   e scrive solo nei viaggi a cui partecipa. Non dice niente di soldi: anche il visualizzatore può averle.
-- Additiva e rilanciabile; l'app funziona anche prima di eseguirla (i visti restano solo sul dispositivo, come prima).

create table if not exists public.settlement_seen (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id  uuid not null references public.trips (id) on delete cascade,
  ref      uuid not null,
  seen_at  timestamptz not null default now(),
  primary key (user_id, trip_id, ref)
);
create index if not exists settlement_seen_trip on public.settlement_seen (trip_id);

alter table public.settlement_seen enable row level security;
drop policy if exists settlement_seen_select on public.settlement_seen;
drop policy if exists settlement_seen_insert on public.settlement_seen;
drop policy if exists settlement_seen_delete on public.settlement_seen;
create policy settlement_seen_select on public.settlement_seen for select to authenticated
  using (user_id = (select auth.uid()));
create policy settlement_seen_insert on public.settlement_seen for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_trip_participant(trip_id));
create policy settlement_seen_delete on public.settlement_seen for delete to authenticated
  using (user_id = (select auth.uid()));
grant select, insert, delete on public.settlement_seen to authenticated;

-- tempo reale: segnato sul telefono, sparisce anche dal web aperto. Con l'occasione anche i budget a persona (0055), che
-- erano rimasti fuori: cambiato il budget da un dispositivo, si aggiorna sugli altri aperti.
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array['settlement_seen', 'traveler_budgets'] loop
    if to_regclass('public.' || t) is not null and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
