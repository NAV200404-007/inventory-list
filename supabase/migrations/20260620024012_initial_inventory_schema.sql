-- Event Inventory Management System
create extension if not exists pgcrypto;

create type public.portal_mode as enum ('employer', 'employee');
create type public.profile_role as enum ('Employer', 'Inventory Manager', 'Employee');
create type public.event_status as enum ('Draft', 'Reserved', 'Packed', 'Checked Out', 'Returned', 'Closed');
create type public.asset_status as enum ('Available', 'Reserved', 'In Use', 'Damaged', 'Missing');
create type public.return_status as enum ('Returned', 'Damaged', 'Missing');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  portal public.portal_mode not null default 'employee',
  role public.profile_role not null default 'Employee',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_items (
  id text primary key,
  name text not null,
  category text not null default 'Custom',
  unit text not null default 'unit',
  location text not null default '',
  total integer not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_assets (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id text not null references public.inventory_items(id) on delete cascade,
  asset_code text not null unique,
  status public.asset_status not null default 'Available',
  issue_remarks text not null default '',
  issue_event_id uuid,
  issue_reported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  event_type text not null,
  location text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.event_status not null default 'Draft',
  created_by uuid not null references public.profiles(id),
  packed_by uuid references public.profiles(id),
  checkout_approved boolean not null default false,
  checkout_approved_by uuid references public.profiles(id),
  checked_out_by uuid references public.profiles(id),
  return_report_by uuid references public.profiles(id),
  closed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

alter table public.inventory_assets
  add constraint inventory_assets_issue_event_fkey
  foreign key (issue_event_id) references public.events(id) on delete set null;

create table public.event_staff (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create table public.event_requirements (
  event_id uuid not null references public.events(id) on delete cascade,
  inventory_item_id text not null references public.inventory_items(id),
  quantity integer not null check (quantity > 0),
  primary key (event_id, inventory_item_id)
);

create table public.event_assets (
  event_id uuid not null references public.events(id) on delete cascade,
  asset_id uuid not null references public.inventory_assets(id),
  packed boolean not null default false,
  packed_by uuid references public.profiles(id),
  packed_at timestamptz,
  return_status public.return_status,
  return_remarks text not null default '',
  returned_at timestamptz,
  primary key (event_id, asset_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index inventory_assets_item_idx on public.inventory_assets(inventory_item_id);
create index inventory_assets_status_idx on public.inventory_assets(status);
create index events_starts_at_idx on public.events(starts_at);
create index events_status_idx on public.events(status);
create index event_staff_profile_idx on public.event_staff(profile_id);
create index notifications_recipient_idx on public.notifications(recipient_id, created_at desc);
create index audit_logs_event_idx on public.audit_logs(event_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger inventory_items_set_updated_at before update on public.inventory_items
for each row execute function public.set_updated_at();
create trigger inventory_assets_set_updated_at before update on public.inventory_assets
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_portal public.portal_mode;
  requested_role public.profile_role;
begin
  requested_portal := case
    when new.raw_user_meta_data ->> 'portal' = 'employer'
      and not exists (select 1 from public.profiles where portal = 'employer')
      then 'employer'::public.portal_mode
    else 'employee'::public.portal_mode
  end;
  requested_role := case
    when requested_portal = 'employer' then 'Employer'::public.profile_role
    else 'Employee'::public.profile_role
  end;

  insert into public.profiles (id, name, portal, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    requested_portal,
    requested_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_employer()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and portal = 'employer'
  );
$$;

create or replace function public.is_event_staff(target_event_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.event_staff
    where event_id = target_event_id and profile_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_assets enable row level security;
alter table public.events enable row level security;
alter table public.event_staff enable row level security;
alter table public.event_requirements enable row level security;
alter table public.event_assets enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
using (public.is_employer())
with check (public.is_employer());
create policy profiles_delete on public.profiles for delete to authenticated using (public.is_employer());

create policy inventory_items_read on public.inventory_items for select to authenticated using (true);
create policy inventory_items_manage on public.inventory_items for all to authenticated
using (public.is_employer()) with check (public.is_employer());

create policy inventory_assets_read on public.inventory_assets for select to authenticated using (true);
create policy inventory_assets_manage on public.inventory_assets for all to authenticated
using (public.is_employer()) with check (public.is_employer());

create policy events_read on public.events for select to authenticated
using (public.is_employer() or created_by = auth.uid() or public.is_event_staff(id));
create policy events_manage on public.events for all to authenticated
using (public.is_employer()) with check (public.is_employer());

create policy event_staff_read on public.event_staff for select to authenticated
using (public.is_employer() or profile_id = auth.uid());
create policy event_staff_manage on public.event_staff for all to authenticated
using (public.is_employer()) with check (public.is_employer());

create policy event_requirements_read on public.event_requirements for select to authenticated
using (public.is_employer() or public.is_event_staff(event_id));
create policy event_requirements_manage on public.event_requirements for all to authenticated
using (public.is_employer()) with check (public.is_employer());

create policy event_assets_read on public.event_assets for select to authenticated
using (public.is_employer() or public.is_event_staff(event_id));
create policy event_assets_employer_manage on public.event_assets for all to authenticated
using (public.is_employer()) with check (public.is_employer());
create policy event_assets_staff_update on public.event_assets for update to authenticated
using (public.is_event_staff(event_id)) with check (public.is_event_staff(event_id));

create policy notifications_read on public.notifications for select to authenticated
using (recipient_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy notifications_employer_insert on public.notifications for insert to authenticated
with check (public.is_employer());

create policy audit_logs_read on public.audit_logs for select to authenticated
using (public.is_employer() or actor_id = auth.uid());
create policy audit_logs_insert on public.audit_logs for insert to authenticated
with check (actor_id = auth.uid());

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_assets;
alter publication supabase_realtime add table public.notifications;
