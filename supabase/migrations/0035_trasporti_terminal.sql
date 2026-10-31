-- #58 Trasporti: terminal (es. di partenza di un bus o di un traghetto). Additiva.
alter table public.transports add column if not exists terminal text;
