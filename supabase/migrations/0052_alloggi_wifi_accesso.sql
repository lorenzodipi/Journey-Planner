-- 0052 · Alloggi: rete e password del Wi-Fi, codice d'accesso (porta, cassetta delle chiavi).
-- Sono dati privati come i costi: con i trigger della 0049/0050 finiscono solo in `trip_costs` (che leggono creatore e
-- partecipanti, non il visualizzatore) e nella riga dell'alloggio restano vuoti.
-- Additiva e rilanciabile; l'app funziona anche prima di eseguirla (i campi nuovi non si salvano).

alter table public.stays add column if not exists wifi_name text;
alter table public.stays add column if not exists wifi_password text;
alter table public.stays add column if not exists access_code text;

-- inserimento: le colonne dei costi di sempre più le nuove
drop trigger if exists costi_ins on public.stays;
create trigger costi_ins before insert on public.stays for each row
  execute function public.copia_costi('stay', 'total_cost', 'paid', 'paid_by', 'wifi_name', 'wifi_password', 'access_code');

-- modifica: un trigger per ogni colonna nuova (quelli dei costi restano)
drop trigger if exists costi_wifi_name on public.stays;
create trigger costi_wifi_name before update of wifi_name on public.stays for each row execute function public.copia_costi('stay', 'wifi_name');
drop trigger if exists costi_wifi_password on public.stays;
create trigger costi_wifi_password before update of wifi_password on public.stays for each row execute function public.copia_costi('stay', 'wifi_password');
drop trigger if exists costi_access_code on public.stays;
create trigger costi_access_code before update of access_code on public.stays for each row execute function public.copia_costi('stay', 'access_code');
