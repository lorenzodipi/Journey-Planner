-- #57 Alloggi: ospiti, contatti e partecipanti (solo informativi). Additiva: «prenotato» non si usa più, `paid` resta.
alter table public.stays
  add column if not exists guests       int check (guests is null or guests between 1 and 99),
  add column if not exists phone        text,
  add column if not exists email        text,
  add column if not exists participants uuid[] not null default '{}';
