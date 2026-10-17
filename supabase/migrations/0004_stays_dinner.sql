-- Alloggi: oltre alla colazione, anche la cena (es. mezza pensione).
alter table public.stays add column if not exists dinner boolean not null default false;
