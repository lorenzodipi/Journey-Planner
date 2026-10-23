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
console.log('MIGRAZIONE OK')

const asUser = async (uid, role = 'authenticated') => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`)
}
let pass = 0, fail = 0
const check = (name, cond, extra = '') => { (cond ? pass++ : fail++); console.log(`${cond ? 'OK  ' : 'FAIL'} ${name} ${extra}`) }
const throws = async (name, fn) => { try { await fn(); check(name, false, '(nessun errore)') } catch (e) { check(name, true, `→ ${String(e.message).slice(0, 70)}`) } }

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
