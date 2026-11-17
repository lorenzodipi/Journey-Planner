-- 0051 · Carta d'imbarco per persona (card dei voli aperta).
-- flight_legs.gate_close: ora locale della chiusura del gate («HH:MM»), accanto all'imbarco della 0021.
-- ticket_codes.leg: tratta del volo a cui vale il codice (1 = prima tratta). null = vale per tutte le tratte,
-- come i codici salvati prima di questa migrazione. Si usa il numero d'ordine (seq) e non l'id della tratta,
-- perché modificando un volo le tratte si riscrivono e cambiano id.
-- Additiva e rilanciabile; l'app funziona anche prima di eseguirla (un codice vale per tutte le tratte e la chiusura non si salva).

alter table public.flight_legs add column if not exists gate_close text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'flight_legs_gate_close_check') then
    alter table public.flight_legs add constraint flight_legs_gate_close_check
      check (gate_close is null or gate_close ~ '^[0-2][0-9]:[0-5][0-9]$');
  end if;
end $$;

alter table public.ticket_codes add column if not exists leg smallint;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ticket_codes_leg_check') then
    alter table public.ticket_codes add constraint ticket_codes_leg_check check (leg is null or leg >= 1);
  end if;
end $$;

