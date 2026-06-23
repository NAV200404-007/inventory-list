alter table public.event_packing_photos
  add column photo_type text not null default 'packing'
  check (photo_type in ('packing', 'return'));

create index event_packing_photos_type_idx
  on public.event_packing_photos(event_id, photo_type, created_at);
