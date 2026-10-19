-- 0009 · Trasporti: la data si salva anche senza l'ora.
-- Prima `depart_at` e `arrive_at` (istanti) si riempivano solo con data E ora: scrivendo la data e lasciando
-- l'ora vuota la data andava persa (e nel modulo di modifica non compariva). Ora, quando l'ora manca,
-- la data resta qui, in due colonne a parte; quando c'è l'ora vale l'istante come prima.
-- Da eseguire dopo la 0008, una volta sola, nel SQL Editor di Supabase.

alter table public.transports
  add column if not exists depart_date date,
  add column if not exists arrive_date date;

-- I trasporti già salvati senza orario ma legati a un giorno recuperano la data da quel giorno.
update public.transports t
   set depart_date = d.date
  from public.days d
 where t.day_id = d.id
   and t.depart_at is null
   and t.depart_date is null;
