-- #54 Orari vincolati o flessibili delle tappe. Additiva: senza, l'app tratta tutte le tappe come flessibili.
alter table public.day_items
  add column if not exists time_lock       text not null default 'flexible' check (time_lock in ('flexible', 'locked')),
  add column if not exists lock_source     text check (lock_source in ('manual', 'booking')),
  add column if not exists lock_changed_by uuid references auth.users (id) on delete set null,
  add column if not exists lock_changed_at timestamptz;
alter table public.bookings
  add column if not exists time_kind text not null default 'unspecified' check (time_kind in ('fixed', 'window', 'indicative', 'unspecified'));
