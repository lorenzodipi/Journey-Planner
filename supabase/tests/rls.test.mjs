// Test della sicurezza (RLS) dello schema, su un Postgres locale in memoria (PGlite).
// Simula ruoli e funzioni di Supabase (auth.uid, storage.foldername). Esegui: npm run test:sql
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'

const db = new PGlite()
const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
const C = '33333333-3333-3333-3333-333333333333'

// --- stub di ciò che Supabase fornisce già ---
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
  grant usage on schema auth, storage to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  insert into auth.users values ('${A}','a@test.it'),('${B}','b@test.it'),('${C}','c@test.it');
`)

const runMigration = (file) => db.exec(fs.readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'))
for (const file of ['0001_init.sql', '0002_trip_fx.sql', '0003_service_role_import.sql', '0004_stays_dinner.sql', '0005_transport_coords.sql', '0006_traveler_accounts.sql', '0007_checklist_quantity_done.sql']) {
  await runMigration(file)
}

// dati "vecchi" (categorie a testo libero) presenti PRIMA della 0008: la migrazione deve recuperarli
const legacyTrip = (await db.query(`insert into trips (title, owner_id, timezone, theme) values ('Vecchio','${A}','Asia/Tokyo','japan') returning id`)).rows[0].id
await db.query(`insert into expenses (trip_id,label,category,amount,currency) values
  ($1,'Ramen','Cibo',10,'JPY'), ($1,'Sushi',' cibo ',20,'JPY'), ($1,'Treno','Trasporti',30,'JPY'), ($1,'Senza',null,5,'JPY')`, [legacyTrip])
await db.query(`insert into budget_items (trip_id,label,category,amount,currency) values ($1,'Cene','CIBO',100,'EUR')`, [legacyTrip])

await runMigration('0008_expense_categories.sql')
await runMigration('0012_trip_fx_rates.sql')
await runMigration('0012_trip_fx_rates.sql') // si può rilanciare
await runMigration('0013_trip_budget_limit.sql')
await runMigration('0013_trip_budget_limit.sql') // si può rilanciare
await runMigration('0014_trip_origin.sql')
await runMigration('0014_trip_origin.sql') // si può rilanciare
await runMigration('0015_visit_duration.sql')
await runMigration('0015_visit_duration.sql') // si può rilanciare
await runMigration('0016_checklist_url.sql')
// una tappa «fatta» prima della 0017 deve diventare «Fatta»
{
  const day = (await db.query(`insert into days (trip_id, date) values ($1, '2026-11-22') returning id`, [legacyTrip])).rows[0].id
  await db.query(`insert into day_items (trip_id, day_id, title, done) values ($1, $2, 'Vecchia fatta', true)`, [legacyTrip, day])
}
await runMigration('0017_tappe_stati.sql')
await runMigration('0017_tappe_stati.sql') // si può rilanciare
await runMigration('0018_luoghi_orari.sql')
await runMigration('0018_luoghi_orari.sql') // si può rilanciare
await runMigration('0019_spese_previsto_paganti.sql')
await runMigration('0019_spese_previsto_paganti.sql') // si può rilanciare
await runMigration('0020_trip_countries.sql')
await runMigration('0020_trip_countries.sql') // si può rilanciare
await runMigration('0021_voli_carta.sql')
await runMigration('0021_voli_carta.sql') // si può rilanciare
await runMigration('0022_trasporti_biglietto.sql')
await runMigration('0022_trasporti_biglietto.sql') // si può rilanciare
await runMigration('0023_ticket_codes.sql')
await runMigration('0023_ticket_codes.sql') // si può rilanciare
await runMigration('0024_alloggi_biglietto.sql')
await runMigration('0024_alloggi_biglietto.sql') // si può rilanciare
await runMigration('0025_prenotazioni_tipi.sql')
await runMigration('0025_prenotazioni_tipi.sql') // si può rilanciare
await runMigration('0026_checklist_personale.sql')
await runMigration('0026_checklist_personale.sql') // si può rilanciare
await runMigration('0027_inviti.sql')
await runMigration('0027_inviti.sql') // si può rilanciare
await runMigration('0028_spese_avanzate.sql')
await runMigration('0028_spese_avanzate.sql') // si può rilanciare
await runMigration('0029_rimborsi.sql')
await runMigration('0029_rimborsi.sql') // si può rilanciare
await runMigration('0030_documenti.sql')
await runMigration('0030_documenti.sql') // si può rilanciare
await runMigration('0031_prenotazioni_tappe.sql')
await runMigration('0031_prenotazioni_tappe.sql') // si può rilanciare
await runMigration('0032_orari_vincolati.sql')
await runMigration('0032_orari_vincolati.sql') // si può rilanciare
await runMigration('0033_margini_alloggio_giorno.sql')
await runMigration('0033_margini_alloggio_giorno.sql') // si può rilanciare
console.log('MIGRAZIONE OK')

const asUser = async (uid, role = 'authenticated') => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`)
}
let pass = 0, fail = 0
const check = (name, cond, extra = '') => { (cond ? pass++ : fail++); console.log(`${cond ? 'OK  ' : 'FAIL'} ${name} ${extra}`) }
const throws = async (name, fn) => { try { await fn(); check(name, false, '(nessun errore)') } catch (e) { check(name, true, `→ ${String(e.message).slice(0, 70)}`) } }

{
const st = (await db.query(`select status from day_items where title = 'Vecchia fatta'`)).rows[0]?.status
check('0017 porta le tappe fatte allo stato «done»', st === 'done', String(st))
const col = (await db.query(`select data_type from information_schema.columns where table_name = 'places' and column_name = 'opening_spec'`)).rows[0]?.data_type
check('0018 aggiunge gli orari strutturati ai luoghi', col === 'jsonb', String(col))
const cols19 = (await db.query(`select table_name, column_name from information_schema.columns where column_name in ('planned', 'paid_by', 'for_travelers') and table_name in ('expense_categories', 'stays', 'flights', 'transports', 'bookings')`)).rows.length
check('0019 aggiunge previsto per categoria e «pagato da / per chi»', cols19 === 9, String(cols19))
const cols21 = (await db.query(`select 1 from information_schema.columns where (table_name='flight_legs' and column_name in ('terminal','gate','boarding_time','seats_by')) or (table_name='flights' and column_name in ('baggage','policy','checkin_at'))`)).rows.length
const cols22 = (await db.query(`select 1 from information_schema.columns where table_name='transports' and column_name in ('title','stops','operator','platform','baggage','policy','checkin_at')`)).rows.length
check('0022 aggiunge nome, fermate, operatore, binario, bagaglio e politiche ai trasporti', cols22 === 7, String(cols22))
check('0021 aggiunge gate, terminal, imbarco, posti per persona e i dati del volo', cols21 === 7, String(cols21))
}
{
const legacyCats = (await db.query(`select label from expense_categories where trip_id=$1 order by label`, [legacyTrip])).rows.map((r) => r.label)
check('0008 recupera le categorie a testo libero (una per nome, senza badare alle maiuscole)', legacyCats.length === 2 && legacyCats.includes('Trasporti'), JSON.stringify(legacyCats))
check('0008 collega le spese esistenti alla categoria', (await db.query(
  `select count(distinct e.category_id)::int n from expenses e where e.trip_id=$1 and e.category_id is not null`, [legacyTrip])).rows[0].n === 2)
check('0008 lascia senza categoria le spese senza testo', (await db.query(`select category_id from expenses where label='Senza'`)).rows[0].category_id === null)
check('0008 collega le voci di budget', (await db.query(`select b.category_id = e.category_id as same from budget_items b, expenses e where b.label='Cene' and e.label='Ramen'`)).rows[0].same === true)

}

// A crea un viaggio
await asUser(A)
const t = (await db.query(`insert into trips (title, timezone, theme) values ('Giappone','Asia/Tokyo','japan') returning id`)).rows[0].id
const m = (await db.query(`select role from trip_members where trip_id=$1 and user_id=$2`, [t, A])).rows
check('owner aggiunto in automatico', m.length === 1 && m[0].role === 'owner')

const d1 = (await db.query(`insert into days (trip_id, date, city) values ($1,'2026-11-22','Tokyo') returning id`, [t])).rows[0].id
await db.query(`insert into day_items (trip_id, day_id, title) values ($1,$2,'Senso-ji')`, [t, d1])
const f = (await db.query(`insert into flights (trip_id, title) values ($1,'Andata') returning id`, [t])).rows[0].id
await db.query(`insert into flight_legs (trip_id, flight_id, seq, from_airport, to_airport, depart_at, arrive_at, from_tz, to_tz)
  values ($1,$2,1,'MXP','PEK','2026-11-21T12:30:00+01','2026-11-22T05:35:00+08','Europe/Rome','Asia/Shanghai')`, [t, f])
check('A scrive giorni, tappe, voli', true)

// B non è membro
await asUser(B)
check('B non vede il viaggio', (await db.query(`select 1 from trips`)).rows.length === 0)
check('B non vede i giorni', (await db.query(`select 1 from days`)).rows.length === 0)
await throws('B non può scrivere nel viaggio di A', () => db.query(`insert into days (trip_id, date) values ($1,'2026-11-23')`, [t]))
await throws('B non può aggiungersi come membro', () => db.query(`insert into trip_members (trip_id,user_id,role) values ($1,$2,'owner')`, [t, B]))
await throws('B non può usare add_member_by_email', () => db.query(`select add_member_by_email($1,'b@test.it','editor')`, [t]))

// A aggiunge B come editor
await asUser(A)
await db.query(`select add_member_by_email($1,'b@test.it','editor')`, [t])
await asUser(B)
check('B ora vede il viaggio', (await db.query(`select 1 from trips`)).rows.length === 1)
check('B ora vede le tappe', (await db.query(`select 1 from day_items`)).rows.length === 1)
await db.query(`insert into days (trip_id, date, city) values ($1,'2026-11-23','Tokyo')`, [t])
check('B (editor) può scrivere', true)
await throws('B (editor) non può eliminare il viaggio', async () => {
  const r = await db.query(`delete from trips where id=$1 returning id`, [t]); if (r.rows.length === 0) throw new Error('0 righe eliminate')
})

// C estraneo e anonimo
await asUser(C)
check('C non vede nulla', (await db.query(`select 1 from trips`)).rows.length === 0)
await asUser('', 'anon')
await throws('anon non legge i viaggi', () => db.query(`select 1 from trips`))
check('anon legge health (keep-alive)', (await db.query(`select ok from health`)).rows[0].ok === true)
await throws('anon non scrive health', () => db.query(`update health set ok=false`))
await throws('anon non chiama add_member_by_email', () => db.query(`select add_member_by_email($1,'c@test.it','viewer')`, [t]))

// coerenza tra viaggi (FK composite)
await asUser(A)
const t2 = (await db.query(`insert into trips (title) values ('Altro') returning id`)).rows[0].id
await throws('tappa non può puntare a un giorno di un altro viaggio', () =>
  db.query(`insert into day_items (trip_id, day_id, title) values ($1,$2,'x')`, [t2, d1]))

// viewer in sola lettura
await db.query(`select add_member_by_email($1,'c@test.it','viewer')`, [t])
await asUser(C)
check('viewer legge', (await db.query(`select 1 from days`)).rows.length >= 1)
await throws('viewer non scrive', () => db.query(`insert into days (trip_id, date) values ($1,'2026-12-01')`, [t]))

// vincoli
await asUser(A)
await throws('date viaggio incoerenti', () => db.query(`insert into trips (title,start_date,end_date) values ('x','2026-12-01','2026-11-01')`))
await throws('arrivo prima della partenza', () => db.query(
  `insert into flight_legs (trip_id, flight_id, seq, from_airport, to_airport, depart_at, arrive_at, from_tz, to_tz)
   values ($1,$2,2,'PEK','HND','2026-11-22T11:45:00+08','2026-11-22T10:00:00+09','Asia/Shanghai','Asia/Tokyo')`, [t, f]))

// updated_at
await db.exec(`reset role`)
const before = (await db.query(`select updated_at from days where id=$1`, [d1])).rows[0].updated_at
await new Promise(r => setTimeout(r, 15))
await asUser(A)
await db.query(`update days set title='Arrivo' where id=$1`, [d1])
await db.exec(`reset role`)
const after = (await db.query(`select updated_at from days where id=$1`, [d1])).rows[0].updated_at
check('updated_at aggiornato dal trigger', after > before)

// --- Sprint 1: le stesse operazioni che esegue l'app (creazione viaggio, viaggiatori, giorni) ---
await asUser(A)
const s1 = (await db.query(
  `insert into trips (title,destination,start_date,end_date,timezone,theme,base_currency,local_currency,center_lat,center_lng)
   values ('Giappone 2026','Giappone','2026-11-21','2026-12-09','Asia/Tokyo','japan','EUR','JPY',35.68,139.76) returning id`)).rows[0].id
await db.query(`insert into trip_travelers (trip_id,name,color,position,user_id) values ($1,'Anna','#c8402f',1000,$2)`, [s1, A])
await db.query(`select add_traveler_by_email($1,'b@test.it','Luca','#264653')`, [s1])
await db.query(`insert into days (trip_id,date) select $1, d::date from generate_series('2026-11-21'::date,'2026-12-09'::date,'1 day') d`, [s1])
check('giorni generati dalle date (19)', (await db.query(`select 1 from days where trip_id=$1`, [s1])).rows.length === 19)
await throws('stessa data due volte nello stesso viaggio', () => db.query(`insert into days (trip_id,date) values ($1,'2026-11-21')`, [s1]))

// restringere le date: i giorni si nascondono, non si cancellano; poi tornano
const dTail = (await db.query(`select id from days where trip_id=$1 and date='2026-12-09'`, [s1])).rows[0].id
await db.query(`update days set title='Ritorno', deleted_at=now() where id=$1`, [dTail])
await db.query(`update days set deleted_at=null where id=$1`, [dTail])
check('giorno nascosto e ripristinato conserva i dati',
  (await db.query(`select title from days where id=$1`, [dTail])).rows[0].title === 'Ritorno')

// viaggiatore rimosso = soft delete
const luca = (await db.query(`select id from trip_travelers where trip_id=$1 and name='Luca'`, [s1])).rows[0].id
await db.query(`update trip_travelers set deleted_at=now() where id=$1`, [luca])
check('viaggiatore rimosso resta in tabella ma con deleted_at',
  (await db.query(`select 1 from trip_travelers where id=$1 and deleted_at is not null`, [luca])).rows.length === 1)

// un viewer non può modificare giorni né viaggiatori (nessun errore, ma 0 righe toccate)
await db.query(`select add_member_by_email($1,'c@test.it','viewer')`, [s1])
await asUser(C)
check('viewer non modifica i giorni', (await db.query(`update days set city='x' where trip_id=$1 returning id`, [s1])).rows.length === 0)
check('viewer non modifica i viaggiatori', (await db.query(`update trip_travelers set name='x' where trip_id=$1 returning id`, [s1])).rows.length === 0)
check('viewer non elimina (soft) il viaggio', (await db.query(`update trips set deleted_at=now() where id=$1 returning id`, [s1])).rows.length === 0)

// l'owner elimina il viaggio (soft delete) e lo può ancora leggere
await asUser(A)
check('owner elimina il viaggio (soft delete)', (await db.query(`update trips set deleted_at=now() where id=$1 returning id`, [s1])).rows.length === 1)

// --- Sprint 2: categorie, luoghi, tappe (le operazioni dell'app) ---
await asUser(A)
const s2 = (await db.query(`insert into trips (title) values ('Test S2') returning id`)).rows[0].id
const other = (await db.query(`insert into trips (title) values ('Altro viaggio') returning id`)).rows[0].id
const cat = (await db.query(`insert into categories (trip_id,label,position) values ($1,'Tempio',1000) returning id`, [s2])).rows[0].id
await throws('categoria duplicata nello stesso viaggio (trovata per nome)', () =>
  db.query(`insert into categories (trip_id,label,position) values ($1,'Tempio',2000)`, [s2]))
const catOther = (await db.query(`insert into categories (trip_id,label,position) values ($1,'Cibo',1000) returning id`, [other])).rows[0].id
await throws('luogo non può usare la categoria di un altro viaggio', () =>
  db.query(`insert into places (trip_id,name,category_id) values ($1,'x',$2)`, [s2, catOther]))
const pl = (await db.query(
  `insert into places (trip_id,category_id,name,name_local,city,lat,lng,status) values ($1,$2,'Senso-ji','浅草寺','Taito',35.7148,139.7967,'idea') returning id`, [s2, cat])).rows[0].id
await throws('coordinate fuori intervallo rifiutate', () => db.query(`insert into places (trip_id,name,lat,lng) values ($1,'x',95,10)`, [s2]))
check('luogo senza coordinate ammesso (si aggiusta dopo)', (await db.query(`insert into places (trip_id,name) values ($1,'Senza pin') returning id`, [s2])).rows.length === 1)

const dd = (await db.query(`insert into days (trip_id,date) values ($1,'2026-11-22') returning id`, [s2])).rows[0].id
const it = (await db.query(
  `insert into day_items (trip_id,day_id,place_id,kind,title,start_time,position) values ($1,$2,$3,'visit','Senso-ji','09:30',1000) returning id`, [s2, dd, pl])).rows[0].id
await db.query(`update day_items set position=1500 where id=$1`, [it])
check('tappa riordinata (position frazionaria)', (await db.query(`select position from day_items where id=$1`, [it])).rows[0].position === 1500)
await throws('il tempo di permanenza del luogo deve essere maggiore di zero', () => db.query(`update places set visit_minutes = 0 where id=$1`, [pl]))
await throws('la durata della tappa deve essere maggiore di zero', () => db.query(`update day_items set duration_minutes = -5 where id=$1`, [it]))
await db.query(`update places set visit_minutes = 90 where id=$1`, [pl])
await db.query(`update day_items set duration_minutes = 30 where id=$1`, [it])
check('permanenza del luogo e durata della tappa si salvano', (await db.query(`select p.visit_minutes v, i.duration_minutes d from places p, day_items i where p.id=$1 and i.id=$2`, [pl, it])).rows[0].v === 90)
await db.query(`update day_items set duration_minutes = null where id=$1`, [it])
check('la durata della tappa si toglie (torna a seguire il luogo)', (await db.query(`select duration_minutes d from day_items where id=$1`, [it])).rows[0].d === null)
await db.query(`update day_items set deleted_at=now() where id=$1`, [it])
await db.query(`update day_items set deleted_at=null where id=$1`, [it])
check('tappa eliminata e ripristinata (annulla)', (await db.query(`select 1 from day_items where id=$1 and deleted_at is null`, [it])).rows.length === 1)
await throws('tappa non può puntare a un luogo di un altro viaggio', async () => {
  const foreign = (await db.query(`insert into places (trip_id,name) values ($1,'Estraneo') returning id`, [other])).rows[0].id
  await db.query(`insert into day_items (trip_id,day_id,place_id,title) values ($1,$2,$3,'x')`, [s2, dd, foreign])
})
await asUser(B)
check('B non vede luoghi e tappe del viaggio di A', (await db.query(`select 1 from places where trip_id=$1`, [s2])).rows.length === 0 &&
  (await db.query(`select 1 from day_items where trip_id=$1`, [s2])).rows.length === 0)
await throws('B non può creare luoghi nel viaggio di A', () => db.query(`insert into places (trip_id,name) values ($1,'x')`, [s2]))
await asUser(A)

// ---- soldi: tasso di cambio, budget e spese ----
await throws('tasso di cambio zero o negativo rifiutato', () => db.query(`update trips set fx_rate = 0 where id=$1`, [s2]))
await db.query(`update trips set fx_rate = 0.00562 where id=$1`, [s2])
check('A imposta il tasso di cambio del viaggio', Number((await db.query(`select fx_rate from trips where id=$1`, [s2])).rows[0].fx_rate) === 0.00562)
await throws('i cambi delle valute extra devono essere un oggetto', () => db.query(`update trips set fx_rates = '[1,2]' where id=$1`, [s2]))
await db.query(`update trips set fx_rates = '{"KRW":0.00065,"THB":0.026}' where id=$1`, [s2])
check('A imposta i cambi delle valute extra', Number((await db.query(`select fx_rates->>'KRW' as k from trips where id=$1`, [s2])).rows[0].k) === 0.00065)
await throws('il budget massimo deve essere maggiore di zero', () => db.query(`update trips set budget_limit = 0 where id=$1`, [s2]))
await db.query(`update trips set budget_limit = 3000 where id=$1`, [s2])
check('A imposta il budget massimo', Number((await db.query(`select budget_limit from trips where id=$1`, [s2])).rows[0].budget_limit) === 3000)
await db.query(`update trips set budget_limit = null where id=$1`, [s2])
check('il budget massimo si può togliere', (await db.query(`select budget_limit from trips where id=$1`, [s2])).rows[0].budget_limit === null)
await throws('il paese di origine è un codice di due lettere maiuscole', () => db.query(`update trips set origin_country = 'italia' where id=$1`, [s2]))
await db.query(`update trips set origin_country = 'IT', origin_timezone = 'Europe/Rome' where id=$1`, [s2])
check('A imposta il paese di origine', (await db.query(`select origin_country as c from trips where id=$1`, [s2])).rows[0].c === 'IT')
await db.query(`update trips set origin_country = null, origin_timezone = null where id=$1`, [s2])
const trv = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'Lorenzo',$2) returning id`, [s2, A])).rows[0].id
const trvOther = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'Estraneo',$2) returning id`, [other, A])).rows[0].id
const bi = (await db.query(`insert into budget_items (trip_id,label,amount,currency,scope) values ($1,'Treno',30,'EUR','per_person') returning id`, [s2])).rows[0].id
await db.query(`insert into budget_item_shares (trip_id,budget_item_id,traveler_id,paid) values ($1,$2,$3,true)`, [s2, bi, trv])
await throws('quota budget: un viaggiatore ammesso una sola volta per voce', () =>
  db.query(`insert into budget_item_shares (trip_id,budget_item_id,traveler_id) values ($1,$2,$3)`, [s2, bi, trv]))
await throws('quota budget: non si assegna a un viaggiatore di un altro viaggio', () =>
  db.query(`insert into budget_item_shares (trip_id,budget_item_id,traveler_id) values ($1,$2,$3)`, [s2, bi, trvOther]))
const ex = (await db.query(`insert into expenses (trip_id,label,amount,currency,fx_rate,paid_by) values ($1,'Ramen',1200,'JPY',0.00562,$2) returning id`, [s2, trv])).rows[0].id
await db.query(`insert into expense_shares (trip_id,expense_id,traveler_id,weight) values ($1,$2,$3,1)`, [s2, ex, trv])
await throws('spesa: chi ha pagato deve essere di questo viaggio', () =>
  db.query(`insert into expenses (trip_id,label,amount,currency,paid_by) values ($1,'x',1,'EUR',$2)`, [s2, trvOther]))
await db.query(`delete from budget_item_shares where budget_item_id=$1`, [bi])
check('quote budget eliminabili (sincronizzazione del modulo)', (await db.query(`select 1 from budget_item_shares where budget_item_id=$1`, [bi])).rows.length === 0)
await asUser(B)
await throws('B non può cambiare il tasso del viaggio di A', async () => {
  const r = await db.query(`update trips set fx_rate = 1 where id=$1 returning id`, [s2])
  if (r.rows.length === 0) throw new Error('0 righe aggiornate (RLS)')
})
check('B non vede budget né spese del viaggio di A', (await db.query(`select 1 from budget_items where trip_id=$1`, [s2])).rows.length === 0 &&
  (await db.query(`select 1 from expenses where trip_id=$1`, [s2])).rows.length === 0)
await asUser(A)

// trasporti: posizione di partenza/arrivo (migrazione 0005)
await asUser(A)
await db.query(`insert into transports (trip_id, from_label, to_label, from_lat, from_lng, to_lat, to_lng) values ($1,'Tokyo','Kyoto',35.68,139.76,34.98,135.75)`, [t])
check('trasporto con le due posizioni', true)
await db.query(`insert into transports (trip_id, from_label, to_label) values ($1,'Tokyo','Nikko')`, [t])
check('trasporto senza posizioni', true)
await throws('posizione a metà (solo latitudine) rifiutata', () => db.query(`insert into transports (trip_id, from_label, to_label, from_lat) values ($1,'a','b',35)`, [t]))
await throws('latitudine fuori intervallo rifiutata', () => db.query(`insert into transports (trip_id, from_label, to_label, to_lat, to_lng) values ($1,'a','b',95,10)`, [t]))
await db.query(`insert into stays (trip_id, name, check_in, check_out, dinner) values ($1,'Ryokan','2026-11-24','2026-11-25',true)`, [t])
check('alloggio con cena', (await db.query(`select dinner from stays where name='Ryokan'`)).rows[0].dinner === true)

// --- 0006: i viaggiatori sono account reali ---
await asUser(A)
const s6 = (await db.query(`insert into trips (title) values ('Test S6') returning id`)).rows[0].id
await throws('viaggiatore senza account rifiutato', () => db.query(`insert into trip_travelers (trip_id,name) values ($1,'Inventato')`, [s6]))
await throws('viaggiatore con account non membro rifiutato', () => db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'B',$2)`, [s6, B]))
await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'Io',$2)`, [s6, A])
check('owner si aggiunge come viaggiatore col proprio account', true)
await throws('stesso account due volte nello stesso viaggio', () => db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'Io bis',$2)`, [s6, A]))
await throws('email inesistente rifiutata', () => db.query(`select add_traveler_by_email($1,'nessuno@test.it','X')`, [s6]))
const bId = (await db.query(`select add_traveler_by_email($1,'B@Test.it','Beppe')`, [s6])).rows[0].add_traveler_by_email
const bRow = (await db.query(`select user_id, name, position from trip_travelers where id=$1`, [bId])).rows[0]
check('add_traveler_by_email collega l\'account (email senza distinzione maiuscole)', bRow.user_id === B && bRow.name === 'Beppe')
check('B diventa membro (editor) del viaggio', (await db.query(`select role from trip_members where trip_id=$1 and user_id=$2`, [s6, B])).rows[0]?.role === 'editor')
await throws('stessa persona due volte via email', () => db.query(`select add_traveler_by_email($1,'b@test.it')`, [s6]))
await db.query(`update trip_travelers set deleted_at=now() where id=$1`, [bId])
const bAgain = (await db.query(`select add_traveler_by_email($1,'b@test.it','Beppe')`, [s6])).rows[0].add_traveler_by_email
check('persona tolta e riaggiunta: stesso viaggiatore ripreso (spese collegate)', bAgain === bId)
await throws('non si scollega un account', () => db.query(`update trip_travelers set user_id=null where id=$1`, [bId]))
await throws('non si collega un account non membro con update', () => db.query(`update trip_travelers set user_id=$2 where id=$1`, [bId, C]))
await db.query(`update trip_travelers set name='Beppe!' where id=$1`, [bId])
check('rinominare un viaggiatore resta possibile', true)
await asUser(B)
await throws('B (editor) non può aggiungere persone', () => db.query(`select add_traveler_by_email($1,'c@test.it')`, [s6]))
await throws('B (editor) non può collegare account', () => db.query(`select link_traveler_to_email($1,'c@test.it')`, [bId]))
await asUser(C)
await throws('C estraneo non vede chi c\'è nel viaggio', () => db.query(`select * from trip_people($1)`, [s6]))
await asUser(B)
const ppl = (await db.query(`select email, role from trip_people($1) order by email`, [s6])).rows
check('un membro vede email e ruoli di chi c\'è', ppl.length === 2 && ppl[0].email === 'a@test.it' && ppl[0].role === 'owner')
await asUser('', 'anon')
await throws('anon non chiama trip_people', () => db.query(`select * from trip_people($1)`, [s6]))
await throws('anon non chiama add_traveler_by_email', () => db.query(`select add_traveler_by_email($1,'c@test.it')`, [s6]))

// viaggiatori senza account (creati prima della 0006 o da un ripristino): si collegano dopo
await asUser(A)
const s6b = (await db.query(`insert into trips (title) values ('Test restore') returning id`)).rows[0].id
const ph1 = '99999999-9999-9999-9999-999999999991'
await db.query(`select restore_travelers($1, $2::jsonb)`, [s6b, JSON.stringify([{ id: ph1, name: 'Gaia', color: '#264653', position: 2000 }])])
check('restore_travelers crea segnaposto senza account', (await db.query(`select user_id from trip_travelers where id=$1`, [ph1])).rows[0].user_id === null)
await throws('restore_travelers solo su viaggio senza viaggiatori', () => db.query(`select restore_travelers($1,'[]'::jsonb)`, [s6]))
await db.query(`update trip_travelers set name='Gaia D.' where id=$1`, [ph1])
check('un segnaposto si può rinominare senza account', true)
await throws('collegamento a email inesistente rifiutato', () => db.query(`select link_traveler_to_email($1,'nessuno@test.it')`, [ph1]))
await db.query(`select link_traveler_to_email($1,'c@test.it')`, [ph1])
check('link_traveler_to_email collega e rende membro', (await db.query(`select user_id from trip_travelers where id=$1`, [ph1])).rows[0].user_id === C &&
  (await db.query(`select 1 from trip_members where trip_id=$1 and user_id=$2`, [s6b, C])).rows.length === 1)
await throws('un account non si collega a due viaggiatori', async () => {
  const ph2 = (await db.query(`select add_traveler_by_email($1,'b@test.it')`, [s6b])).rows[0].add_traveler_by_email
  await db.query(`select link_traveler_to_email($1,'c@test.it')`, [ph2])
})
await asUser(A)

// checklist: quantità (0006)
await db.query(`insert into checklist_items (trip_id,text,kind,quantity) values ($1,'Magliette','packing',3)`, [t])
check('voce checklist con quantità', true)
await db.query(`insert into checklist_items (trip_id,text,kind) values ($1,'Passaporto','docs')`, [t])
check('voce checklist senza quantità (= 1)', (await db.query(`select quantity from checklist_items where text='Passaporto'`)).rows[0].quantity === null)
await db.query(`update checklist_items set quantity_done = 2 where text='Magliette'`)
check('pezzi già presi (2 su 3)', (await db.query(`select quantity_done from checklist_items where text='Magliette'`)).rows[0].quantity_done === 2)
await throws('più pezzi della quantità rifiutati', () => db.query(`update checklist_items set quantity_done = 4 where text='Magliette'`))
await throws('pezzi negativi rifiutati', () => db.query(`update checklist_items set quantity_done = -1 where text='Magliette'`))
await throws('quantità zero rifiutata', () => db.query(`insert into checklist_items (trip_id,text,quantity) values ($1,'x',0)`, [t]))
await throws('quantità enorme rifiutata', () => db.query(`insert into checklist_items (trip_id,text,quantity) values ($1,'x',1000)`, [t]))

// categorie di spesa (0008)
const ec = (await db.query(`insert into expense_categories (trip_id,label,position) values ($1,'Cibo',1000) returning id`, [t])).rows[0].id
await throws('nome categoria di spesa doppio (anche con maiuscole) rifiutato', () => db.query(`insert into expense_categories (trip_id,label) values ($1,' cibo')`, [t]))
await throws('nome categoria di spesa vuoto rifiutato', () => db.query(`insert into expense_categories (trip_id,label) values ($1,'  ')`, [t]))
await db.query(`insert into expenses (trip_id,label,amount,currency,category_id) values ($1,'Ramen di prova',30,'EUR',$2)`, [t, ec])
check('spesa collegata alla sua categoria', (await db.query(`select 1 from expenses e join expense_categories c on c.id=e.category_id where e.label='Ramen di prova'`)).rows.length === 1)
await db.query(`update expense_categories set label='Mangiare' where id=$1`, [ec])
check('rinominare la categoria cambia il nome per tutte le sue spese', (await db.query(`select c.label from expenses e join expense_categories c on c.id=e.category_id where e.label='Ramen di prova'`)).rows[0].label === 'Mangiare')
await db.query(`update expenses set category_id=null where category_id=$1`, [ec]) // dalla 0028 una categoria usata non si elimina
await db.query(`update expense_categories set deleted_at=now() where id=$1`, [ec])
await db.query(`insert into expense_categories (trip_id,label) values ($1,'Mangiare')`, [t])
check('dopo l\'eliminazione si può ricreare lo stesso nome', true)
await db.query(`insert into budget_items (trip_id,label,amount,currency,category_id) values ($1,'Cene',100,'EUR',$2)`, [t, ec])
check('voce di budget collegata a una categoria', true)
// un viaggio non può usare le categorie di un altro (chiave composta)
await asUser(C)
await throws('categorie di spesa: un non membro non le crea', () => db.query(`insert into expense_categories (trip_id,label) values ($1,'Intruso')`, [legacyTrip]))
check('categorie di spesa: C non vede quelle di un viaggio non suo', (await db.query(`select 1 from expense_categories where trip_id=$1`, [legacyTrip])).rows.length === 0)
await asUser(A)
const t8 = (await db.query(`insert into trips (title) values ('Altro viaggio') returning id`)).rows[0].id
await throws('una spesa non può usare la categoria di un altro viaggio', () => db.query(`insert into expenses (trip_id,label,amount,currency,category_id) values ($1,'X',1,'EUR',$2)`, [t8, ec]))

// paesi del viaggio (0020): RLS come le altre tabelle e viaggi esistenti con un paese solo
await asUser(A)
{
  const own = (await db.query(`insert into trip_countries (trip_id,name,currency,timezone,start_date,end_date) values ($1,'Giappone','JPY','Asia/Tokyo','2026-11-22','2026-12-09') returning id`, [t8])).rows[0].id
  check('0020 il proprietario crea un paese del viaggio', !!own)
  await throws('paese con fine prima dell\'inizio rifiutato', () => db.query(`insert into trip_countries (trip_id,name,timezone,start_date,end_date) values ($1,'X','UTC','2026-12-09','2026-12-01')`, [t8]))
  await asUser(C)
  check('0020 un non membro non vede i paesi', (await db.query(`select 1 from trip_countries where trip_id=$1`, [t8])).rows.length === 0)
  await throws('0020 un non membro non crea paesi', () => db.query(`insert into trip_countries (trip_id,name,timezone,start_date,end_date) values ($1,'Intruso','UTC','2026-12-01','2026-12-02')`, [t8]))
  await asUser(A)
}

// codici dei biglietti (0023): RLS come le altre tabelle
await asUser(A)
{
  const ok = (await db.query(`insert into ticket_codes (trip_id,kind,ref_id,file_path) values ($1,'transport',gen_random_uuid(),$2) returning id`, [t8, `${t8}/qr.png`])).rows[0].id
  check('0023 il proprietario salva un codice', !!ok)
  await throws('0023 tipo di voce sconosciuto rifiutato', () => db.query(`insert into ticket_codes (trip_id,kind,ref_id,file_path) values ($1,'altro',gen_random_uuid(),'x')`, [t8]))
  await asUser(C)
  check('0023 un non membro non vede i codici', (await db.query(`select 1 from ticket_codes where trip_id=$1`, [t8])).rows.length === 0)
  await throws('0023 un non membro non salva codici', () => db.query(`insert into ticket_codes (trip_id,kind,ref_id,file_path) values ($1,'flight',gen_random_uuid(),'x')`, [t8]))
  await asUser(A)
}

// checklist personale (0026): liste private, spunte personali, nessuna spunta per conto di altri
await asUser(null, 'postgres')
{
  const tc = (await db.query(`insert into trips (title, owner_id) values ('Checklist', $1) returning id`, [A])).rows[0].id
  await db.query(`insert into trip_members (trip_id,user_id,role) values ($1,$2,'editor') on conflict do nothing`, [tc, B])
  const ta = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'Anna',$2) returning id`, [tc, A])).rows[0].id
  const tb = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'Bruno',$2) returning id`, [tc, B])).rows[0].id
  const common = (await db.query(`insert into checklist_items (trip_id,text) values ($1,'Passaporti') returning id`, [tc])).rows[0].id
  await asUser(A)
  const priv = (await db.query(`insert into checklist_items (trip_id,text,owner_id) values ($1,'Segreto di Anna',$2) returning id`, [tc, A])).rows[0].id
  check('0026 A vede la sua voce privata', (await db.query(`select 1 from checklist_items where id=$1`, [priv])).rows.length === 1)
  await db.query(`insert into checklist_checks (item_id,trip_id,traveler_id,done) values ($1,$2,$3,true)`, [priv, tc, ta])
  await asUser(B)
  check('0026 B non vede la voce privata di A', (await db.query(`select 1 from checklist_items where id=$1`, [priv])).rows.length === 0)
  check('0026 B non vede le spunte della voce privata di A', (await db.query(`select 1 from checklist_checks where item_id=$1`, [priv])).rows.length === 0)
  check('0026 B vede la voce comune', (await db.query(`select 1 from checklist_items where id=$1`, [common])).rows.length === 1)
  await throws('0026 B non crea voci private a nome di A', () => db.query(`insert into checklist_items (trip_id,text,owner_id) values ($1,'Falsa',$2)`, [tc, A]))
  await db.query(`insert into checklist_checks (item_id,trip_id,traveler_id,done) values ($1,$2,$3,true)`, [common, tc, tb])
  check('0026 B spunta la voce comune per sé', (await db.query(`select 1 from checklist_checks where item_id=$1 and traveler_id=$2`, [common, tb])).rows.length === 1)
  await throws('0026 B non spunta per conto di A', () => db.query(`insert into checklist_checks (item_id,trip_id,traveler_id,done) values ($1,$2,$3,true)`, [common, tc, ta]))
  await asUser(A)
  check('0026 A vede la spunta di B sulla voce comune', (await db.query(`select 1 from checklist_checks where item_id=$1 and traveler_id=$2`, [common, tb])).rows.length === 1)
  await asUser(C)
  check('0026 un non membro non vede voci né spunte', (await db.query(`select 1 from checklist_items where trip_id=$1`, [tc])).rows.length === 0 && (await db.query(`select 1 from checklist_checks where trip_id=$1`, [tc])).rows.length === 0)
  await asUser(A)
}

// spese avanzate (0028): modifica solo di chi ha creato o pagato, più paganti, ricevute, categorie protette
await asUser(null, 'postgres')
{
  const ts = (await db.query(`insert into trips (title, owner_id) values ('Spese', $1) returning id`, [A])).rows[0].id
  await db.query(`insert into trip_members (trip_id,user_id,role) values ($1,$2,'editor') on conflict do nothing`, [ts, B])
  const ta = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'A',$2) returning id`, [ts, A])).rows[0].id
  const tb = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'B',$2) returning id`, [ts, B])).rows[0].id
  await asUser(A)
  const e1 = (await db.query(`insert into expenses (trip_id,label,amount,currency,paid_by,spent_at) values ($1,'Cena',100,'EUR',$2,now()) returning id, created_by`, [ts, ta])).rows[0]
  check('0028 la spesa registra chi l\'ha creata', e1.created_by === A)
  await db.query(`insert into expense_shares (trip_id,expense_id,traveler_id,weight,percent) values ($1,$2,$3,1,60),($1,$2,$4,1,40)`, [ts, e1.id, ta, tb])
  await db.query(`update expenses set split_mode='percent' where id=$1`, [e1.id])
  await throws('0028 modalità di divisione sconosciuta rifiutata', () => db.query(`update expenses set split_mode='boh' where id=$1`, [e1.id]))
  await throws('0028 percentuale oltre 100 rifiutata', () => db.query(`update expense_shares set percent=120 where expense_id=$1 and traveler_id=$2`, [e1.id, ta]))
  await asUser(B)
  check('0028 B vede la spesa di A', (await db.query(`select 1 from expenses where id=$1`, [e1.id])).rows.length === 1)
  await db.query(`update expenses set label='Cena sushi' where id=$1`, [e1.id])
  check('0028 B (non creatore né pagante) non modifica', (await db.query(`select label from expenses where id=$1`, [e1.id])).rows[0].label === 'Cena')
  await db.query(`delete from expenses where id=$1`, [e1.id])
  check('0028 B non elimina la spesa di A', (await db.query(`select 1 from expenses where id=$1`, [e1.id])).rows.length === 1)
  await throws('0028 B non cambia le quote di A', () => db.query(`insert into expense_shares (trip_id,expense_id,traveler_id,weight) values ($1,$2,$3,1)`, [ts, e1.id, tb]))
  // B diventa pagante (secondo pagante): ora può modificare
  await asUser(A)
  await db.query(`insert into expense_payers (trip_id,expense_id,traveler_id,amount) values ($1,$2,$3,60),($1,$2,$4,40)`, [ts, e1.id, ta, tb])
  await throws('0028 pagante doppio rifiutato', () => db.query(`insert into expense_payers (trip_id,expense_id,traveler_id,amount) values ($1,$2,$3,5)`, [ts, e1.id, tb]))
  await throws('0028 versamento negativo rifiutato', () => db.query(`update expense_payers set amount=-5 where expense_id=$1 and traveler_id=$2`, [e1.id, tb]))
  await asUser(B)
  await db.query(`update expenses set label='Cena sushi' where id=$1`, [e1.id])
  check('0028 B, pagante, modifica la spesa', (await db.query(`select label from expenses where id=$1`, [e1.id])).rows[0].label === 'Cena sushi')
  await db.query(`insert into expense_files (trip_id,expense_id,file_path,file_name) values ($1,$2,$3,'scontrino.jpg')`, [ts, e1.id, `${ts}/spese/${e1.id}/scontrino.jpg`])
  check('0028 il pagante allega una ricevuta', (await db.query(`select 1 from expense_files where expense_id=$1`, [e1.id])).rows.length === 1)
  // spesa vecchia senza autore: la modificano tutti i partecipanti
  await asUser(null, 'postgres')
  const old = (await db.query(`insert into expenses (trip_id,label,amount,currency,spent_at,created_by) values ($1,'Vecchia',10,'EUR',now(),null) returning id`, [ts])).rows[0].id
  await asUser(B)
  await db.query(`update expenses set label='Vecchia 2' where id=$1`, [old])
  check('0028 una spesa senza autore resta modificabile da tutti', (await db.query(`select label from expenses where id=$1`, [old])).rows[0].label === 'Vecchia 2')
  // un estraneo non vede né scrive
  await asUser(C)
  check('0028 un non membro non vede paganti né ricevute', (await db.query(`select 1 from expense_payers where trip_id=$1`, [ts])).rows.length === 0 && (await db.query(`select 1 from expense_files where trip_id=$1`, [ts])).rows.length === 0)
  await throws('0028 un non membro non crea paganti', () => db.query(`insert into expense_payers (trip_id,expense_id,traveler_id,amount) values ($1,$2,$3,1)`, [ts, e1.id, ta]))
  // categorie: protette finché usate
  await asUser(A)
  const cat = (await db.query(`insert into expense_categories (trip_id,label) values ($1,'Cibo') returning id`, [ts])).rows[0].id
  await db.query(`update expenses set category_id=$1 where id=$2`, [cat, e1.id])
  await throws('0028 una categoria usata non si elimina', () => db.query(`update expense_categories set deleted_at=now() where id=$1`, [cat]))
  await db.query(`update expense_categories set archived_at=now() where id=$1`, [cat])
  check('0028 una categoria usata si archivia', (await db.query(`select archived_at from expense_categories where id=$1`, [cat])).rows[0].archived_at !== null)
  await db.query(`update expenses set category_id=null where id=$1`, [e1.id])
  await db.query(`update expense_categories set deleted_at=now() where id=$1`, [cat])
  check('0028 la categoria libera si elimina', (await db.query(`select deleted_at from expense_categories where id=$1`, [cat])).rows[0].deleted_at !== null)
  await asUser(A)
}

// rimborsi (0029): dichiara il debitore, decide il destinatario, saldi uguali per tutti
await asUser(null, 'postgres')
{
  await db.exec(`insert into auth.users values ('44444444-4444-4444-4444-444444444444','d@test.it') on conflict do nothing`)
  const D = '44444444-4444-4444-4444-444444444444'
  const tr = (await db.query(`insert into trips (title, owner_id) values ('Rimborsi', $1) returning id`, [A])).rows[0].id
  for (const u of [B, D]) await db.query(`insert into trip_members (trip_id,user_id,role) values ($1,$2,'editor') on conflict do nothing`, [tr, u])
  const ta = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'A',$2) returning id`, [tr, A])).rows[0].id
  const tb = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'B',$2) returning id`, [tr, B])).rows[0].id
  const td = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'D',$2) returning id`, [tr, D])).rows[0].id
  await asUser(B)
  await throws('0029 non si dichiara per conto di un altro', () => db.query(`insert into settlements (trip_id,from_traveler,to_traveler,amount,currency,paid_on) values ($1,$2,$3,10,'EUR','2026-11-28')`, [tr, ta, tb]))
  await throws('0029 importo zero rifiutato', () => db.query(`insert into settlements (trip_id,from_traveler,to_traveler,amount,currency,paid_on) values ($1,$2,$3,0,'EUR','2026-11-28')`, [tr, tb, ta]))
  const sid = (await db.query(`insert into settlements (trip_id,from_traveler,to_traveler,amount,currency,paid_on) values ($1,$2,$3,50,'EUR','2026-11-28') returning id`, [tr, tb, ta])).rows[0].id
  await throws('0029 non si dichiara già confermato', () => db.query(`insert into settlements (trip_id,from_traveler,to_traveler,amount,currency,paid_on,status) values ($1,$2,$3,5,'EUR','2026-11-28','confermato')`, [tr, tb, ta]))
  check('0029 il mittente vede la sua richiesta', (await db.query(`select 1 from settlements where id=$1`, [sid])).rows.length === 1)
  await throws('0029 il mittente non conferma da sé', () => db.query(`select decide_settlement($1, true, null)`, [sid]))
  await asUser(D)
  check('0029 un terzo non vede il rimborso', (await db.query(`select 1 from settlements where id=$1`, [sid])).rows.length === 0)
  await throws('0029 un terzo non lo decide', () => db.query(`select decide_settlement($1, true, null)`, [sid]))
  check('0029 un terzo non vede nemmeno i confermati finché non lo sono', (await db.query(`select 1 from my_confirmed_settlements()`)).rows.length === 0)
  await asUser(A)
  const v = (await db.query(`select balance_version($1) v`, [tr])).rows[0].v
  await throws('0029 conferma bloccata se i saldi sono cambiati', () => db.query(`select decide_settlement($1, true, 'versione-vecchia')`, [sid]))
  check('0029 la richiesta resta in attesa', (await db.query(`select status from settlements where id=$1`, [sid])).rows[0].status === 'in_attesa')
  await db.query(`select decide_settlement($1, true, $2)`, [sid, v])
  await db.query(`select decide_settlement($1, true, $2)`, [sid, v])
  const done = (await db.query(`select status, decided_by from settlements where id=$1`, [sid])).rows[0]
  check('0029 confermato, con chi ha deciso', done.status === 'confermato' && done.decided_by === A)
  check('0029 la conferma ripetuta non cambia nulla', (await db.query(`select count(*)::int n from my_confirmed_settlements()`)).rows[0].n === 1)
  await throws('0029 una volta confermato non si rifiuta', () => db.query(`select decide_settlement($1, false, null)`, [sid]))
  check('0029 la versione dei saldi cambia dopo la conferma', (await db.query(`select balance_version($1) v`, [tr])).rows[0].v !== v)
  await asUser(D)
  check('0029 i saldi di tutti vedono il confermato', (await db.query(`select 1 from my_confirmed_settlements()`)).rows.length === 1)
  await asUser(B)
  const s2 = (await db.query(`insert into settlements (trip_id,from_traveler,to_traveler,amount,currency,paid_on) values ($1,$2,$3,5,'EUR','2026-11-29') returning id`, [tr, tb, ta])).rows[0].id
  await db.query(`select cancel_settlement($1)`, [s2])
  check('0029 il mittente annulla', (await db.query(`select status from settlements where id=$1`, [s2])).rows[0].status === 'annullato')
  await asUser(A)
  await throws('0029 un annullato non si conferma', () => db.query(`select decide_settlement($1, true, null)`, [s2]))
  await asUser(null, 'postgres')
  const s3 = (await db.query(`insert into settlements (trip_id,from_traveler,to_traveler,amount,currency,paid_on) values ($1,$2,$3,7,'EUR','2026-11-30') returning id`, [tr, tb, ta])).rows[0].id
  await asUser(A)
  await db.query(`select decide_settlement($1, false, null)`, [s3])
  check('0029 il destinatario rifiuta', (await db.query(`select status from settlements where id=$1`, [s3])).rows[0].status === 'rifiutato')
  await asUser(C)
  check('0029 un non membro non vede nulla', (await db.query(`select 1 from settlements where trip_id=$1`, [tr])).rows.length === 0 && (await db.query(`select balance_version($1) v`, [tr])).rows[0].v === null)
  await asUser(A)
}

// documenti (0030): tre visibilità, solo chi ha caricato le cambia, anche il file nel bucket segue il documento
await asUser(null, 'postgres')
{
  await db.exec(`insert into auth.users values ('44444444-4444-4444-4444-444444444444','d@test.it') on conflict do nothing`)
  const D = '44444444-4444-4444-4444-444444444444'
  const td0 = (await db.query(`insert into trips (title, owner_id) values ('Documenti', $1) returning id`, [A])).rows[0].id
  for (const u of [B, D]) await db.query(`insert into trip_members (trip_id,user_id,role) values ($1,$2,'editor') on conflict do nothing`, [td0, u])
  const tB = (await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'B',$2) returning id`, [td0, B])).rows[0].id
  await db.query(`insert into trip_travelers (trip_id,name,user_id) values ($1,'D',$2)`, [td0, D])
  await db.query(`insert into storage.buckets values ('bookings','bookings',false) on conflict do nothing`)
  await db.exec(`grant select, insert, update, delete on storage.objects to authenticated`)
  await asUser(A)
  const mk = async (vis, name) => {
    const id = (await db.query(`insert into documents (trip_id,file_path,name,visibility) values ($1,$2,$3,$4) returning id`, [td0, `${td0}/doc/${name}`, name, vis])).rows[0].id
    await db.query(`insert into storage.objects (bucket_id,name) values ('bookings',$1)`, [`${td0}/doc/${name}`])
    return id
  }
  const dAll = await mk('all', 'tutti.pdf')
  const dSel = await mk('selected', 'biglietto.pdf')
  const dPriv = await mk('private', 'passaporto.pdf')
  await db.query(`insert into document_access (document_id,traveler_id) values ($1,$2)`, [dSel, tB])
  await db.query(`insert into document_links (document_id,kind,ref_id) values ($1,'flight',gen_random_uuid()),($1,'stay',gen_random_uuid())`, [dAll])
  check('0030 chi carica vede tutti i suoi documenti', (await db.query(`select 1 from documents where trip_id=$1`, [td0])).rows.length === 3)
  check('0030 un documento ha più collegamenti, un solo file', (await db.query(`select 1 from document_links where document_id=$1`, [dAll])).rows.length === 2)
  await throws('0030 stesso file due volte rifiutato', () => db.query(`insert into documents (trip_id,file_path,name) values ($1,$2,'copia')`, [td0, `${td0}/doc/tutti.pdf`]))
  await asUser(B)
  const seen = (await db.query(`select name from documents where trip_id=$1 order by name`, [td0])).rows.map((r) => r.name)
  check('0030 B (selezionato) vede Tutti e il suo, non il privato', seen.join() === 'biglietto.pdf,tutti.pdf', seen.join())
  check('0030 B non vede il file privato nel bucket', (await db.query(`select name from storage.objects where bucket_id='bookings' and name like '%passaporto%'`)).rows.length === 0)
  check('0030 B vede il file del documento a cui ha accesso', (await db.query(`select name from storage.objects where name like '%biglietto%'`)).rows.length === 1)
  check('0030 B non vede i collegamenti del privato', (await db.query(`select 1 from document_links where document_id=$1`, [dPriv])).rows.length === 0)
  await db.query(`update documents set visibility='all' where id=$1`, [dPriv])
  check('0030 solo chi ha caricato cambia la visibilità', (await db.query(`select 1 from documents where id=$1`, [dPriv])).rows.length === 0)
  await db.query(`update documents set visibility='private' where id=$1`, [dSel])
  await asUser(A)
  check('0030 B non ha alterato il documento di A', (await db.query(`select visibility from documents where id=$1`, [dSel])).rows[0].visibility === 'selected')
  await throws('0030 B non aggiunge accessi a un documento altrui', async () => { await asUser(B); await db.query(`insert into document_access (document_id,traveler_id) values ($1,$2)`, [dAll, tB]) })
  await asUser(D)
  const seenD = (await db.query(`select name from documents where trip_id=$1`, [td0])).rows.map((r) => r.name)
  check('0030 D (non selezionato) vede solo Tutti', seenD.join() === 'tutti.pdf', seenD.join())
  check('0030 D non vede il file del biglietto nel bucket (anche conoscendo il nome)', (await db.query(`select 1 from storage.objects where name=$1`, [`${td0}/doc/biglietto.pdf`])).rows.length === 0)
  await db.query(`delete from storage.objects where name=$1`, [`${td0}/doc/tutti.pdf`])
  await asUser(A)
  check('0030 D non cancella il file di un altro', (await db.query(`select 1 from storage.objects where name=$1`, [`${td0}/doc/tutti.pdf`])).rows.length === 1)
  await asUser(C)
  check('0030 un non membro non vede documenti né file', (await db.query(`select 1 from documents where trip_id=$1`, [td0])).rows.length === 0 && (await db.query(`select 1 from storage.objects where name like $1`, [`${td0}%`])).rows.length === 0)
  // file di prima, senza documento: restano dei membri
  await asUser(A)
  await db.query(`insert into storage.objects (bucket_id,name) values ('bookings',$1)`, [`${td0}/vecchio.pdf`])
  await asUser(D)
  check('0030 un file senza documento resta visibile ai membri', (await db.query(`select 1 from storage.objects where name=$1`, [`${td0}/vecchio.pdf`])).rows.length === 1)
  await asUser(A)
}

// partecipanti e inviti (0027): solo il creatore invita, chi è invitato non vede nulla finché non accetta
await asUser(null, 'postgres')
{
  await db.exec(`insert into auth.users values ('44444444-4444-4444-4444-444444444444','d@test.it') on conflict do nothing`)
  const D = '44444444-4444-4444-4444-444444444444'
  const ti = (await db.query(`insert into trips (title, owner_id) values ('Inviti', $1) returning id`, [A])).rows[0].id
  await db.query(`insert into trip_members (trip_id,user_id,role) values ($1,$2,'editor') on conflict do nothing`, [ti, B])
  await asUser(B)
  await throws('0027 un partecipante non invita', () => db.query(`insert into trip_invites (trip_id,email) values ($1,'c@test.it')`, [ti]))
  await asUser(A)
  const inv = (await db.query(`insert into trip_invites (trip_id,email) values ($1,' C@Test.it ') returning id, email, status`, [ti])).rows[0]
  check('0027 il creatore invita (email normalizzata, stato Inviato)', inv.email === 'c@test.it' && inv.status === 'inviato')
  await throws('0027 invito doppio rifiutato', () => db.query(`insert into trip_invites (trip_id,email) values ($1,'c@test.it')`, [ti]))
  await throws('0027 chi è già nel viaggio non si invita', () => db.query(`insert into trip_invites (trip_id,email) values ($1,'b@test.it')`, [ti]))
  await asUser(B)
  check('0027 un partecipante vede gli inviti del viaggio', (await db.query(`select 1 from trip_invites where trip_id=$1`, [ti])).rows.length === 1)
  await asUser(C)
  check('0027 chi è invitato non vede il viaggio', (await db.query(`select 1 from trips where id=$1`, [ti])).rows.length === 0)
  check('0027 chi è invitato non vede la tabella inviti', (await db.query(`select 1 from trip_invites where trip_id=$1`, [ti])).rows.length === 0)
  check('0027 ma vede il proprio invito con my_invites()', (await db.query(`select 1 from my_invites() where id=$1`, [inv.id])).rows.length === 1)
  await asUser(D)
  check('0027 un altro utente non vede inviti altrui', (await db.query(`select 1 from my_invites()`)).rows.length === 0)
  await throws('0027 un altro utente non risponde a un invito altrui', () => db.query(`select respond_invite($1, true)`, [inv.id]))
  await asUser(C)
  const joined = (await db.query(`select respond_invite($1, true) t`, [inv.id])).rows[0].t
  check('0027 accettando entra nel viaggio come partecipante', joined === ti && (await db.query(`select 1 from trip_members where trip_id=$1 and user_id=$2 and role='editor'`, [ti, C])).rows.length === 1)
  check('0027 ha il suo viaggiatore e vede il viaggio', (await db.query(`select 1 from trip_travelers where trip_id=$1 and user_id=$2 and deleted_at is null`, [ti, C])).rows.length === 1 && (await db.query(`select 1 from trips where id=$1`, [ti])).rows.length === 1)
  await throws('0027 non si accetta due volte', () => db.query(`select respond_invite($1, true)`, [inv.id]))
  await asUser(A)
  const inv2 = (await db.query(`insert into trip_invites (trip_id,email) values ($1,'d@test.it') returning id`, [ti])).rows[0].id
  await asUser(D)
  await db.query(`select respond_invite($1, false)`, [inv2])
  check('0027 rifiutando non entra nel viaggio', (await db.query(`select status from trip_invites where id=$1`, [inv2]).catch(() => ({ rows: [] }))).rows.length === 0 && (await db.query(`select 1 from trips where id=$1`, [ti])).rows.length === 0)
  await asUser(null, 'postgres')
  check('0027 stato Rifiutato registrato', (await db.query(`select status from trip_invites where id=$1`, [inv2])).rows[0].status === 'rifiutato')
  await db.query(`update trip_invites set status='inviato', expires_at = now() - interval '1 day' where id=$1`, [inv2])
  await asUser(D)
  check('0027 un invito scaduto non compare', (await db.query(`select 1 from my_invites()`)).rows.length === 0)
  await throws('0027 un invito scaduto non si accetta', () => db.query(`select respond_invite($1, true)`, [inv2]))
  await asUser(A)
  await throws('0027 il creatore non si toglie dai partecipanti', async () => { const r = await db.query(`delete from trip_members where trip_id=$1 and user_id=$2 returning 1`, [ti, A]); if (r.rows.length === 0) throw new Error('nessuna riga eliminata') })
  await db.query(`delete from trip_members where trip_id=$1 and user_id=$2`, [ti, B])
  check('0027 il creatore rimuove un partecipante', (await db.query(`select 1 from trip_members where trip_id=$1 and user_id=$2`, [ti, B])).rows.length === 0)
  await asUser(B)
  check('0027 chi è rimosso non vede più il viaggio', (await db.query(`select 1 from trips where id=$1`, [ti])).rows.length === 0)
  await asUser(A)
}

// prenotazioni ↔ tappe (0031)
await asUser(A)
{
  const d = (await db.query(`insert into days (trip_id,date,city) values ($1,'2026-12-01','Kyoto') returning id`, [t8])).rows[0].id
  const it = (await db.query(`insert into day_items (trip_id,day_id,title,position) values ($1,$2,'Cena',1) returning id`, [t8, d])).rows[0].id
  const bk = (await db.query(`insert into bookings (trip_id,type,title,status,provider) values ($1,'restaurant','Tavolo','to_confirm','Gion Karyo') returning id`, [t8])).rows[0].id
  await db.query(`insert into booking_items (booking_id,day_item_id,trip_id) values ($1,$2,$3)`, [bk, it, t8])
  check('0031 il proprietario collega una prenotazione a una tappa', (await db.query(`select 1 from booking_items where trip_id=$1`, [t8])).rows.length === 1)
  await throws('0031 stato sconosciuto rifiutato', () => db.query(`insert into bookings (trip_id,type,title,status) values ($1,'other','X','boh')`, [t8]))
  await db.query(`delete from day_items where id=$1`, [it])
  check('0031 eliminando la tappa resta la prenotazione', (await db.query(`select 1 from bookings where id=$1`, [bk])).rows.length === 1 && (await db.query(`select 1 from booking_items where booking_id=$1`, [bk])).rows.length === 0)
  await asUser(C)
  await throws('0031 un non membro non collega', () => db.query(`insert into booking_items (booking_id,day_item_id,trip_id) values ($1,gen_random_uuid(),$2)`, [bk, t8]))
  await asUser(A)
}

// orari vincolati (0032)
await asUser(A)
{
  const d = (await db.query(`insert into days (trip_id,date,city) values ($1,'2026-12-02','Osaka') returning id`, [t8])).rows[0].id
  const it = (await db.query(`insert into day_items (trip_id,day_id,title,position) values ($1,$2,'Cena',1) returning id, time_lock`, [t8, d])).rows[0]
  check('0032 le tappe nascono flessibili', it.time_lock === 'flexible')
  await db.query(`update day_items set time_lock='locked', lock_source='booking', lock_changed_by=$2, lock_changed_at=now() where id=$1`, [it.id, A])
  check('0032 il proprietario vincola una tappa', (await db.query(`select 1 from day_items where id=$1 and time_lock='locked'`, [it.id])).rows.length === 1)
  await throws('0032 valore di vincolo sconosciuto rifiutato', () => db.query(`update day_items set time_lock='boh' where id=$1`, [it.id]))
  await throws('0032 tipo di orario sconosciuto rifiutato', () => db.query(`insert into bookings (trip_id,type,title,time_kind) values ($1,'other','X','boh')`, [t8]))
}

// margini e alloggio del giorno (0033)
await asUser(A)
{
  const d = (await db.query(`insert into days (trip_id,date,city,margin_min) values ($1,'2026-12-03','Nara',15) returning id, exclude_stay`, [t8])).rows[0]
  check('0033 margine del giorno e alloggio escluso di default a no', d.exclude_stay === false)
  await db.query(`update trips set default_margin_min=30 where id=$1`, [t8])
  await throws('0033 margine fuori scala rifiutato', () => db.query(`update days set margin_min=999 where id=$1`, [d.id]))
}

// service_role (script di import): solo le tabelle concesse, nessuna cancellazione
await asUser(null, 'service_role')
const svcTrip = (await db.query(`select id from trips limit 1`)).rows
check('service_role legge i viaggi (import)', svcTrip.length === 1)
await db.query(`insert into categories (trip_id, label, position) values ($1,'Import',1000)`, [svcTrip[0].id])
check('service_role crea categorie', true)
await throws('service_role non può eliminare', () => db.query(`delete from categories where trip_id=$1`, [svcTrip[0].id]))
await throws('service_role non vede le spese', () => db.query(`select 1 from expenses`))
await asUser(null, 'anon')
await throws('anon resta senza accesso ai viaggi', () => db.query(`select 1 from trips`))
await asUser(A)

console.log(`\n${pass} ok, ${fail} falliti`)
process.exit(fail ? 1 : 0)
