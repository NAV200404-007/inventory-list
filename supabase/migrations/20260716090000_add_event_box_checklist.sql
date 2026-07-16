alter table public.events
  add column if not exists box_checklist jsonb not null default '[]'::jsonb;

comment on column public.events.box_checklist is
  'Expected and returned quantities for the event box parts checklist.';
