create table public.event_packing_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index event_packing_photos_event_idx
  on public.event_packing_photos(event_id, created_at);

alter table public.event_packing_photos enable row level security;

create policy event_packing_photos_read
  on public.event_packing_photos for select to authenticated
  using (public.is_employer() or public.is_event_staff(event_id));

create policy event_packing_photos_insert
  on public.event_packing_photos for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (public.is_employer() or public.is_event_staff(event_id))
  );

create policy event_packing_photos_delete
  on public.event_packing_photos for delete to authenticated
  using (
    public.is_employer()
    or (uploaded_by = auth.uid() and public.is_event_staff(event_id))
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'packing-photos',
  'packing-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_packing_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  event_folder text := split_part(object_name, '/', 1);
begin
  if event_folder !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    return false;
  end if;

  return public.is_employer() or public.is_event_staff(event_folder::uuid);
end;
$$;

create policy packing_photos_storage_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'packing-photos'
    and public.can_access_packing_photo(name)
  );

create policy packing_photos_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'packing-photos'
    and public.can_access_packing_photo(name)
  );

create policy packing_photos_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'packing-photos'
    and public.can_access_packing_photo(name)
  );

alter publication supabase_realtime add table public.event_packing_photos;
