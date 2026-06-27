alter table public.events
  add column if not exists comments text not null default '';
